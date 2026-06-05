"""HU-022/B2 — materialize a partial OVA from a finished job's `done` resources.

When a job finishes with **≥1 resource `done`**, the generated content must not be
lost: we build a real `Ova` / `OvaVersion` / `OvaPhase` from those resources, link
`job.ova_id`, re-tie the RAG uploads so chunks don't expire, and persist the SCORM
zip (R1, R2). A **total failure** (0 `done`) materializes nothing — the job stays
`error` without an OVA (R8). This mirrors `ova.router.save_ova` but reuses helpers
instead of duplicating the SCORM build, and never leaks `str(e)` to any client.

Runs inside the background runner's own DB Session (no request session), so a
materialization failure is logged and contained — the job state is unaffected.
"""
import logging
import uuid

from sqlalchemy.orm import Session

from agents.engage_prompts import RECURSOS_META as ENGAGE_META
from agents.explore_prompts import RECURSOS_META as EXPLORE_META
from models import Ova, OvaJob, OvaJobResource, OvaPhase, OvaVersion

logger = logging.getLogger(__name__)

_ENGAGE_NAME_TO_ID = {v["tipo"]: k for k, v in ENGAGE_META.items()}
_EXPLORE_NAME_TO_ID = {v["tipo"]: k for k, v in EXPLORE_META.items()}


def _resolve_type(phase_type: str, resource_type: str | None) -> tuple[int | None, str | None]:
    """Map a job resource_type (numeric id or name) to (resource_type_id, title)."""
    meta = ENGAGE_META if phase_type == "engage" else EXPLORE_META
    name_to_id = _ENGAGE_NAME_TO_ID if phase_type == "engage" else _EXPLORE_NAME_TO_ID
    raw = (resource_type or "").strip()
    rid: int | None = None
    if raw.isdigit():
        rid = int(raw)
    elif raw in name_to_id:
        rid = name_to_id[raw]
    title = meta.get(rid, {}).get("tipo") if rid else (raw or None)
    return rid, title


def materialize_partial_ova(
    db: Session, job: OvaJob, done_resources: list[OvaJobResource]
) -> uuid.UUID | None:
    """Build an OVA draft from `done` resources, link the job, re-tie RAG (R1/R2).

    Returns the new `ova_id`, or None when there's nothing to materialize (R8) or
    the build fails (contained — the job lifecycle is not disturbed).
    """
    if not done_resources:
        return None
    try:
        return _build_ova(db, job, done_resources)
    except Exception:
        db.rollback()
        logger.exception("Failed to materialize partial OVA for job %s", job.id)
        return None


def _build_ova(db: Session, job: OvaJob, resources: list[OvaJobResource]) -> uuid.UUID:
    prompt = job.prompt or ""
    title = (prompt[:80].rstrip()) or "OVA parcial"
    ova = Ova(user_id=job.user_id, title=title, description=prompt, status="borrador")
    db.add(ova)
    db.flush()

    version = OvaVersion(ova_id=ova.id, version_number=1, prompt=prompt, is_active=True)
    db.add(version)
    db.flush()

    phases_data = _add_phases(db, version.id, resources)
    _persist_scorm(ova, title, phases_data, str(job.user_id))
    ova.current_version_id = version.id
    job.ova_id = ova.id
    db.commit()

    _tie_uploads(db, job, str(ova.id))
    return ova.id


def _add_phases(db: Session, version_id, resources: list[OvaJobResource]) -> list[dict]:
    """Create one OvaPhase per done resource (ordered) and return SCORM phase dicts."""
    phases_data: list[dict] = []
    for order, r in enumerate(resources, start=1):
        rid, ptitle = _resolve_type(r.phase_type, r.resource_type)
        db.add(OvaPhase(
            version_id=version_id,
            phase_type=r.phase_type,
            phase_order=order,
            content=r.content or "",
            regenerated=False,
            resource_type_id=rid,
            title=ptitle,
        ))
        phases_data.append({
            "type": r.phase_type,
            "order": order,
            "content": r.content or "",
            "title": ptitle,
        })
    return phases_data


def _persist_scorm(ova: Ova, title: str, phases_data: list[dict], user_id: str) -> None:
    """Build + store the SCORM zip, reusing the router helper (no duplication)."""
    from ova.router import _persist_scorm_zip
    from scorm.service import build_scorm_zip_bytes

    zip_bytes = build_scorm_zip_bytes(
        course_title=title,
        module_title="OVA Generado por GenOVA",
        phases=phases_data,
    )
    storage_key, file_path = _persist_scorm_zip(zip_bytes, user_id, str(ova.id), version=1)
    ova.storage_key = storage_key
    ova.file_path = file_path


def _tie_uploads(db: Session, job: OvaJob, ova_id: str) -> None:
    """Re-tie RAG chunks so they don't expire after materialization (RAG risk)."""
    upload_ids = (job.params or {}).get("upload_ids") or []
    if not upload_ids:
        return
    try:
        from rag.store import tie_uploads_to_ova

        tie_uploads_to_ova(db, upload_ids, ova_id)
    except Exception:
        logger.exception("Failed to tie RAG chunks to materialized ova=%s", ova_id)
