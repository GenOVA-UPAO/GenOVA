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

import uuid

import structlog
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from core.text import smart_truncate
from models import Ova, OvaJob, OvaJobResource, OvaPhase, OvaVersion
from prometheus.prompts.elaborate_prompts import RECURSOS_META as ELABORATE_META
from prometheus.prompts.engage_prompts import RECURSOS_META as ENGAGE_META
from prometheus.prompts.evaluate_prompts import RECURSOS_META as EVALUATE_META
from prometheus.prompts.explain_prompts import RECURSOS_META as EXPLAIN_META
from prometheus.prompts.explore_prompts import RECURSOS_META as EXPLORE_META

logger = structlog.get_logger(__name__)

_META = {
    "engage": ENGAGE_META,
    "explore": EXPLORE_META,
    "explain": EXPLAIN_META,
    "elaborate": ELABORATE_META,
    "evaluate": EVALUATE_META,
}
_NAME_TO_ID = {phase: {v["tipo"]: k for k, v in meta.items()} for phase, meta in _META.items()}


def resolve_resource_display(
    phase_type: str, resource_type: str | None
) -> tuple[int | None, str | None, str]:
    """Map job resource_type (id or name) → (id, title, emoji)."""
    meta = _META.get(phase_type) or ENGAGE_META
    name_to_id = _NAME_TO_ID.get(phase_type) or _NAME_TO_ID["engage"]
    raw = (resource_type or "").strip()
    rid: int | None = None
    if raw.isdigit():
        rid = int(raw)
    elif raw in name_to_id:
        rid = name_to_id[raw]
    info = meta.get(rid, {}) if rid else {}
    title = info.get("tipo") if rid else (raw or None)
    return rid, title, str(info.get("emoji") or "")


def materialize_partial_ova(
    db: Session, job: OvaJob, done_resources: list[OvaJobResource]
) -> uuid.UUID | None:
    """Build an OVA draft from `done` resources, link the job, re-tie RAG (R1/R2)."""
    if not done_resources:
        return None
    try:
        return _build_ova(db, job, done_resources)
    except Exception:
        db.rollback()
        logger.exception("failed to materialize partial OVA", job_id=job.id)
        return None


def _build_ova(db: Session, job: OvaJob, resources: list[OvaJobResource]) -> uuid.UUID:
    prompt = job.prompt or ""
    title = smart_truncate(prompt) or "OVA parcial"
    total = db.execute(
        select(func.count()).select_from(OvaJobResource).where(OvaJobResource.job_id == job.id)
    ).scalar_one()
    final_status = "listo" if total and len(resources) >= total else "borrador"

    ova = db.get(Ova, job.ova_id) if job.ova_id is not None else None
    if ova is None:
        ova = Ova(user_id=job.user_id, title=title, description=prompt, status=final_status)
        db.add(ova)
        db.flush()
        job.ova_id = ova.id
    else:
        ova.title = title

    version = _acquire_version(db, ova, prompt)
    ova.status = final_status
    phases_data = _add_phases(db, version.id, resources)
    _persist_scorm(ova, title, phases_data, str(job.user_id))
    ova.current_version_id = version.id
    db.commit()
    _tie_uploads(db, job, str(ova.id))
    return ova.id


def _acquire_version(db: Session, ova: Ova, prompt: str) -> OvaVersion:
    """Idempotent version row: reuse draft if stuck in generando, else next number.

    Always inserting version_number=1 caused UniqueViolation on resume/rematerialize
    after a prior attempt — job ended `done` while OVA stayed `generando`.
    """
    latest = db.execute(
        select(OvaVersion)
        .where(OvaVersion.ova_id == ova.id)
        .order_by(OvaVersion.version_number.desc())
        .limit(1)
    ).scalar_one_or_none()

    if latest is None:
        version = OvaVersion(ova_id=ova.id, version_number=1, prompt=prompt, is_active=True)
        db.add(version)
        db.flush()
        return version

    if ova.status == "generando":
        db.execute(delete(OvaPhase).where(OvaPhase.version_id == latest.id))
        latest.prompt = prompt
        latest.is_active = True
        db.flush()
        return latest

    db.execute(
        update(OvaVersion)
        .where(OvaVersion.ova_id == ova.id, OvaVersion.is_active.is_(True))
        .values(is_active=False)
    )
    version = OvaVersion(
        ova_id=ova.id,
        version_number=latest.version_number + 1,
        prompt=prompt,
        is_active=True,
    )
    db.add(version)
    db.flush()
    return version


def _add_phases(db: Session, version_id, resources: list[OvaJobResource]) -> list[dict]:
    phases_data: list[dict] = []
    for order, r in enumerate(resources, start=1):
        rid, ptitle, _emoji = resolve_resource_display(r.phase_type, r.resource_type)
        db.add(
            OvaPhase(
                version_id=version_id,
                phase_type=r.phase_type,
                phase_order=order,
                content=r.content or "",
                regenerated=False,
                resource_type_id=rid,
                title=ptitle,
            )
        )
        phases_data.append(
            {
                "type": r.phase_type,
                "order": order,
                "content": r.content or "",
                "title": ptitle,
            }
        )
    return phases_data


def _persist_scorm(ova: Ova, title: str, phases_data: list[dict], user_id: str) -> None:
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
    upload_ids = (job.params or {}).get("upload_ids") or []
    if not upload_ids:
        return
    try:
        from rag.store import tie_uploads_to_ova

        tie_uploads_to_ova(db, upload_ids, ova_id)
    except Exception:
        logger.exception("failed to tie RAG chunks to materialized ova", ova_id=ova_id)
