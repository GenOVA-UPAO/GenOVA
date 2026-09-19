import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from core.database import get_db
from core.rate_limit import limiter
from llm.images.image_providers import build_image_settings
from models import User
from prometheus.plans.generate import generate_resource
from prometheus.prompts.engage_prompts import RECURSOS_META
from rag import build_contexto_usuario, top_k

router = APIRouter()
logger = structlog.get_logger(__name__)


class GenerateEngageRequest(BaseModel):
    resource_type: int
    concept: str
    upload_ids: list[str] = Field(default_factory=list)


def _retrieve_contexto(db: Session, query: str, upload_ids: list[str]) -> str:
    if not upload_ids:
        return ""
    chunks = top_k(db, query, upload_ids)
    contexto = build_contexto_usuario(chunks)
    if contexto:
        logger.info(
            "RAG retrieved chunks", fase="ENGAGE", chunk_count=len(chunks), concept=query[:60]
        )
    return contexto


@router.get("/recursos", summary="Listar los recursos de la fase Engage")
def list_engage_recursos():
    return {
        "fase": "ENGAGE",
        "recursos": [{"id": k, **v} for k, v in RECURSOS_META.items()],
    }


@router.post("/generate", summary="Generar un recurso de la fase Engage")
@limiter.limit("5/minute")
def generate_engage_resource(
    request: Request,
    payload: GenerateEngageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = payload.resource_type
    concept = payload.concept.strip()

    if n not in RECURSOS_META:
        raise HTTPException(status_code=400, detail="resource_type debe estar entre 1 y 10.")
    if len(concept) < 3:
        raise HTTPException(status_code=400, detail="El concepto debe tener al menos 3 caracteres.")

    meta = RECURSOS_META[n]
    contexto = _retrieve_contexto(db, concept, payload.upload_ids)
    image_settings = build_image_settings(current_user, db)

    try:
        result = generate_resource(
            "engage", n, concept, contexto=contexto, image_settings=image_settings
        )
        return {
            **meta,
            "resource_type": n,
            "concepto": concept,
            "raw_json": result.raw_json,
            "html_content": result.html,
        }
    except Exception:
        logger.exception("error generating resource", fase="ENGAGE", resource_type=n)
        raise HTTPException(
            status_code=500, detail="Error al generar el recurso. Intenta de nuevo."
        ) from None
