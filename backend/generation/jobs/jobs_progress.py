"""EN-013 — job persistence layer: result storage, status transitions, materialization.

Extracted from jobs_runner.py to keep the background runner under 200 lines (C3).
All functions are private to the generation package and called only by the runner's
_finalize / _load_for_run orchestrators. Nothing here touches the LLM or HTTP layer.
"""

import uuid

import structlog
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.config import settings
from generation.domain.execution import build_result_maps, finish_status
from generation.domain.resource_outcome import (
    MATERIALIZABLE_STATUSES,
    defect_reason,
    persist_status,
)
from generation.errors.error_log_service import log_generation_error
from models import OvaJob, OvaJobResource

logger = structlog.get_logger(__name__)

MAX_ATTEMPTS = settings.resource_max_attempts


def _start_job(db: Session, job: OvaJob) -> None:
    job.status = "running"
    if job.started_at is None:
        from generation.jobs.jobs_service import _now

        job.started_at = _now()
    db.commit()


def _has_done_resource(db: Session, job_id: uuid.UUID) -> bool:
    return (
        db.execute(
            select(OvaJobResource.id).where(
                OvaJobResource.job_id == job_id, OvaJobResource.status == "done"
            )
        ).first()
        is not None
    )


def _has_materializable_resource(db: Session, job_id: uuid.UUID) -> bool:
    return (
        db.execute(
            select(OvaJobResource.id).where(
                OvaJobResource.job_id == job_id,
                OvaJobResource.status.in_(MATERIALIZABLE_STATUSES),
            )
        ).first()
        is not None
    )


def _release_ova_from_generating(db: Session, job: OvaJob) -> None:
    """Saca el placeholder de 'generando' sin tocar job.status.

    Un job ya terminal (canceled/done/error/interrupted) no debe dejar el Ova
    bloqueado en la biblioteca. Si hay recursos materializables se intenta
    `_materialize`; si no hay, o si materializar no mueve el status, se marca
    'error' para que el usuario pueda borrar.
    """
    if job.ova_id is None:
        return
    from models import Ova as _Ova

    ova = db.get(_Ova, job.ova_id)
    if ova is None or ova.status != "generando":
        return
    if _has_materializable_resource(db, job.id):
        try:
            _materialize(db, job)
        except Exception:
            db.rollback()
            logger.exception("failed to materialize OVA on release", job_id=job.id)
        ova = db.get(_Ova, job.ova_id)
        if ova is None or ova.status != "generando":
            return
    ova.status = "error"
    db.commit()


def _finish_job(db: Session, job: OvaJob, any_done: bool) -> None:
    from generation.jobs.jobs_service import _now

    db.refresh(job)
    if job.status == "canceled":
        _release_ova_from_generating(db, job)
        return

    has_unfinished = (
        db.execute(
            select(OvaJobResource.id).where(
                OvaJobResource.job_id == job.id,
                OvaJobResource.status.in_(("pending", "running")),
            )
        ).first()
        is not None
    )
    job.status = finish_status(has_unfinished=has_unfinished, any_done=any_done)
    job.finished_at = _now()
    db.commit()
    _release_ova_from_generating(db, job)


def _materialize(db: Session, job: OvaJob) -> None:
    from generation.jobs.jobs_materialize import materialize_partial_ova

    done = list(
        db.execute(
            select(OvaJobResource)
            .where(
                OvaJobResource.job_id == job.id,
                OvaJobResource.status.in_(MATERIALIZABLE_STATUSES),
            )
            .order_by(OvaJobResource.phase_order, OvaJobResource.resource_order)
        )
        .scalars()
        .all()
    )
    materialize_partial_ova(db, job, done)


def repair_stuck_ova_if_needed(db: Session, job: OvaJob) -> None:
    """Job terminal + placeholder aún `generando` → materializa o marca error."""
    from generation.domain.lifecycle import JOB_TERMINAL

    if job.status not in JOB_TERMINAL:
        return
    try:
        _release_ova_from_generating(db, job)
    except Exception:
        logger.exception("stuck OVA rematerialize failed", job_id=job.id)


def _safe_mark_error(db: Session, job_id: uuid.UUID) -> None:
    try:
        db.rollback()
        job = db.execute(select(OvaJob).where(OvaJob.id == job_id)).scalar_one_or_none()
        if job is not None and job.status not in ("done", "canceled"):
            from generation.jobs.jobs_service import _now

            job.status = "error"
            job.finished_at = _now()
            db.commit()
            _release_ova_from_generating(db, job)
    except Exception:
        logger.exception("failed to mark job as error after crash", job_id=job_id)


def _ensure_degraded_error(db: Session, job: OvaJob, res: OvaJobResource) -> None:
    """Guarda el motivo en error_log (categoría validation) si aún no hay error_id."""
    if res.error_id is not None:
        return
    eid = log_generation_error(
        db,
        message=res.defect_reason or "recurso generado con defectos estructurales",
        error_category="validation",
        user_id=job.user_id,
        ova_id=job.ova_id,
        job_id=job.id,
        job_resource_id=res.id,
    )
    res.error_id = uuid.UUID(eid)


def _persist_results(db: Session, job: OvaJob, results: list[dict], errors: list[dict]) -> None:
    resources = list(
        db.execute(
            select(OvaJobResource)
            .where(OvaJobResource.job_id == job.id)
            .order_by(OvaJobResource.phase_order, OvaJobResource.resource_order)
        )
        .scalars()
        .all()
    )

    result_map, exhausted_map = build_result_maps(results, errors)

    for res in resources:
        if res.status == "done":
            continue
        if res.status == "degraded":
            _ensure_degraded_error(db, job, res)
            continue
        key = f"{res.phase_type}:{res.resource_type}"
        r = result_map.get(key)
        if r and r.get("html"):
            defects = list(r.get("defects") or [])
            res.content = r["html"]
            res.status = persist_status(html=r["html"], defects=defects)
            res.defect_reason = defect_reason(defects)
            res.attempts = (res.attempts or 0) + 1
            if res.status == "degraded":
                _ensure_degraded_error(db, job, res)
        elif key in exhausted_map:
            e = exhausted_map[key]
            eid = log_generation_error(
                db,
                message=e.get("error", "generation failed"),
                error_category="model_error",
                user_id=job.user_id,
                ova_id=job.ova_id,
                job_id=job.id,
                job_resource_id=res.id,
            )
            res.status = "error"
            res.error_id = uuid.UUID(eid)
            res.attempts = e.get("attempts", MAX_ATTEMPTS)
        else:
            existing_attempts = res.attempts or 0
            if existing_attempts < MAX_ATTEMPTS:
                res.status = "pending"
                res.attempts = existing_attempts + 1
            else:
                err_msg = f"generation failed after {existing_attempts} attempts"
                eid = log_generation_error(
                    db,
                    message=err_msg,
                    error_category="model_error",
                    user_id=job.user_id,
                    ova_id=job.ova_id,
                    job_id=job.id,
                    job_resource_id=res.id,
                )
                res.status = "error"
                res.error_id = uuid.UUID(eid)

    db.commit()
