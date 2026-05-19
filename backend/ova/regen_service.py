import logging
import os
import threading
import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Ova, OvaPhase, OvaVersion

from ova.edit_helpers import (
    _ensure_version_exists,
    _get_active_version,
    _ova_output_dir,
    REGEN_DURATION_SECONDS,
    SIMULATED_REGEN_CONTENT,
)

logger = logging.getLogger(__name__)

_regen_jobs: dict[str, dict] = {}
_regen_jobs_lock = threading.Lock()


def _finalize_edit(job_id: str, ova_id: str) -> None:
    """Background thread: waits, then creates new version and rebuilds SCORM."""
    db = SessionLocal()
    try:
        time.sleep(REGEN_DURATION_SECONDS)

        with _regen_jobs_lock:
            job = _regen_jobs.get(job_id)
            if not job:
                return
            job["status"] = "finalizing"

        prompt = job["prompt"]
        phase_ids_to_regen = set(job.get("phase_ids", []))
        regen_all = not phase_ids_to_regen

        ova = db.execute(select(Ova).where(Ova.id == ova_id)).scalar_one_or_none()
        if not ova:
            return

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
            new_content = (
                SIMULATED_REGEN_CONTENT.get(phase.phase_type, phase.content)
                if should_regen
                else phase.content
            )
            new_phase = OvaPhase(
                version_id=new_version.id,
                phase_type=phase.phase_type,
                phase_order=phase.phase_order,
                content=new_content,
                regenerated=should_regen,
            )
            db.add(new_phase)
            new_phases_data.append(
                {
                    "type": phase.phase_type,
                    "order": phase.phase_order,
                    "content": new_content,
                }
            )

        db.flush()

        from scorm.service import build_scorm_zip_bytes

        output_dir = _ova_output_dir()
        os.makedirs(output_dir, exist_ok=True)
        file_path = os.path.join(output_dir, f"{ova_id}_v{new_version_number}.zip")
        zip_bytes = build_scorm_zip_bytes(
            course_title=ova.title,
            module_title="OVA Generado por GenOVA",
            phases=new_phases_data,
        )
        with open(file_path, "wb") as f:
            f.write(zip_bytes)

        ova.status = "listo"
        ova.file_path = file_path
        ova.current_version_id = new_version.id
        db.commit()

        with _regen_jobs_lock:
            job = _regen_jobs.get(job_id)
            if job:
                job["status"] = "success"
                job["completed_at"] = time.time()
                job["new_version_number"] = new_version_number

    except Exception as exc:
        logger.error("Edit regen failed for OVA %s: %s", ova_id, exc)
        try:
            ova = db.execute(select(Ova).where(Ova.id == ova_id)).scalar_one_or_none()
            if ova:
                ova.status = "error"
                db.commit()
        except Exception:
            pass
        with _regen_jobs_lock:
            job = _regen_jobs.get(job_id)
            if job:
                job["status"] = "error"
    finally:
        db.close()
