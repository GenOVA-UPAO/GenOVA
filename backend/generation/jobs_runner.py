"""EN-013 — background runner that generates a job's resources server-side.

Now powered by the Prometheus LangGraph (EP-5, EN-003). The runner creates
the graph state from the job params, invokes the compiled graph with LangGraph
checkpointing, and persists the results back to OvaJobResource rows + materializes
the OVA/SCORM.
"""

import logging
import os
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from database import SessionLocal
from generation.error_log_service import log_generation_error
from models import OvaJob, OvaJobResource

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = int(os.getenv("RESOURCE_MAX_ATTEMPTS", "3"))


def run_job(job_id: uuid.UUID, only_resource_ids: list[uuid.UUID] | None = None) -> None:
    db = SessionLocal()
    try:
        job = db.execute(select(OvaJob).where(OvaJob.id == job_id)).scalar_one_or_none()
        if job is None:
            return
        _start_job(db, job)

        params = job.params or {}
        llm_config = params.get("llm_config") or {}
        enabled_models = params.get("enabled_models") or []

        try:
            from prometheus.graph import invoke_ova_generation

            initial_state = {
                "prompt": job.prompt or "",
                "upload_ids": params.get("upload_ids") or [],
                "llm_config": llm_config,
                "enabled_models": enabled_models,
                "phases": {},
                "phase_order": [],
                "results": [],
                "errors": [],
                "current_phase_idx": 0,
                "current_resource_idx": 0,
            }

            final_state = invoke_ova_generation(initial_state, str(job_id))

            results = final_state.get("results", [])
            errors = final_state.get("errors", [])
            any_done = len(results) > 0

            _persist_results(db, job, results, errors)
            _finish_job(db, job, any_done)

        except Exception:
            logger.exception("Prometheus graph failed for job %s", job_id)
            _finish_job(db, job, False)

    except Exception:
        logger.exception("Job runner crashed for job %s", job_id)
        _safe_mark_error(db, job_id)
    finally:
        db.close()


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

    for res in resources:
        key = f"{res.phase_type}:{res.resource_type}"
        r = result_map.get(key)
        if r and r.get("html"):
            res.content = r["html"]
            res.status = "done"
            res.attempts = (res.attempts or 0) + 1
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


def _start_job(db: Session, job: OvaJob) -> None:
    job.status = "running"
    if job.started_at is None:
        from generation.jobs_service import _now

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
    from generation.jobs_service import _now

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
    from generation.jobs_materialize import materialize_partial_ova

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
            from generation.jobs_service import _now

            job.status = "error"
            job.finished_at = _now()
            db.commit()
    except Exception:
        logger.exception("Failed to mark job %s as error after crash", job_id)
