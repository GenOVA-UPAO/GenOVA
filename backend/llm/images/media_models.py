"""Lo que el catálogo sabe de un modelo de imagen o video de OpenRouter.

La generación adapta la petición a cada modelo (relación de aspecto,
duración, resolución) con los datos que trajo el refresco del catálogo; si el
modelo no está (catálogo aún vacío, modelo retirado) devuelve None y quien
llama usa valores prudentes.
"""

from __future__ import annotations


def media_entry(provider: str, model_id: str | None) -> dict | None:
    """Fila del catálogo completo para (provider, model_id), o None."""
    if not model_id:
        return None
    try:
        from llm.catalog.catalog_refresh import get_full_catalog_entries

        entries = get_full_catalog_entries()
    except Exception:
        return None
    for entry in entries:
        if entry.get("provider") == provider and entry.get("model_id") == model_id:
            return entry
    return None


def media_params(provider: str, model_id: str | None) -> dict:
    """`media` de la fila del catálogo ({} si no hay datos)."""
    entry = media_entry(provider, model_id) or {}
    media = entry.get("media")
    return media if isinstance(media, dict) else {}


def generates_via_chat(provider: str, model_id: str | None) -> bool:
    """El modelo genera imágenes por chat (`modalities: [image, text]`).

    Así lo hacen Gemini Image y GPT Image: están en el listado de chat además de
    en el de imágenes (`via_chat`), o solo en el de chat con salida de imagen.
    Sin catálogo, se reconoce por el id («…-image…»).
    """
    if provider != "openrouter" or not model_id:
        return False
    entry = media_entry(provider, model_id)
    by_id = "-image" in model_id and model_id.split("/", 1)[0] in {"google", "openai"}
    if entry is None or ("via_chat" not in entry and entry.get("media")):
        # Sin catálogo, o con uno guardado antes de que existiera `via_chat`.
        return by_id
    if entry.get("via_chat"):
        return True
    return not entry.get("media") and "image" in str(entry.get("modality") or "").rsplit("->", 1)[-1]
