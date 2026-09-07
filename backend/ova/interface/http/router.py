import os

import structlog
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from core.database import get_db
from core.text import smart_truncate
from models import Ova, User
from ova.application.dto import SaveOvaInput
from ova.application.llm_helpers import _enabled_llm_options
from ova.container import OvaUseCases, build_ova
from ova.domain.model import OvaPhase
from ova.interface.http._shared import _is_admin
from storage import StorageError, is_configured, signed_url

router = APIRouter()
logger = structlog.get_logger(__name__)


@router.get("/health", tags=["Health"], summary="Estado del módulo de OVA")
def ova_health() -> dict[str, str]:
    return {"module": "ova", "status": "ok"}


@router.get(
    "/llm-options",
    tags=["OVA · CRUD"],
    summary="Listar los modelos LLM disponibles",
    deprecated=True,
)
def list_llm_options(_: User = Depends(get_current_user)) -> dict[str, list[dict]]:
    """Deprecated: use GET /api/users/me/llm-settings for the catalog filtered
    by user-enabled models. This endpoint remains for backward compat; new code
    should not use it. Auth is required so the model catalog is not public."""
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


@router.post("/save", tags=["OVA · CRUD"], summary="Guardar una OVA generada")
def save_ova(
    payload: SaveOvaRequest,
    current_user: User = Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    title = smart_truncate(payload.prompt)
    result = use_cases.save_ova.execute(
        SaveOvaInput(
            actor_id=str(current_user.id),
            title=title,
            prompt=payload.prompt,
            phases=tuple(
                OvaPhase(
                    type=phase.type,
                    order=phase.order,
                    content=phase.content,
                    title=phase.title,
                    resource_type_id=phase.resource_type_id,
                )
                for phase in payload.phases
            ),
            upload_ids=tuple(payload.upload_ids),
        )
    )
    return {"ova_id": result.ova_id, "status": "listo"}


@router.get(
    "/{ova_id}/scorm", tags=["SCORM y descargas"], summary="Descargar el paquete SCORM de la OVA"
)
def download_ova_scorm(
    ova_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    admin = _is_admin(current_user, db)
    ova_query = select(Ova).where(Ova.id == ova_id, Ova.deleted_at.is_(None))
    if not admin:
        ova_query = ova_query.where(Ova.user_id == current_user.id)
    ova = db.execute(ova_query).scalar_one_or_none()
    if not ova:
        raise HTTPException(status_code=404, detail="OVA no encontrado.")

    # Prefer Supabase Storage signed URL.
    if ova.storage_key and is_configured():
        try:
            url = signed_url(str(ova.storage_key))
            return RedirectResponse(url=url, status_code=302)
        except StorageError:
            logger.exception("signed url failed, falling back to disk", ova_id=ova_id)

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
