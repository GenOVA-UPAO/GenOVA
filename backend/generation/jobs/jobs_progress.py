"""EN-013 — job persistence layer: result storage, status transitions, materialization.

Extracted from jobs_runner.py to keep the background runner under 200 lines (C3).
All functions are private to the generation package and called only by the runner's
_finalize / _load_for_run orchestrators. Nothing here touches the LLM or HTTP layer.
"""

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.config import settings
from generation.errors.error_log_service import log_generation_error
from models import OvaJob, OvaJobResource

logger = logging.getLogger(__name__)

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

    job.status = "done" if any_done else "error"
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
            logger.exception("Failed to mark placeholder OVA as error for job %s", job.id)


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
        logger.exception("Failed to mark job %s as error after crash", job_id)


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

    result_map = {}
    for r in results:
        phase = r.get("phase", "")
        rt = r.get("resource_type", "")
        key = f"{phase}:{rt}"
        if key not in result_map:
            result_map[key] = r
        title = r.get("title", "")
        if title and title != rt:
            result_map.setdefault(f"{phase}:{title}", r)

    exhausted_map = {
        f"{e.get('phase', '')}:{e.get('title') or e.get('resource_type', '')}": e
        for e in errors
        if e.get("exhausted")
    }

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
