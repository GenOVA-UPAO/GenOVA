"""Background regen service — creates a new OvaVersion with real LLM content.

Replaces the previous simulated-content approach with actual calls to the
ENGAGE/EXPLORE generation agents via `regen_agents.py`.
"""
import logging
import os
import threading
import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from database import SessionLocal
from generation.regen_agents import regenerate_phase_content, resolve_resource_type
from models import Ova, OvaPhase, OvaVersion
from ova.edit_helpers import (
    _ensure_version_exists,
    _get_active_version,
    _ova_output_dir,
)

logger = logging.getLogger(__name__)

_regen_jobs: dict[str, dict] = {}
_regen_jobs_lock = threading.Lock()


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
        phase_ids_to_regen = set(job.get("phase_ids", []))
        regen_all = not phase_ids_to_regen

        ova = db.execute(select(Ova).where(Ova.id == ova_id)).scalar_one_or_none()
        if not ova:
            return

        llm_config = _owner_llm_config(db, ova.user_id)

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

        new_phases_data = []
        for phase in current_phases:
            should_regen = regen_all or str(phase.id) in phase_ids_to_regen
            new_content = phase.content

            if should_regen:
                new_content = _regen_phase(phase, prompt, llm_config) or phase.content

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
            new_phases_data.append({
                "type": phase.phase_type,
                "order": phase.phase_order,
                "content": new_content,
                "title": phase.title,
            })

        db.flush()
        _build_and_persist(ova, ova_id, new_version, new_version_number,
                           new_phases_data, db)

        with _regen_jobs_lock:
            job = _regen_jobs.get(job_id)
            if job:
                job["status"] = "success"
                job["completed_at"] = time.time()
                job["new_version_number"] = new_version_number

    except Exception as exc:
        logger.error("Edit regen failed for OVA %s: %s", ova_id, exc)
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


def _regen_phase(phase: OvaPhase, concept: str, llm_config: dict | None = None) -> str | None:
    """Call the real LLM agent for a single phase. Returns HTML or None."""
    rtype = resolve_resource_type(phase)
    if rtype is None:
        logger.warning("Skipping regen for phase %s — unknown resource_type", phase.id)
        return None
    logger.info("Regenerating %s/%d for concept=%r", phase.phase_type, rtype, concept[:60])
    return regenerate_phase_content(phase.phase_type, rtype, concept, llm_config)


def _build_and_persist(ova, ova_id, new_version, version_num, phases_data, db):
    """Build SCORM zip and persist to storage or disk."""
    from scorm.service import build_scorm_zip_bytes
    from storage import StorageError, is_configured, upload_zip

    zip_bytes = build_scorm_zip_bytes(
        course_title=ova.title,
        module_title="OVA Generado por GenOVA",
        phases=phases_data,
    )

    storage_key = None
    file_path = None

    if is_configured():
        try:
            storage_key = f"{ova.user_id}/{ova_id}_v{version_num}.zip"
            upload_zip(storage_key, zip_bytes)
        except StorageError:
            logger.warning("Supabase upload failed for regen %s; using disk", ova_id)
            storage_key = None

    if not storage_key:
        output_dir = _ova_output_dir()
        os.makedirs(output_dir, exist_ok=True)
        file_path = os.path.join(output_dir, f"{ova_id}_v{version_num}.zip")
        with open(file_path, "wb") as f:
            f.write(zip_bytes)

    ova.status = "listo"
    ova.storage_key = storage_key
    ova.file_path = file_path
    ova.current_version_id = new_version.id
    db.commit()


def _mark_ova_error(db: Session, ova_id: str) -> None:
    """Set OVA status to error on regen failure."""
    try:
        ova = db.execute(select(Ova).where(Ova.id == ova_id)).scalar_one_or_none()
        if ova:
            ova.status = "error"
            db.commit()
    except Exception:
        pass
