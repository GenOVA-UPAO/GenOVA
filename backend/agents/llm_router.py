"""LLM routing — Groq (primary) + OpenRouter (secondary / arbitrary model)."""
import logging
import os
import time

from groq import Groq
from groq import RateLimitError as GroqRateLimitError
from openai import OpenAI
from openai import RateLimitError as OpenAIRateLimitError

logger = logging.getLogger(__name__)

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# OpenRouter uses the OpenAI-compatible endpoint.
# HTTP-Referer and X-Title are optional but enable app attribution in OR dashboard.
openrouter_client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
    default_headers={
        "HTTP-Referer": os.getenv("APP_URL", "https://genova.ai"),
        "X-Title": "GenOVA",
    },
)

# (provider, model_id, extra_kwargs)
# Groq uses max_completion_tokens; OpenRouter uses max_tokens (OpenAI-compat).
_MODELOS: dict[str, tuple] = {
    "texto":        ("groq",       "llama-3.3-70b-versatile",  {}),
    "codigo":       ("openrouter", "qwen/qwen3-coder:free",    {}),
    "orquestador":  ("groq",       "openai/gpt-oss-120b",      {"reasoning_effort": "medium"}),
    "razonamiento": ("groq",       "qwen/qwen3-32b",           {"reasoning_effort": "default"}),
}

_VISION_MODEL  = "meta-llama/llama-4-scout-17b-16e-instruct"
_WHISPER_MODEL = "whisper-large-v3-turbo"
_ORPHEUS_MODEL = "canopylabs/orpheus-v1-english"
_ORPHEUS_VOICE = "autumn"

VIDEO_UNAVAILABLE_MSG = (
    "⚠️ No contamos con un modelo de IA para procesar video directamente. "
    "Puedes crear tu video usando el contenido generado:\n\n"
    "• HeyGen / Synthesia — avatares con guión generado por GenOVA\n"
    "• Sora (OpenAI) / Runway — generación de video desde texto\n"
    "• Loom / OBS — screencast con el material exportado\n\n"
    "Prompt sugerido:\n"
    "\"Crea un video educativo de 60–90 segundos sobre [CONCEPTO]. "
    "Estilo visual limpio, subtítulos, tono académico accesible.\""
)

_FALLBACK_GROQ_MODEL = "llama-3.1-8b-instant"
_FALLBACK_OR_MODEL   = "meta-llama/llama-3.3-70b-instruct:free"


def _chat(provider: str, model_id: str, prompt: str, max_tokens: int, extra: dict) -> str:
    msgs = [{"role": "user", "content": prompt}]
    if provider == "groq":
        # Groq free tier hard-caps TPM at 6000 — keep the request well under it.
        r = groq_client.chat.completions.create(
            model=model_id, messages=msgs, max_completion_tokens=min(max_tokens, 3500), **extra
        )
    else:
        r = openrouter_client.chat.completions.create(
            model=model_id, messages=msgs, max_tokens=max_tokens, **extra
        )
    return r.choices[0].message.content


def generar_texto(prompt: str, tarea: str, max_tokens: int = 3000) -> str:
    """Route a task to its model. OpenRouter ':free' coders are frequently
    rate-limited upstream, so on any rate-limit we cross over to a reliable Groq
    model and retry with backoff. Groq output is capped at its 6000 TPM tier."""
    proveedor, model_id, extra = _MODELOS.get(tarea, _MODELOS["texto"])
    fb_model = "llama-3.3-70b-versatile" if proveedor == "openrouter" else _FALLBACK_GROQ_MODEL

    try:
        return _chat(proveedor, model_id, prompt, max_tokens, extra)
    except (GroqRateLimitError, OpenAIRateLimitError):
        logger.warning("Rate limit task='%s' model='%s'; falling back to Groq %s", tarea, model_id, fb_model)

    last_err: Exception | None = None
    for delay in (3, 10, 20):
        try:
            time.sleep(delay)
            return _chat("groq", fb_model, prompt, max_tokens, {})
        except (GroqRateLimitError, OpenAIRateLimitError) as exc:
            last_err = exc
            logger.warning("Groq fallback rate-limited task='%s'; retrying", tarea)
    raise last_err


def generar_texto_with_model(prompt: str, model_id: str, provider: str, max_tokens: int = 4000) -> str:
    """Call an arbitrary model on the given provider (groq or openrouter)."""
    try:
        if provider == "groq":
            response = groq_client.chat.completions.create(
                model=model_id,
                messages=[{"role": "user", "content": prompt}],
                max_completion_tokens=max_tokens,
            )
        else:
            response = openrouter_client.chat.completions.create(
                model=model_id,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
            )
        return response.choices[0].message.content

    except (GroqRateLimitError, OpenAIRateLimitError):
        logger.warning("Rate limit on model='%s' provider='%s'; falling back to %s", model_id, provider, _FALLBACK_OR_MODEL)
        response = openrouter_client.chat.completions.create(
            model=_FALLBACK_OR_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content


def generar_vision(messages: list[dict], max_tokens: int = 1024) -> str:
    """Multi-turn messages with image_url content blocks for RAG image analysis."""
    response = groq_client.chat.completions.create(
        model=_VISION_MODEL,
        messages=messages,
        max_completion_tokens=max_tokens,
    )
    return response.choices[0].message.content


def transcribir_audio(file_path: str) -> str:
    """Whisper STT for uploaded audio files. Groq free tier limit: 25 MB."""
    with open(file_path, "rb") as f:
        transcription = groq_client.audio.transcriptions.create(
            file=f,
            model=_WHISPER_MODEL,
            response_format="verbose_json",
            temperature=0,
        )
    return transcription.text


def generar_audio_tts(text: str, voice: str = _ORPHEUS_VOICE) -> bytes:
    """Orpheus TTS — returns WAV bytes."""
    response = groq_client.audio.speech.create(
        model=_ORPHEUS_MODEL,
        voice=voice,
        response_format="wav",
        input=text,
    )
    return response.content
