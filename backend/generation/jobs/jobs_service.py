"""EN-013 — job persistence + lifecycle helpers (no LLM calls here).

This is the DB layer the router talks to (router → service → model). The actual
background generation lives in `jobs_runner.py`, which the router launches in a
thread after `create_job()` returns. Everything here uses `commit_or_500()` so a
DB failure never leaks `str(e)` to the client (R8).
"""

import uuid
from datetime import UTC, datetime

import structlog
from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Ova, OvaJob, OvaJobResource
from users.admin.helpers import commit_or_500

logger = structlog.get_logger(__name__)

# A "running" job whose updated_at is older than this is presumed dead (its
# process died / Render slept) and is lazily finalized on the next read, so we
# avoid running a persistent watchdog worker (R7).
STALE_AFTER_SECONDS = 180
# A "queued" job that sat this long without a worker ever claiming it (arq
# down, queue drained, no worker deployed) is presumed abandoned and swept the
# same way — previously only "running" jobs were ever swept, so a job that
# never even started stayed "queued" forever (GN-03).
QUEUED_STALE_AFTER_SECONDS = 900
_STALE_THRESHOLDS = {"running": STALE_AFTER_SECONDS, "queued": QUEUED_STALE_AFTER_SECONDS}
_RESUMABLE_RESOURCE_STATUSES = ("pending", "error")


def _now() -> datetime:
    return datetime.now(UTC)


def create_job(
    db: Session,
    *,
    user_id: uuid.UUID,
    prompt: str,
    params: dict,
    resources: list[dict],
) -> OvaJob:
    """Create one `ova_jobs` row + one `ova_job_resources` row per resource (R1, R2).

    `resources` items: {phase_type, phase_order, resource_type, resource_order}.
    Returns the persisted job (status "queued"); the caller launches the runner.

    An `Ova` placeholder (status="generando") is created immediately so it
    shows up in "Mis OVAs" during generation (HU-023 fix). The runner updates
    it to "borrador" on completion or "error" on total failure.
    """
    title = (prompt[:80].rstrip()) or "OVA en generación"
    ova = Ova(user_id=user_id, title=title, description=prompt, status="generando")
    db.add(ova)
    db.flush()
    job = OvaJob(
        user_id=user_id, ova_id=ova.id, prompt=prompt, params=params or {}, status="queued"
    )
    db.add(job)
    db.flush()
    for r in resources:
        db.add(
            OvaJobResource(
                job_id=job.id,
                phase_type=r["phase_type"],
                phase_order=r["phase_order"],
                resource_type=r.get("resource_type"),
                resource_order=r.get("resource_order", 0),
                status="pending",
            )
        )
    commit_or_500(db, op="create_job")
    db.refresh(job)
    return job


def get_job(db: Session, job_id: uuid.UUID, user_id: uuid.UUID) -> OvaJob | None:
    """Fetch a job owned by `user_id`, applying the lazy interrupted sweep (R7)."""
    job = db.execute(
        select(OvaJob).where(OvaJob.id == job_id, OvaJob.user_id == user_id)
    ).scalar_one_or_none()
    if job is not None:
        _sweep_if_stale(db, job)
    return job


def find_job_by_ova(db: Session, ova_id: uuid.UUID, user_id: uuid.UUID) -> OvaJob | None:
    """Locate the latest job of an OVA owned by the user (R9). Sweeps if stale."""
    job = (
        db.execute(
            select(OvaJob)
            .where(OvaJob.ova_id == ova_id, OvaJob.user_id == user_id)
            .order_by(OvaJob.created_at.desc())
        )
        .scalars()
        .first()
    )
    if job is not None:
        _sweep_if_stale(db, job)
    return job


def list_resources(db: Session, job_id: uuid.UUID) -> list[OvaJobResource]:
    return list(
        db.execute(
            select(OvaJobResource)
            .where(OvaJobResource.job_id == job_id)
            .order_by(OvaJobResource.phase_order, OvaJobResource.resource_order)
        )
        .scalars()
        .all()
    )


def get_resource(db: Session, job_id: uuid.UUID, resource_id: uuid.UUID) -> OvaJobResource | None:
    """Fetch one resource scoped to its job (ownership is checked on the job)."""
    return db.execute(
        select(OvaJobResource).where(
            OvaJobResource.id == resource_id,
            OvaJobResource.job_id == job_id,
        )
    ).scalar_one_or_none()


