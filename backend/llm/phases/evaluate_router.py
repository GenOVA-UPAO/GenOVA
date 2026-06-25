import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from core.database import get_db
from core.rate_limit import limiter
from llm.router import generar_texto
from llm.utils.html_validator import validate_and_repair
from llm.utils.utils import parse_json, strip_markdown
from models import User
from prometheus.prompts.evaluate_prompts import (
    CODE_ONLY,
    RECURSOS_META,
    prompt_codigo,
    prompt_html,
    prompt_texto,
)
from rag.retriever import build_contexto_usuario, top_k

router = APIRouter()
logger = logging.getLogger(__name__)


class GenerateEvaluateRequest(BaseModel):
    resource_type: int
    concept: str
    upload_ids: list[str] = Field(default_factory=list)


def _retrieve_contexto(db: Session, query: str, upload_ids: list[str]) -> str:
    if not upload_ids:
        return ""
    chunks = top_k(db, query, upload_ids)
    contexto = build_contexto_usuario(chunks)
    if contexto:
        logger.info("RAG retrieved %d chunks for EVALUATE concept=%r", len(chunks), query[:60])
    return contexto


def _generate_two_step(n: int, concept: str, contexto: str) -> tuple[dict | list, str]:
    raw = generar_texto(prompt_texto(n, concept, contexto), "texto", max_tokens=3000)
    try:
        json_data = parse_json(raw)
    except Exception:
        logger.warning("JSON parse failed for EVALUATE %d, retrying with strict prompt", n)
        logger.debug("Raw LLM output: %s", raw[:500])
        retry = generar_texto(
            prompt_texto(n, concept, contexto) + "\n\nIMPORTANTE: Responde SOLO con "
            "el JSON puro, sin texto adicional, sin markdown, sin explicaciones.",
            "texto",
            max_tokens=3000,
        )
        try:
            json_data = parse_json(retry)
        except Exception:
            logger.warning("JSON retry also failed for EVALUATE %d, using raw text", n)
            json_data = {"contenido": retry}
    json_str = json.dumps(json_data, ensure_ascii=False, indent=2)
    html = strip_markdown(
        generar_texto(prompt_html(n, concept, json_str, contexto), "codigo", max_tokens=12000)
    )
    return json_data, html


@router.get("/recursos")
def list_recursos():
    return {
        "fase": "EVALUATE",
        "recursos": [{"id": k, **v} for k, v in RECURSOS_META.items()],
    }


@router.post("/generate")
@limiter.limit("5/minute")
def generate_evaluate_resource(
    request: Request,
    payload: GenerateEvaluateRequest,
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

    try:
        if n in CODE_ONLY:
            html = strip_markdown(
                generar_texto(prompt_codigo(n, concept, contexto), "codigo", max_tokens=12000)
            )
            html, _ = validate_and_repair(html, "evaluate", n)
            return {
                **meta,
                "resource_type": n,
                "concepto": concept,
                "raw_json": None,
                "html_content": html,
            }

        json_data, html = _generate_two_step(n, concept, contexto)
        html, _ = validate_and_repair(html, "evaluate", n)
        return {
            **meta,
            "resource_type": n,
            "concepto": concept,
            "raw_json": json_data,
            "html_content": html,
        }

    except HTTPException:
        raise
    except Exception:
        logger.exception("Error generating EVALUATE resource %d", n)
        raise HTTPException(
            status_code=500, detail="Error al generar el recurso. Intenta de nuevo."
        ) from None
