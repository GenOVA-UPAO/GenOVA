"""Labs API router — admin-only prompt management and model catalog."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from auth.dependencies import require_admin
from database import get_db
from models import PromptVersion, User
from labs.service import AVAILABLE_MODELS, get_base_prompt

router = APIRouter()


class SaveVersionRequest(BaseModel):
    phase: str
    resource_type: int
    prompt_text: str
    model_id: str
    provider: str
    notes: str = ""


@router.get("/models")
def list_models(_: User = Depends(require_admin)):
    return {"models": AVAILABLE_MODELS}


@router.get("/prompts/{phase}/{resource_type}")
def get_prompts(
    phase: str,
    resource_type: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if phase not in ("engage", "explore"):
        raise HTTPException(status_code=400, detail="phase must be 'engage' or 'explore'")
    if resource_type < 1 or resource_type > 10:
        raise HTTPException(status_code=400, detail="resource_type must be 1–10")

    base = get_base_prompt(phase, resource_type)
    versions = db.execute(
        select(PromptVersion)
        .where(PromptVersion.phase == phase)
        .where(PromptVersion.resource_type == resource_type)
        .order_by(PromptVersion.created_at.desc())
    ).scalars().all()

    return {
        "phase": phase,
        "resource_type": resource_type,
        "base_prompt": base,
        "versions": [
            {
                "id":             str(v.id),
                "version_number": v.version_number,
                "prompt_text":    v.prompt_text,
                "model_id":       v.model_id,
                "provider":       v.provider,
                "notes":          v.notes,
                "is_active":      v.is_active,
                "created_at":     v.created_at.isoformat() if v.created_at else None,
            }
            for v in versions
        ],
    }


@router.post("/prompts", status_code=status.HTTP_201_CREATED)
def save_version(
    payload: SaveVersionRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    last = db.execute(
        select(PromptVersion.version_number)
        .where(PromptVersion.phase == payload.phase)
        .where(PromptVersion.resource_type == payload.resource_type)
        .order_by(PromptVersion.version_number.desc())
    ).scalar_one_or_none()
    next_num = (last or 0) + 1

    v = PromptVersion(
        phase=payload.phase,
        resource_type=payload.resource_type,
        version_number=next_num,
        prompt_text=payload.prompt_text,
        model_id=payload.model_id,
        provider=payload.provider,
        notes=payload.notes,
        is_active=False,
        created_by=current_user.id,
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return {"id": str(v.id), "version_number": v.version_number, "message": "Versión guardada."}


@router.put("/prompts/{version_id}/activate")
def activate_version(
    version_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    v = db.execute(
        select(PromptVersion).where(PromptVersion.id == uuid.UUID(version_id))
    ).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Versión no encontrada.")
    # deactivate all other versions for this (phase, resource_type)
    db.execute(
        update(PromptVersion)
        .where(PromptVersion.phase == v.phase)
        .where(PromptVersion.resource_type == v.resource_type)
        .where(PromptVersion.id != v.id)
        .values(is_active=False)
    )
    v.is_active = True
    db.commit()
    return {"message": "Versión activada como producción.", "id": version_id}


@router.delete("/prompts/{version_id}/activate")
def deactivate_version(
    version_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    v = db.execute(
        select(PromptVersion).where(PromptVersion.id == uuid.UUID(version_id))
    ).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Versión no encontrada.")
    v.is_active = False
    db.commit()
    return {"message": "Versión desactivada."}
