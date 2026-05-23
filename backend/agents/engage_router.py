import json
import logging
import os
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from agents.engage_prompts import RECURSOS_META, prompt_html, prompt_simulador, prompt_texto
from agents.images import fetch_images_parallel
from agents.llm_router import generar_texto
from agents.podcast import build_podcast_html, podcast_audio_b64
from agents.utils import parse_json, strip_markdown
from auth.dependencies import get_current_user
from models import User

router = APIRouter()
logger = logging.getLogger(__name__)

_TAREA_POR_RECURSO = {
    1: "texto", 2: "texto", 3: "texto", 4: "texto", 5: "texto",
    6: "texto", 7: "texto", 8: "texto", 9: "texto", 10: "codigo",
}

# 1x1 transparent SVG fallback shown when image generation fails.
_IMG_PLACEHOLDER = (
    "data:image/svg+xml;utf8,"
    "<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512'>"
    "<rect fill='%23e2e8f0' width='100%25' height='100%25'/>"
    "<text x='50%25' y='50%25' font-family='sans-serif' font-size='22' "
    "text-anchor='middle' fill='%23475569'>Imagen no disponible</text></svg>"
)


# Pollinations free anonymous tier throttles hard, so we only generate the
# first N images per resource and let the rest render text-only.
_MAX_GENERATED_IMAGES = int(os.getenv("OVA_MAX_GENERATED_IMAGES", "2"))


def _enrich_with_images(json_data) -> dict[str, str]:
    """For step-1 JSON whose items contain a `prompt_imagen` field, fetch up
    to `_MAX_GENERATED_IMAGES` images via Pollinations and add an
    `image_placeholder` to each item that gets one. Returns the
    {placeholder: data_uri} map for post-LLM replacement."""
    if not isinstance(json_data, list) or not json_data:
        return {}
    first = json_data[0] if isinstance(json_data[0], dict) else None
    if not first or "prompt_imagen" not in first:
        return {}

    targets = json_data[:_MAX_GENERATED_IMAGES]
    prompts = [(item.get("prompt_imagen") or "").strip() for item in targets]
    uris = fetch_images_parallel(prompts)

    replacements: dict[str, str] = {}
    for i, (item, uri) in enumerate(zip(targets, uris), start=1):
        placeholder = f"__IMG_{i}__"
        item["image_placeholder"] = placeholder
        replacements[placeholder] = uri or _IMG_PLACEHOLDER
    return replacements


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

        # If the JSON has prompt_imagen items, pre-fetch the images and inject
        # placeholders the HTML step will reference.
        img_replacements = _enrich_with_images(json_data)

        json_str = json.dumps(json_data, ensure_ascii=False, indent=2)
        html = strip_markdown(generar_texto(prompt_html(n, concept, json_str), "codigo", max_tokens=8000))

        for placeholder, uri in img_replacements.items():
            html = html.replace(placeholder, uri)
        # Sweep any placeholders the LLM hallucinated beyond the ones we gave it.
        html = re.sub(r"__IMG_\d+__", _IMG_PLACEHOLDER, html)

        return {**meta, "resource_type": n, "concepto": concept, "raw_json": json_data, "html_content": html}

    except HTTPException:
        raise
    except Exception:
        logger.exception("Error generating ENGAGE resource %d", n)
        raise HTTPException(status_code=500, detail="Error al generar el recurso. Intenta de nuevo.")
