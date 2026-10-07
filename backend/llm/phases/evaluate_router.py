import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth.dependencies import require_permission
from core.database import get_db
from core.rate_limit import limiter
from core.topic_area import active_topic_area
from llm.phases._rag import retrieve_phase_context
from models import User
from prometheus.plans.generate import generate_resource
from prometheus.prompts.evaluate_prompts import RECURSOS_META

router = APIRouter()
logger = structlog.get_logger(__name__)


class GenerateEvaluateRequest(BaseModel):
    resource_type: int
    concept: str
    upload_ids: list[str] = Field(default_factory=list)


@router.get("/recursos", summary="Listar los recursos de la fase Evaluate")
def list_evaluate_recursos():
    return {
        "fase": "EVALUATE",
        "recursos": [{"id": k, **v} for k, v in RECURSOS_META.items()],
    }


@router.post("/generate", summary="Generar un recurso de la fase Evaluate")
@limiter.limit("5/minute")
def generate_evaluate_resource(
    request: Request,
    payload: GenerateEvaluateRequest,
    current_user: User = Depends(require_permission("create_ova")),
    db: Session = Depends(get_db),
):
    n = payload.resource_type
    concept = payload.concept.strip()

    if n not in RECURSOS_META:
        raise HTTPException(status_code=400, detail=f"resource_type debe estar entre 1 y {len(RECURSOS_META)}.")
    if len(concept) < 3:
        raise HTTPException(status_code=400, detail="El concepto debe tener al menos 3 caracteres.")

    meta = RECURSOS_META[n]
    contexto = retrieve_phase_context(
        db, concept, payload.upload_ids, user_id=str(current_user.id), fase="EVALUATE"
    )

    try:
        result = generate_resource(
            "evaluate", n, concept, contexto=contexto, area=active_topic_area()
        )
        return {
            **meta,
            "resource_type": n,
            "concepto": concept,
            "raw_json": result.raw_json,
            "html_content": result.html,
        }
    except Exception:
        logger.exception("error generating resource", fase="EVALUATE", resource_type=n)
        raise HTTPException(
            status_code=500, detail="Error al generar el recurso. Intenta de nuevo."
        ) from None