def resource_ids_in_job(db: Session, job_id: uuid.UUID) -> set[uuid.UUID]:
    """All resource ids of a job — used to validate a resume subset belongs to it (B4)."""
    rows = (
        db.execute(select(OvaJobResource.id).where(OvaJobResource.job_id == job_id)).scalars().all()
    )
    return set(rows)


def resumable_resource_ids(db: Session, job_id: uuid.UUID) -> list[uuid.UUID]:
    """IDs of resources eligible for resume — only pending/error, never done (R7)."""
    rows = (
        db.execute(
            select(OvaJobResource.id).where(
                OvaJobResource.job_id == job_id,
                OvaJobResource.status.in_(_RESUMABLE_RESOURCE_STATUSES),
            )
        )
        .scalars()
        .all()
    )
    return list(rows)


def resumable_subset(db: Session, job_id: uuid.UUID, requested: list[uuid.UUID]) -> list[uuid.UUID]:
    """Keep only the requested ids that are resumable (pending/error), dropping
    `done` ones so a client subset never re-runs and overwrites good content
    (R6/R7). Preserves the requested order. Ownership is validated by the caller.
    """
    eligible = set(resumable_resource_ids(db, job_id))
    return [rid for rid in requested if rid in eligible]


def mark_job_resuming(db: Session, job: OvaJob) -> None:
    """Flip a finished/interrupted job back to running before relaunching (R7)."""
    job.status = "running"
    job.finished_at = None
    commit_or_500(db, op="mark_job_resuming")


def cancel_job(db: Session, job: OvaJob) -> None:
    """Mark a queued/running job as canceled. The background thread checks status
    in _finalize and skips persisting results if it finds 'canceled' (R1)."""
    job.status = "canceled"
    job.finished_at = _now()
    commit_or_500(db, op="cancel_job")


def _sweep_if_stale(db: Session, job: OvaJob) -> None:
    """Finalize a "running"/"queued" job whose progress went stale (R7, GN-03).

    Delegates to `_finish_job` — the same transition a normal completion uses —
    instead of only flipping `OvaJob.status`, so the owning `Ova.status` also
    leaves "generando" (materialized as "listo" if some resources finished, or
    "error" otherwise). The old version just flipped the job row and left the
    Ova stuck at "generando" forever, since only a real finish ever touched it.
    Local import of `jobs_progress` avoids a circular import (it already reaches
    back into this module for `_now`). Best-effort: a failed sweep never breaks
    the read that triggered it.
    """
    threshold = _STALE_THRESHOLDS.get(job.status)
    if threshold is None:
        return
    updated = job.updated_at
    if updated is None:
        return
    if updated.tzinfo is None:
        updated = updated.replace(tzinfo=UTC)
    if (_now() - updated).total_seconds() <= threshold:
        return

    from generation.jobs.jobs_progress import _finish_job, _has_done_resource

    try:
        _finish_job(db, job, _has_done_resource(db, job.id))
    except Exception:
        db.rollback()
        logger.exception("stale job sweep failed to finalize", job_id=job.id)


def sweep_stale_jobs_for_ovas(db: Session, ova_ids: list[uuid.UUID]) -> None:
    """Batch variant of `_sweep_if_stale` for a page of listed OVAs (GN-03).

    The per-job lazy sweep in `get_job`/`find_job_by_ova` only fires when the
    owner queries that exact job, so a user who never reopens a stalled
    generation never sees it leave "generando". This is called from the OVA
    list endpoint instead, scoped to the ids already loaded for that page
    (bounded by `limit`), so it stays a handful of jobs per call — no bulk
    UPDATE is needed since each job may need a different finalization (partial
    materialize vs. plain error) depending on its resources.
    """
    if not ova_ids:
        return
    try:
        jobs = (
            db.execute(
                select(OvaJob)
                .where(OvaJob.ova_id.in_(ova_ids), OvaJob.status.in_(("running", "queued")))
                .order_by(OvaJob.created_at.desc())
            )
            .scalars()
            .all()
        )
        swept: set[uuid.UUID] = set()
        for job in jobs:
            if job.ova_id in swept:
                continue  # keep only the latest job per ova (older ones are superseded)
            swept.add(job.ova_id)
            _sweep_if_stale(db, job)
    except Exception:
        db.rollback()
        logger.exception("sweep_stale_jobs_for_ovas failed (listing continues)")
