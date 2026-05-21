"""Labs generation, AI improvement, SCORM export, and results endpoints."""
import io
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from agents.llm_router import generar_texto
from agents.utils import parse_json
from auth.dependencies import require_admin
from database import get_db
from models import LabResult, User
from scorm.service import build_scorm_zip_bytes
from labs.service import build_improve_prompt, get_job_results, start_lab_job

router = APIRouter()


class ModelConfig(BaseModel):
    model_id: str
    provider: str
    prompt_text: str


class StartGenerationRequest(BaseModel):
    phase: str
    resource_type: int
    concept: str
    model_configs: list[ModelConfig] = Field(min_length=1, max_length=3)


class ImprovePromptRequest(BaseModel):
    current_prompt: str
    result_id: str          # winner LabResult id
    concept: str
    phase: str
    resource_type: int


@router.post("/generate")
def start_generation(
    payload: StartGenerationRequest,
    current_user: User = Depends(require_admin),
):
    if payload.phase not in ("engage", "explore"):
        raise HTTPException(status_code=400, detail="phase must be 'engage' or 'explore'")
    if payload.resource_type < 1 or payload.resource_type > 10:
        raise HTTPException(status_code=400, detail="resource_type must be 1–10")
    if len(payload.concept.strip()) < 3:
        raise HTTPException(status_code=400, detail="concept must be at least 3 characters")

    configs = [
        {"model_id": c.model_id, "provider": c.provider, "prompt_text": c.prompt_text}
        for c in payload.model_configs
    ]
    job_id = start_lab_job(
        phase=payload.phase,
        resource_type=payload.resource_type,
        concept=payload.concept.strip(),
        model_configs=configs,
        user_id=str(current_user.id),
    )
    return {"job_id": job_id, "count": len(configs)}


@router.get("/generate/{job_id}/results")
def poll_results(job_id: str, _: User = Depends(require_admin)):
    data = get_job_results(job_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Job no encontrado o expirado.")
    return data


@router.post("/improve-prompt")
def improve_prompt(
    payload: ImprovePromptRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    result = db.execute(
        select(LabResult).where(LabResult.id == uuid.UUID(payload.result_id))
    ).scalar_one_or_none()
    if not result or not result.html_content:
        raise HTTPException(status_code=404, detail="Resultado no encontrado o sin HTML.")

    improve_p = build_improve_prompt(
        current_prompt=payload.current_prompt,
        winner_html=result.html_content,
        concept=payload.concept,
        phase=payload.phase,
        resource_type=payload.resource_type,
    )
    raw = generar_texto(improve_p, "orquestador", max_tokens=2000)
    try:
        data = parse_json(raw)
        return {
            "improved_prompt": data.get("improved_prompt", ""),
            "explanation": data.get("explanation", ""),
        }
    except Exception:
        return {"improved_prompt": raw, "explanation": ""}


@router.get("/results/{result_id}/scorm")
def export_scorm(
    result_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    result = db.execute(
        select(LabResult).where(LabResult.id == uuid.UUID(result_id))
    ).scalar_one_or_none()
    if not result or not result.html_content:
        raise HTTPException(status_code=404, detail="Resultado no encontrado o sin HTML.")

    phases = [{"type": "engage", "order": 1, "content": result.html_content}]
    zip_bytes = build_scorm_zip_bytes(
        course_title=f"Lab: {result.phase} tipo {result.resource_type}",
        module_title=result.concept,
        phases=phases,
    )
    filename = f"lab_{result.phase}_{result.resource_type}_{result_id[:8]}.zip"
    return StreamingResponse(
        io.BytesIO(zip_bytes),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/results")
def list_recent_results(
    phase: str = None,
    resource_type: int = None,
    limit: int = 20,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = select(LabResult).order_by(LabResult.created_at.desc()).limit(min(limit, 50))
    if phase:
        q = q.where(LabResult.phase == phase)
    if resource_type:
        q = q.where(LabResult.resource_type == resource_type)
    results = db.execute(q).scalars().all()
    return {
        "results": [
            {
                "id":             str(r.id),
                "phase":          r.phase,
                "resource_type":  r.resource_type,
                "concept":        r.concept,
                "model_id":       r.model_id,
                "provider":       r.provider,
                "quality_checks": r.quality_checks,
                "was_selected":   r.was_selected,
                "generation_ms":  r.generation_ms,
                "error_message":  r.error_message,
                "has_html":       bool(r.html_content),
                "created_at":     r.created_at.isoformat() if r.created_at else None,
            }
            for r in results
        ]
    }


@router.patch("/results/{result_id}/select")
def mark_selected(
    result_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    r = db.execute(
        select(LabResult).where(LabResult.id == uuid.UUID(result_id))
    ).scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Resultado no encontrado.")
    r.was_selected = True
    db.commit()
    return {"message": "Resultado marcado como seleccionado."}
