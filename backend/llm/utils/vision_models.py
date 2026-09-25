"""Qué modelos describen las imágenes que sube el docente para el RAG.

Antes era un id fijo de Groq (Llama 4 Scout). Groq lo retiró y cada imagen
fallaba con 404 `model_not_found`: se indexaba solo «[Archivo multimodal: …]» y
la generación no sabía qué mostraba. Un id fijo vuelve a caducar, así que la
cadena se arma en cada llamada:

1. `VISION_MODELS` (entorno): «proveedor:modelo» separados por comas, en orden
   (p. ej. «openrouter:google/gemini-2.5-flash-lite,groq:qwen/qwen3.8-27b»).
2. Si no está: los modelos de Groq del catálogo que leen imágenes y escriben
   texto (Groq declara sus modalidades en /models, el catálogo las guarda) y,
   de respaldo, `VISION_OPENROUTER_MODEL` por OpenRouter con la clave de
   plataforma. Por defecto Gemini 2.5 Flash Lite: de los de visión fiables, de
   los más baratos (~0,1 $/0,4 $ por millón de tokens; una descripción de 250
   palabras con su imagen cuesta en torno a 0,0003 $).

Con el catálogo cargado se saltan los ids que el proveedor ya no lista: una
retirada futura cae al siguiente de la cadena en vez de dar 404 en cada imagen.
"""

from __future__ import annotations

import os
import re

import structlog

from llm.catalog.catalog_aptitudes import split_modality

logger = structlog.get_logger(__name__)

DEFAULT_OPENROUTER_VISION = "google/gemini-2.5-flash-lite"
VISION_PROVIDERS = ("groq", "openrouter")
# Con más no se gana nada: si dos modelos de Groq fallan, el problema es Groq.
_MAX_GROQ = 2
# Modelos que razonan en voz alta (Qwen en Groq) devuelven el razonamiento
# entre estas etiquetas dentro del texto: no es parte de la descripción.
_THINK_BLOCK = re.compile(r"<think>.*?(</think>|$)", re.DOTALL | re.IGNORECASE)


def parse_chain(raw: str | None) -> list[tuple[str, str]]:
    """«groq:a,openrouter:b:free» → [(groq, a), (openrouter, b:free)]."""
    out: list[tuple[str, str]] = []
    for item in (raw or "").split(","):
        provider, sep, model_id = item.strip().partition(":")
        if sep and provider in VISION_PROVIDERS and model_id.strip():
            out.append((provider, model_id.strip()))
    return out


def reads_images(entry: dict) -> bool:
    """Lee imágenes y responde solo texto, y sirve para escribir (no es un
    clasificador ni un modelo de voz)."""
    inputs, outputs = split_modality(entry.get("modality"))
    return (
        "image" in inputs
        and outputs == {"text"}
        and "texto" in (entry.get("aptitudes") or [])
        and entry.get("active", True) is not False
    )


def _catalog() -> list[dict]:
    try:
        from llm.catalog.catalog_refresh import get_full_catalog_entries

        return get_full_catalog_entries()
    except Exception:
        logger.exception("vision: catalog unavailable")
        return []


def _listed(catalog: list[dict], provider: str, model_id: str) -> bool:
    """¿Lo lista el proveedor? Sin catálogo de ese proveedor no se sabe: se intenta."""
    rows = [e for e in catalog if e.get("provider") == provider]
    if not rows:
        return True
    return any(e.get("model_id") == model_id and e.get("active", True) for e in rows)


def _default_chain(catalog: list[dict]) -> list[tuple[str, str]]:
    groq = [e["model_id"] for e in catalog if e.get("provider") == "groq" and reads_images(e)]
    chain = [("groq", model_id) for model_id in sorted(groq)[:_MAX_GROQ]]
    fallback = os.getenv("VISION_OPENROUTER_MODEL", DEFAULT_OPENROUTER_VISION).strip()
    if fallback:
        chain.append(("openrouter", fallback))
    return chain


def vision_chain() -> list[tuple[str, str]]:
    """Modelos a probar, en orden, para describir una imagen."""
    catalog = _catalog()
    configured = parse_chain(os.getenv("VISION_MODELS"))
    chain = configured or _default_chain(catalog)
    usable = [(p, m) for p, m in chain if _listed(catalog, p, m)]
    skipped = [f"{p}:{m}" for p, m in chain if (p, m) not in usable]
    if skipped:
        logger.warning("vision models not listed by provider — skipped", models=skipped)
    if configured and not usable:
        # Todos los configurados caducaron: mejor los del catálogo que ninguno.
        return [(p, m) for p, m in _default_chain(catalog) if _listed(catalog, p, m)]
    return usable


def clean_description(text: str | None) -> str:
    """Texto de la respuesta sin el razonamiento («<think>…</think>»)."""
    return _THINK_BLOCK.sub("", text or "").strip()
