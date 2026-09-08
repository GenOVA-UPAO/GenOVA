"""Background regen service — creates a new OvaVersion with real LLM content.

Replaces the previous simulated-content approach with actual calls to the
ENGAGE/EXPLORE generation agents via `regen_agents.py`.
"""

import time

import structlog
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.database import SessionLocal
from generation.regen.regen_edit import regen_phases_parallel
from generation.regen.regen_jobs import _regen_jobs, _regen_jobs_lock
from generation.regen.regen_persist import _build_and_persist, _mark_ova_error
from models import Ova, OvaPhase, OvaVersion
from ova.crud.edit_helpers import _ensure_version_exists, _get_active_version

logger = structlog.get_logger(__name__)


def _finalize_edit(job_id: str, ova_id: str) -> None:
    """Background thread: regenerate selected phases with real LLM agents,
    create a new OvaVersion, and rebuild the SCORM zip."""
    db = SessionLocal()
    try:
        with _regen_jobs_lock:
            job = _regen_jobs.get(job_id)
            if not job:
                return
            job["status"] = "generating"

        prompt = job["prompt"]
        instruction = job.get("instruction") or None
        phase_ids_to_regen = set(job.get("phase_ids", []))
        regen_all = not phase_ids_to_regen

        ova = db.execute(select(Ova).where(Ova.id == ova_id)).scalar_one_or_none()
        if not ova:
            return

        llm_config = _owner_llm_config(db, ova.user_id)
        image_settings = _owner_image_settings(db, ova.user_id)

        current_version = _get_active_version(ova_id, db)
        if not current_version:
            current_version = _ensure_version_exists(ova, db)

        current_phases = list(
            db.execute(
                select(OvaPhase)
                .where(OvaPhase.version_id == current_version.id)
                .order_by(OvaPhase.phase_order)
            )
            .scalars()
            .all()
        )

        new_version_number = current_version.version_number + 1
        current_version.is_active = False

        new_version = OvaVersion(
            ova_id=ova_id,
            version_number=new_version_number,
            prompt=prompt,
            is_active=True,
        )
        db.add(new_version)
        db.flush()

        # Regenerate the selected phases concurrently (each _regen_phase is a
        # pure-LLM call with no DB access). Regen-all is otherwise sequential —
        # N phases × 2 LLM calls each — so the progress bar sat at 99% for
        # minutes. DB writes below stay in this thread, in phase order.
        to_regen = [p for p in current_phases if regen_all or str(p.id) in phase_ids_to_regen]
        regen_content = regen_phases_parallel(
            to_regen, prompt, instruction, llm_config, image_settings=image_settings
        )

        new_phases_data = []
        for phase in current_phases:
            should_regen = regen_all or str(phase.id) in phase_ids_to_regen
            new_content = phase.content

            if should_regen:
                new_content = regen_content.get(str(phase.id)) or phase.content

            new_phase = OvaPhase(
                version_id=new_version.id,
                phase_type=phase.phase_type,
                phase_order=phase.phase_order,
                content=new_content,
                regenerated=should_regen,
                resource_type_id=phase.resource_type_id,
                title=phase.title,
            )
            db.add(new_phase)
            new_phases_data.append(
                {
                    "type": phase.phase_type,
                    "order": phase.phase_order,
                    "content": new_content,
                    "title": phase.title,
                }
            )

        db.flush()
        _build_and_persist(ova, ova_id, new_version, new_version_number, new_phases_data, db)

        with _regen_jobs_lock:
            job = _regen_jobs.get(job_id)
            if job:
                job["status"] = "success"
                job["completed_at"] = time.time()
                job["new_version_number"] = new_version_number

    except Exception as exc:
        logger.error("edit regen failed", ova_id=ova_id, error=str(exc))
        _mark_ova_error(db, ova_id)
        with _regen_jobs_lock:
            job = _regen_jobs.get(job_id)
            if job:
                job["status"] = "error"
    finally:
        db.close()


def _owner_llm_config(db: Session, user_id) -> dict:
    """Load the OVA owner's per-type LLM overrides (empty = system defaults)."""
    from models import User

    user = db.get(User, user_id)
    return (user.llm_settings if user else None) or {}


def _owner_image_settings(db: Session, user_id) -> dict:
    """image_settings del dueño del OVA — habilita imágenes en regen de engage."""
    from llm.images.image_providers import build_image_settings
    from models import User

    user = db.get(User, user_id)
    return build_image_settings(user, db) if user else {}
