"""EN-013 — background runner that generates a job's resources server-side.

Launched in a daemon thread by `jobs_router`. Owns its **own** DB Session
(never the request session) like `regen_service._finalize_edit`, and walks the
job's resources in order, reusing the existing generation agents
(`regen_agents.regenerate_phase_content`). Each resource is persisted the moment
it finishes (R4); a failing resource is retried up to `MAX_ATTEMPTS` within
`LLM_TIMEOUT_S`, then logged via `error_log_service.log_generation_error` and
left `error` with its opaque `error_id` — without aborting the others (R6).

The whole worker is wrapped so an unexpected error never takes down the process.
"""
import logging
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from agents.llm_router import _LLM_TIMEOUT_S
from database import SessionLocal
from models import OvaJob, OvaJobResource
from ova.error_log_service import log_generation_error
from ova.jobs_runner_exec import generate_resource_html

logger = logging.getLogger(__name__)

# R6: each resource gets at most 2 retries on top of the first attempt.
MAX_ATTEMPTS = 3
LLM_TIMEOUT_S = _LLM_TIMEOUT_S


def run_job(job_id: uuid.UUID, only_resource_ids: list[uuid.UUID] | None = None) -> None:
    """Background entrypoint. `only_resource_ids` restricts work to a resume set."""
    db = SessionLocal()
    try:
        job = db.execute(select(OvaJob).where(OvaJob.id == job_id)).scalar_one_or_none()
        if job is None:
            return
        _start_job(db, job)
        resources = _select_resources(db, job_id, only_resource_ids)
        any_done = _has_done_resource(db, job_id)
        for resource in resources:
            if _process_resource(db, job, resource):
                any_done = True
        _finish_job(db, job, any_done)
    except Exception:
        # R6/R8: a runner crash must never tumble the process; mark the job and move on.
        logger.exception("Job runner crashed for job %s", job_id)
        _safe_mark_error(db, job_id)
    finally:
        db.close()


def _start_job(db: Session, job: OvaJob) -> None:
    job.status = "running"
    if job.started_at is None:
        from ova.jobs_service import _now

        job.started_at = _now()
    db.commit()


def _select_resources(
    db: Session, job_id: uuid.UUID, only: list[uuid.UUID] | None
) -> list[OvaJobResource]:
    stmt = (
        select(OvaJobResource)
        .where(OvaJobResource.job_id == job_id)
        # R7: never re-run a resource already `done` (don't overwrite good
        # content), whether on a fresh run or a client-picked resume subset.
        .where(OvaJobResource.status != "done")
        .order_by(OvaJobResource.phase_order, OvaJobResource.resource_order)
    )
    if only is not None:
        stmt = stmt.where(OvaJobResource.id.in_(only))
    return list(db.execute(stmt).scalars().all())


def _has_done_resource(db: Session, job_id: uuid.UUID) -> bool:
    return (
        db.execute(
            select(OvaJobResource.id).where(
                OvaJobResource.job_id == job_id, OvaJobResource.status == "done"
            )
        ).first()
        is not None
    )


def _process_resource(db: Session, job: OvaJob, resource: OvaJobResource) -> bool:
    """Generate one resource with retries+timeout. Returns True if it ended done.

    A failure here is contained: it logs an error_id and persists the resource as
    `error`, then returns False so the loop continues with the rest (R6).
    """
    resource.status = "running"
    db.commit()
    html, err = generate_resource_html(resource, job.prompt, MAX_ATTEMPTS, LLM_TIMEOUT_S)
    resource.attempts = MAX_ATTEMPTS if err else (resource.attempts or 0) + 1
    if html:
        resource.content = html
        resource.status = "done"
        db.commit()  # R4: persist the moment the resource completes.
        return True
    error_id = log_generation_error(
        db,
        message=err,
        error_category="model_error",
        user_id=job.user_id,
        ova_id=job.ova_id,
        job_id=job.id,
        job_resource_id=resource.id,
    )
    resource.status = "error"
    resource.error_id = uuid.UUID(error_id)
    db.commit()
    return False


def _finish_job(db: Session, job: OvaJob, any_done: bool) -> None:
    from ova.jobs_service import _now

    job.status = "done" if any_done else "error"
    job.finished_at = _now()
    db.commit()
    if any_done:
        # Materialize only when ova_id still None (legacy jobs). New jobs already
        # have a placeholder OVA; _build_ova will update it in place.
        _materialize(db, job)
    elif job.ova_id is not None:
        # Total failure: mark the pre-created placeholder OVA as "error" so the
        # user sees it in "Mis OVAs" with an error badge instead of disappearing.
        try:
            from models import Ova as _Ova
            ova = db.get(_Ova, job.ova_id)
            if ova is not None:
                ova.status = "error"
                db.commit()
        except Exception:
            logger.exception("Failed to mark placeholder OVA as error for job %s", job.id)


def _materialize(db: Session, job: OvaJob) -> None:
    from ova.jobs_materialize import materialize_partial_ova

    done = list(
        db.execute(
            select(OvaJobResource)
            .where(OvaJobResource.job_id == job.id, OvaJobResource.status == "done")
            .order_by(OvaJobResource.phase_order, OvaJobResource.resource_order)
        ).scalars().all()
    )
    materialize_partial_ova(db, job, done)


def _safe_mark_error(db: Session, job_id: uuid.UUID) -> None:
    try:
        db.rollback()
        job = db.execute(select(OvaJob).where(OvaJob.id == job_id)).scalar_one_or_none()
        if job is not None and job.status not in ("done", "canceled"):
            from ova.jobs_service import _now

            job.status = "error"
            job.finished_at = _now()
            db.commit()
    except Exception:
        logger.exception("Failed to mark job %s as error after crash", job_id)
