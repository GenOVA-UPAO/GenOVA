import logging
import os

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
from models import Ova, OvaPhase, OvaVersion, User
from ova.crud.llm_helpers import _enabled_llm_options, _ova_output_dir
from rag.store import tie_uploads_to_ova
from scorm.service import build_scorm_zip_bytes
from storage import StorageError, is_configured, signed_url, upload_zip

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
def ova_health() -> dict[str, str]:
    return {"module": "ova", "status": "ok"}


@router.get("/llm-options")
def list_llm_options() -> dict[str, list[dict]]:
    """Deprecated: use GET /api/users/me/llm-settings for the catalog filtered
    by user-enabled models. This endpoint remains for backward compat; new code
    should not use it."""
    return {"items": _enabled_llm_options()}


class PhaseInput(BaseModel):
    type: str
    order: int
    content: str
    # Optional human-readable title used for the SCORM nav entry. When several
    # phases share the same `type` (e.g. 3 ENGAGE resources) the default
    # `phase_label` collides, so the caller passes a per-resource label.
    title: str | None = None
    # Numeric resource type (1-10) within the phase, used for regeneration.
    resource_type_id: int | None = None


class SaveOvaRequest(BaseModel):
    prompt: str
    phases: list[PhaseInput]
    upload_ids: list[str] = []


def _persist_scorm_zip(
    zip_bytes: bytes, user_id: str, ova_id: str, version: int
) -> tuple[str | None, str | None]:
    """Persist the SCORM zip. Prefer Supabase Storage; fall back to local disk.

    Returns `(storage_key, file_path)` — at least one is non-None.
    Local-disk fallback is kept so dev environments without Supabase keys still work.
    """
    object_key = f"{user_id}/{ova_id}_v{version}.zip"
    if is_configured():
        try:
            upload_zip(object_key, zip_bytes)
            return object_key, None
        except StorageError:
            logger.warning("Supabase upload failed for %s; falling back to local disk", object_key)

    output_dir = _ova_output_dir()
    os.makedirs(output_dir, exist_ok=True)
    file_path = os.path.join(output_dir, f"{ova_id}_v{version}.zip")
    with open(file_path, "wb") as f:
        f.write(zip_bytes)
    return None, file_path


@router.post("/save")
def save_ova(
    payload: SaveOvaRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    title = payload.prompt[:80].rstrip()

    ova = Ova(user_id=current_user.id, title=title, description=payload.prompt, status="listo")
    db.add(ova)
    db.flush()

    version = OvaVersion(ova_id=ova.id, version_number=1, prompt=payload.prompt, is_active=True)
    db.add(version)
    db.flush()

    phases_data = []
    for p in payload.phases:
        db.add(
            OvaPhase(
                version_id=version.id,
                phase_type=p.type,
                phase_order=p.order,
                content=p.content,
                regenerated=False,
                resource_type_id=p.resource_type_id,
                title=p.title,
            )
        )
        phases_data.append(
            {
                "type": p.type,
                "order": p.order,
                "content": p.content,
                "title": p.title,
            }
        )

    zip_bytes = build_scorm_zip_bytes(
        course_title=title,
        module_title="OVA Generado por GenOVA",
        phases=phases_data,
    )

    storage_key, file_path = _persist_scorm_zip(
        zip_bytes, str(current_user.id), str(ova.id), version=1
    )
    ova.storage_key = storage_key
    ova.file_path = file_path
    ova.current_version_id = version.id
    db.commit()

    # Promote RAG chunks: tying them to the new OVA prevents expiry.
    if payload.upload_ids:
        try:
            tie_uploads_to_ova(db, payload.upload_ids, str(ova.id))
        except Exception:
            logger.exception("Failed to tie RAG chunks to ova=%s", ova.id)

    return {"ova_id": str(ova.id), "status": "listo"}


@router.get("/{ova_id}/scorm")
def download_ova_scorm(
    ova_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ova = db.execute(
        select(Ova).where(
            Ova.id == ova_id,
            Ova.user_id == current_user.id,
            Ova.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if not ova:
        raise HTTPException(status_code=404, detail="OVA no encontrado.")

    # Prefer Supabase Storage signed URL.
    if ova.storage_key and is_configured():
        try:
            url = signed_url(str(ova.storage_key))
            return RedirectResponse(url=url, status_code=302)
        except StorageError:
            logger.exception("Signed URL failed for ova=%s; falling back to disk", ova_id)

    # Legacy / dev fallback: stream bytes from local disk.
    if not ova.file_path or not os.path.exists(str(ova.file_path)):
        raise HTTPException(status_code=404, detail="Archivo SCORM no disponible aún.")

    with open(str(ova.file_path), "rb") as f:
        zip_bytes = f.read()

    safe_title = "".join(c for c in ova.title if c.isalnum() or c in " _-")[:40].strip()
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{safe_title}-scorm.zip"'},
    )
