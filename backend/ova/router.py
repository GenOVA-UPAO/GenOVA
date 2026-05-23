import logging
import os

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
from models import Ova, OvaPhase, OvaVersion, User
from ova.llm_helpers import _enabled_llm_options, _ova_output_dir
from scorm.service import build_scorm_zip_bytes

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
def ova_health() -> dict[str, str]:
    return {"module": "ova", "status": "ok"}


@router.get("/llm-options")
def list_llm_options() -> dict[str, list[dict]]:
    return {"items": _enabled_llm_options()}


class PhaseInput(BaseModel):
    type: str
    order: int
    content: str


class SaveOvaRequest(BaseModel):
    prompt: str
    phases: list[PhaseInput]


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
    for i, p in enumerate(payload.phases):
        db.add(OvaPhase(
            version_id=version.id,
            phase_type=p.type,
            phase_order=p.order,
            content=p.content,
            regenerated=False,
        ))
        phases_data.append({"type": p.type, "order": p.order, "content": p.content})

    output_dir = _ova_output_dir()
    os.makedirs(output_dir, exist_ok=True)
    file_path = os.path.join(output_dir, f"{ova.id}_v1.zip")
    zip_bytes = build_scorm_zip_bytes(
        course_title=title,
        module_title="OVA Generado por GenOVA",
        phases=phases_data,
    )
    with open(file_path, "wb") as f:
        f.write(zip_bytes)

    ova.file_path = file_path
    ova.current_version_id = version.id
    db.commit()

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
    if not ova.file_path or not os.path.exists(ova.file_path):
        raise HTTPException(status_code=404, detail="Archivo SCORM no disponible aún.")

    with open(ova.file_path, "rb") as f:
        zip_bytes = f.read()

    safe_title = "".join(c for c in ova.title if c.isalnum() or c in " _-")[:40].strip()
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{safe_title}-scorm.zip"'},
    )
