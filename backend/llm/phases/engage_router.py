import json
import logging
import os
import re

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from core.database import get_db
from core.rate_limit import limiter
from llm.images.image_providers import IMG_PLACEHOLDER, enrich_with_images
from llm.podcast.podcast import build_podcast_html, podcast_audio_b64
from llm.router import generar_texto
from llm.utils.html_validator import validate_and_repair
from llm.utils.utils import parse_json, strip_markdown
from models import User
from prometheus.prompts.engage_prompts import (
    RECURSOS_META,
    prompt_html,
    prompt_simulador,
    prompt_texto,
)
from rag.retriever import build_contexto_usuario, top_k

router = APIRouter()
logger = logging.getLogger(__name__)

_TAREA_POR_RECURSO = {
    1: "texto",
    2: "texto",
    3: "texto",
    4: "texto",
    5: "texto",
    6: "texto",
    7: "texto",
    8: "texto",
    9: "texto",
    10: "codigo",
}

_MAX_GENERATED_IMAGES = int(os.getenv("OVA_MAX_GENERATED_IMAGES", "2"))


class GenerateEngageRequest(BaseModel):
    resource_type: int
    concept: str
    upload_ids: list[str] = Field(default_factory=list)


@router.get("/recursos")
def list_recursos():
    return {
        "fase": "ENGAGE",
        "recursos": [{"id": k, **v} for k, v in RECURSOS_META.items()],
    }


def _retrieve_contexto(db: Session, query: str, upload_ids: list[str]) -> str:
    if not upload_ids:
        return ""
    chunks = top_k(db, query, upload_ids)
    contexto = build_contexto_usuario(chunks)
    if contexto:
        logger.info("RAG retrieved %d chunks for ENGAGE concept=%r", len(chunks), query[:60])
    return contexto


@router.post("/generate")
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

    try:
        # Resource 10: direct code generation (no JSON step)
        if n == 10:
            html = strip_markdown(
                generar_texto(prompt_simulador(concept, contexto), "codigo", max_tokens=12000)
            )
            html, _ = validate_and_repair(html, "engage", n)
            return {
                **meta,
                "resource_type": n,
                "concepto": concept,
                "raw_json": None,
                "html_content": html,
            }

        # Resource 3 (podcast): monologue text → Groq TTS audio → player HTML
        if n == 3:
            monologue = generar_texto(prompt_texto(n, concept, contexto), "texto", max_tokens=700)
            audio_b64 = podcast_audio_b64(monologue)
            return {
                **meta,
                "resource_type": n,
                "concepto": concept,
                "raw_json": {"monologue": monologue},
                "html_content": build_podcast_html(concept, monologue, audio_b64),
            }

        # Resources 1,2,4-9: Step 1 = text/JSON, Step 2 = HTML via code agent
        tarea = _TAREA_POR_RECURSO[n]
        raw_text = generar_texto(prompt_texto(n, concept, contexto), tarea, max_tokens=3000)

        try:
            json_data = parse_json(raw_text)
        except Exception:
            logger.warning("JSON parse failed for ENGAGE %d, retrying with strict prompt", n)
            logger.debug("Raw LLM output: %s", raw_text[:500])
            # Retry once with a strict JSON-only suffix
            retry_text = generar_texto(
                prompt_texto(n, concept, contexto) + "\n\nIMPORTANTE: Responde SOLO con "
                "el JSON puro, sin texto adicional, sin markdown, sin explicaciones.",
                tarea,
                max_tokens=3000,
            )
            try:
                json_data = parse_json(retry_text)
            except Exception:
                logger.warning("JSON retry also failed for ENGAGE %d, using raw text", n)
                json_data = {"contenido": retry_text}

        # Build image_settings from the user's ova_settings + resolved API key.
        from llm.clients.key_resolver import resolve_key

        ova_settings = current_user.ova_settings or {}
        _img_provider = ova_settings.get("image_provider", "cloudflare")
        image_settings = {
            "max_images": ova_settings.get("max_images", _MAX_GENERATED_IMAGES),
            "provider": _img_provider,
            "api_key": resolve_key(
                _img_provider,
                current_user.user_api_keys or {},
                db,
                current_user.id,
            ),
            "image_model": ova_settings.get("image_model"),
        }

        # If the JSON has prompt_imagen items, pre-fetch the images and inject
        # placeholders the HTML step will reference.
        img_replacements = enrich_with_images(json_data, image_settings)

        json_str = json.dumps(json_data, ensure_ascii=False, indent=2)
        html = strip_markdown(
            generar_texto(prompt_html(n, concept, json_str, contexto), "codigo", max_tokens=12000)
        )

        for placeholder, uri in img_replacements.items():
            html = html.replace(placeholder, uri)
        # Sweep any placeholders the LLM hallucinated beyond the ones we gave it.
        html = re.sub(r"__IMG_\d+__", IMG_PLACEHOLDER, html)

        html, _ = validate_and_repair(html, "engage", n)

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
        logger.exception("Error generating ENGAGE resource %d", n)
        raise HTTPException(
            status_code=500, detail="Error al generar el recurso. Intenta de nuevo."
        ) from None
