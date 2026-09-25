"""Estado real de la generación de imágenes y de video, para la interfaz.

Antes la pestaña Plataforma decía «Generador de video: Siempre activo · Sin
clave API» mientras /models decía que la tarea estaba desactivada: la primera
leía una clave `video_api_key` que nada usa. Esto se calcula con las mismas
reglas que la generación:

- `off`: el interruptor de la tarea (`generation_enabled`) está apagado.
- `no_model`: encendido, pero la tarea no tiene modelo principal.
- `unsupported`: (video) ningún modelo de la cadena es de un proveedor con API
  de video (hoy solo OpenRouter).
- `no_key`: la plataforma no tiene clave para ningún modelo de la cadena (con
  clave propia, un docente sí podría generar: se paga con la suya).
- `active`: se genera en cada OVA.

La narración del micro-podcast (`audio`) no tiene interruptor ni tarea: la
decide la clave de plataforma que haya, en el mismo orden que
`llm.podcast.podcast.podcast_audio`:

- `active`: hay clave de OpenRouter → voz en español (`tts_openrouter._MODEL`).
- `english_only`: solo hay clave de Groq → Orpheus, que solo habla inglés.
- `off`: ninguna → el micro-podcast queda solo en texto.
"""

from __future__ import annotations

from llm.images.image_settings_resolve import imagen_chain, video_chain
from llm.images.video_generation import SUPPORTED_PROVIDERS as VIDEO_PROVIDERS


def _label(provider: str, model_id: str) -> str:
    from llm.images.media_models import media_entry

    entry = media_entry(provider, model_id) or {}
    return entry.get("label") or model_id


def _task_status(task: str, chain: list[dict], enabled: bool, db) -> dict:
    from llm.clients.key_resolver import resolve_key

    primary = chain[0] if chain else None
    usable = [e for e in chain if task != "video" or e["provider"] in VIDEO_PROVIDERS]
    has_key = any(resolve_key(e["provider"], None, db) for e in usable)
    if not enabled:
        state = "off"
    elif not chain:
        state = "no_model"
    elif not usable:
        state = "unsupported"
    elif not has_key:
        state = "no_key"
    else:
        state = "active"
    return {
        "state": state,
        "enabled": enabled,
        "provider": primary["provider"] if primary else None,
        "model_id": primary["model_id"] if primary else None,
        "label": _label(primary["provider"], primary["model_id"]) if primary else None,
        "fallbacks": max(len(chain) - 1, 0),
        "has_key": has_key,
    }


# Nombre del modelo de voz por defecto cuando el catálogo aún no está cargado.
_AUDIO_LABELS = {"openai/gpt-audio-mini": "OpenAI GPT Audio Mini"}


def _audio_label(model_id: str) -> str:
    """«OpenAI: GPT Audio Mini» (catálogo) → «OpenAI GPT Audio Mini»."""
    label = _label("openrouter", model_id)
    if label == model_id:
        return _AUDIO_LABELS.get(model_id, model_id)
    return label.replace(": ", " ", 1)


def audio_status() -> dict:
    """Con qué se narra hoy el micro-podcast. Solo lee claves: sin red."""
    from llm.clients.clients import _get_provider_key

    if _get_provider_key("openrouter"):
        from llm.podcast.tts_openrouter import _MODEL

        return {
            "state": "active",
            "provider": "openrouter",
            "model_id": _MODEL,
            "label": _audio_label(_MODEL),
            "language": "es",
        }
    if _get_provider_key("groq"):
        from llm.podcast.audio_helpers import _ORPHEUS_MODEL

        return {
            "state": "english_only",
            "provider": "groq",
            "model_id": _ORPHEUS_MODEL,
            "label": "Groq Orpheus",
            "language": "en",
        }
    return {"state": "off", "provider": None, "model_id": None, "label": None, "language": None}


def media_status(db) -> dict[str, dict]:
    """{"imagen": {...}, "video": {...}, "audio": {...}} con la config de plataforma vigente."""
    from llm.utils import llm_config_store

    stored = llm_config_store.stored_cached()
    return {
        "imagen": _task_status(
            "imagen",
            imagen_chain(stored, {}),
            llm_config_store.generation_enabled("imagen", stored),
            db,
        ),
        "video": _task_status(
            "video",
            video_chain(stored),
            llm_config_store.generation_enabled("video", stored),
            db,
        ),
        "audio": audio_status(),
    }
