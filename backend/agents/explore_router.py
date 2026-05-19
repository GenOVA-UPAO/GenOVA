import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from agents.explore_prompts import (
    CODE_ONLY,
    RECURSOS_META,
    prompt_codigo,
    prompt_html,
    prompt_texto,
)
from agents.llm_router import generar_texto
from agents.utils import parse_json, strip_markdown
from auth.dependencies import get_current_user
from models import User

router = APIRouter()
logger = logging.getLogger(__name__)

_TAREA_POR_RECURSO = {
    2: "texto", 3: "texto", 4: "texto", 5: "texto",
    7: "texto", 8: "texto", 9: "texto",
}


class GenerateExploreRequest(BaseModel):
    resource_type: int
    concept: str


def _generate_two_step(n: int, concept: str) -> tuple[dict | list, str]:
    tarea = _TAREA_POR_RECURSO.get(n, "texto")
    raw = generar_texto(prompt_texto(n, concept), tarea, max_tokens=2000)
    try:
        json_data = parse_json(raw)
    except Exception:
        logger.warning("JSON parse failed for EXPLORE resource %d, using raw text", n)
        json_data = {"contenido": raw}
    json_str = json.dumps(json_data, ensure_ascii=False, indent=2)
    html = strip_markdown(generar_texto(prompt_html(n, concept, json_str), "codigo", max_tokens=4000))
    return json_data, html


@router.get("/recursos")
def list_recursos():
    return {
        "fase": "EXPLORE",
        "recursos": [{"id": k, **v} for k, v in RECURSOS_META.items()],
    }


@router.post("/generate")
def generate_explore_resource(
    payload: GenerateExploreRequest,
    current_user: User = Depends(get_current_user),
):
    n = payload.resource_type
    concept = payload.concept.strip()

    if n not in RECURSOS_META:
        raise HTTPException(status_code=400, detail="resource_type debe estar entre 1 y 10.")
    if len(concept) < 3:
        raise HTTPException(status_code=400, detail="El concepto debe tener al menos 3 caracteres.")

    meta = RECURSOS_META[n]

    try:
        if n in CODE_ONLY:
            html = strip_markdown(generar_texto(prompt_codigo(n, concept), "codigo", max_tokens=4000))
            return {**meta, "resource_type": n, "concepto": concept, "raw_json": None, "html_content": html}

        json_data, html = _generate_two_step(n, concept)
        return {**meta, "resource_type": n, "concepto": concept, "raw_json": json_data, "html_content": html}

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error generating EXPLORE resource %d: %s", n, exc)
        raise HTTPException(status_code=500, detail=f"Error al generar el recurso: {exc}")
