"""In-memory registry + orchestration for regen jobs (one thread per regen).

Jobs live only in this web process. If it restarts mid-regen the registry
empties while `ova.status` stays "generando" in DB, bricking the OVA (every
mutation endpoint answers 409 forever). `recover_orphan_regen()` runs at
startup to release those rows. Moving regen to the arq queue removes this
class of bug at the root (EN in backlog).
"""

import threading
import time
import uuid
from collections.abc import Callable

import structlog
from sqlalchemy import select
from sqlalchemy.orm import Session

from generation.domain.regen_progress import estimate_percentage, is_terminal, resolve_regen_stage

logger = structlog.get_logger(__name__)

_regen_jobs: dict[str, dict] = {}
_regen_jobs_lock = threading.Lock()


def start_regen(
    db: Session,
    ova,
    effective_prompt: str,
    phase_ids: list[str],
    total_phases: int,
    worker: Callable[[str, str], None],
) -> str:
    """Mark the OVA as generating, register the job and spawn the worker thread.

    `worker(job_id, ova_id)` lo inyecta el router (regen_service._finalize_edit):
    importarlo aquí crearía un ciclo regen_jobs ↔ regen_service (el service
    importa el registry de este módulo).
    """
    from core.database import commit_or_500

    ova.status = "generando"
    commit_or_500(db, op="start_regen")

    job_id = str(uuid.uuid4())
    with _regen_jobs_lock:
        _regen_jobs[job_id] = {
            "job_id": job_id,
            "ova_id": str(ova.id),
            "prompt": effective_prompt,
            "phase_ids": phase_ids,
            "total_phases": max(int(total_phases or 1), 1),
            "started_at": time.time(),
            "status": "running",
        }

    threading.Thread(target=worker, args=(job_id, str(ova.id)), daemon=True).start()
    return job_id


def regen_progress_dto(job_id: str, ova_id: str) -> dict | None:
    """Progress snapshot for the polling endpoint, or None if the job is unknown."""
    with _regen_jobs_lock:
        job = _regen_jobs.get(job_id)
    if not job or job.get("ova_id") != ova_id:
        return None

    job_status = job.get("status", "running")
    percentage = estimate_percentage(
        status=job_status,
        total_phases=job.get("total_phases", 1),
        started_at=job["started_at"],
        now=time.time(),
    )

    # No-terminal incluye "generating" (lo pone el thread al arrancar); antes
    # solo "running" mapeaba al stage por porcentaje y la etiqueta quedaba
    # congelada en "Finalizando" durante toda la generación.
    terminal = is_terminal(job_status)
    return {
        "job_id": job_id,
        "ova_id": ova_id,
        "status": job_status,
        "percentage": percentage,
        "stage": resolve_regen_stage(100 if terminal else percentage),
        "new_version_number": job.get("new_version_number"),
    }


def recover_orphan_regen() -> int:
    """Release OVAs left in "generando" by a regen thread lost to a restart.

    Only regen can leave an OVA generating *with* a current version: the main
    generation pipeline keeps `current_version_id` NULL until it materializes
    (same commit that flips the status). An active arq job is still checked as
    a belt-and-braces guard before resetting the row to "listo".
    """
    from core.database import SessionLocal
    from generation.jobs.jobs_model import OvaJob
    from models import Ova

    db = SessionLocal()
    try:
        stuck = (
            db.execute(
                select(Ova).where(
                    Ova.status == "generando", Ova.current_version_id.is_not(None)
                )
            )
            .scalars()
            .all()
        )
        recovered = 0
        for ova in stuck:
            with _regen_jobs_lock:
                live = any(j.get("ova_id") == str(ova.id) for j in _regen_jobs.values())
            if live:
                continue
            active_job = db.execute(
                select(OvaJob.id)
                .where(OvaJob.ova_id == ova.id, OvaJob.status.in_(("queued", "running")))
                .limit(1)
            ).scalar_one_or_none()
            if active_job:
                continue
            ova.status = "listo"
            recovered += 1
        if recovered:
            db.commit()
            logger.info("OVAs liberados de regen huérfano", count=recovered)
        return recovered
    except Exception:
        db.rollback()
        logger.exception("Regen orphan recovery failed (continuing).")
        return 0
    finally:
        db.close()
