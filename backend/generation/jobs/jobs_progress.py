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


def _finish_job(db: Session, job: OvaJob, any_done: bool) -> None:
    from generation.jobs.jobs_service import _now

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
    if any_done:
        _materialize(db, job)
    elif job.ova_id is not None:
        try:
            from models import Ova as _Ova

            ova = db.get(_Ova, job.ova_id)
            if ova is not None:
                ova.status = "error"
                db.commit()
        except Exception:
            logger.exception("failed to mark placeholder OVA as error", job_id=job.id)


def _materialize(db: Session, job: OvaJob) -> None:
    from generation.jobs.jobs_materialize import materialize_partial_ova

    done = list(
        db.execute(
            select(OvaJobResource)
            .where(OvaJobResource.job_id == job.id, OvaJobResource.status == "done")
            .order_by(OvaJobResource.phase_order, OvaJobResource.resource_order)
        )
        .scalars()
        .all()
    )
    materialize_partial_ova(db, job, done)


def repair_stuck_ova_if_needed(db: Session, job: OvaJob) -> None:
    """Job `done`/`interrupted` but placeholder still `generando` → rematerialize."""
    if job.status not in ("done", "interrupted") or job.ova_id is None:
        return
    if not _has_done_resource(db, job.id):
        return
    try:
        from models import Ova as _Ova

        ova = db.get(_Ova, job.ova_id)
        if ova is None or ova.status != "generando":
            return
        _materialize(db, job)
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
    except Exception:
        logger.exception("failed to mark job as error after crash", job_id=job_id)


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
        key = f"{res.phase_type}:{res.resource_type}"
        r = result_map.get(key)
        if r and r.get("html"):
            res.content = r["html"]
            res.status = "done"
            res.attempts = (res.attempts or 0) + 1
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
