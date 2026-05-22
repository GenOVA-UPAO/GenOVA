import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from agents.engage_prompts import RECURSOS_META, prompt_html, prompt_simulador, prompt_texto
from agents.llm_router import generar_texto
from agents.podcast import build_podcast_html, podcast_audio_b64
from agents.utils import parse_json, strip_markdown
from auth.dependencies import get_current_user
from models import User

router = APIRouter()
logger = logging.getLogger(__name__)

_TAREA_POR_RECURSO = {
    1: "texto", 2: "texto", 3: "texto", 4: "texto", 5: "texto",
    6: "texto", 7: "texto", 8: "texto", 9: "orquestador", 10: "codigo",
}


class GenerateEngageRequest(BaseModel):
    resource_type: int
    concept: str


@router.get("/recursos")
def list_recursos():
    return {
        "fase": "ENGAGE",
        "recursos": [{"id": k, **v} for k, v in RECURSOS_META.items()],
    }


@router.post("/generate")
def generate_engage_resource(
    payload: GenerateEngageRequest,
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
        # Resource 10: direct code generation (no JSON step)
        if n == 10:
            html = strip_markdown(generar_texto(prompt_simulador(concept), "codigo", max_tokens=8000))
            return {**meta, "resource_type": n, "concepto": concept, "raw_json": None, "html_content": html}

        # Resource 3 (podcast): monologue text → Groq TTS audio → player HTML
        if n == 3:
            monologue = generar_texto(prompt_texto(n, concept), "texto", max_tokens=700)
            audio_b64 = podcast_audio_b64(monologue)
            return {**meta, "resource_type": n, "concepto": concept,
                    "raw_json": {"monologue": monologue},
                    "html_content": build_podcast_html(concept, monologue, audio_b64)}

        # Resources 1,2,4-9: Step 1 = text/JSON, Step 2 = HTML via code agent
        tarea = _TAREA_POR_RECURSO[n]
        raw_text = generar_texto(prompt_texto(n, concept), tarea, max_tokens=3000)

        try:
            json_data = parse_json(raw_text)
        except Exception:
            logger.warning("JSON parse failed for resource %d, using raw text", n)
            json_data = {"contenido": raw_text}

        json_str = json.dumps(json_data, ensure_ascii=False, indent=2)
        html = strip_markdown(generar_texto(prompt_html(n, concept, json_str), "codigo", max_tokens=8000))

        return {**meta, "resource_type": n, "concepto": concept, "raw_json": json_data, "html_content": html}

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error generating ENGAGE resource %d: %s", n, exc)
        raise HTTPException(status_code=500, detail=f"Error al generar el recurso: {exc}")
