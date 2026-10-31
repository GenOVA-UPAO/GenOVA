"""Audio helpers for transcribing and generating audio via Groq APIs."""

import time

import structlog
from groq import Groq

logger = structlog.get_logger(__name__)

_WHISPER_MODEL = "whisper-large-v3-turbo"
_ORPHEUS_MODEL = "canopylabs/orpheus-v1-english"
_ORPHEUS_VOICE = "autumn"
# Fallback si Orpheus falla (audit 2026-07-06 #4: "Connection error" en develop
# tras 2 retries — el modelo sigue vigente en Groq, así que el fallo es de
# red/entorno; playai-tts da una segunda oportunidad antes de degradar a texto).
_PLAYAI_MODEL = "playai-tts"
_PLAYAI_VOICE = "Celeste-PlayAI"


# Por debajo de esto no se empieza una síntesis: no daría tiempo y retrasaría el recurso.
MIN_TTS_S = 15.0
# Tope por llamada de TTS con presupuesto (el SDK de Groq espera 60 s por defecto).
_TTS_CALL_S = 60.0


def _client(timeout: float | None = None) -> Groq:
    # resolve_key("groq", None) with no db skips the platform-key DB tier
    # entirely — always use the DB-backed resolver the rest of the app uses.
    from llm.clients.clients import _get_provider_key
    key = _get_provider_key("groq")
    if timeout is None:
        return Groq(api_key=key or None)
    # Con presupuesto: sin los 2 reintentos del SDK, como los clientes de texto.
    return Groq(api_key=key or None, timeout=timeout, max_retries=0)


def _tts_timeout(deadline: float | None) -> float | None:
    """Tope de la próxima llamada de TTS (None = sin presupuesto, valores del SDK)."""
    if deadline is None:
        return None
    return min(_TTS_CALL_S, deadline - time.monotonic())


def transcribir_audio(file_path: str) -> str:
    """Whisper STT for uploaded audio files. Groq free tier limit: 25 MB."""
    with open(file_path, "rb") as f:
        transcription = _client().audio.transcriptions.create(
            file=f,
            model=_WHISPER_MODEL,
            response_format="verbose_json",
            temperature=0,
        )
    return transcription.text


def generar_audio_tts(text: str, voice: str = _ORPHEUS_VOICE, *, deadline: float | None = None) -> bytes:
    """Orpheus TTS — returns WAV bytes; playai-tts as fallback (both WAV-only).

    Con `deadline` cada llamada cabe en lo que queda y el respaldo no se intenta
    si ya no da tiempo (se relanza el error: el podcast queda solo en texto).
    """
    client = _client(_tts_timeout(deadline))
    try:
        response = client.audio.speech.create(
            model=_ORPHEUS_MODEL,
            voice=voice,
            response_format="wav",
            input=text,
        )
        return response.read()
    except Exception as exc:
        # El genérico "Connection error" de httpx oculta la causa — loggear tipo
        # y status real antes de intentar el fallback.
        status = getattr(exc, "status_code", None)
        logger.warning(
            "Orpheus TTS failed, retrying with fallback model",
            error_type=type(exc).__name__,
            status_code=status,
            error=str(exc),
            fallback_model=_PLAYAI_MODEL,
        )
        left = _tts_timeout(deadline)
        if left is not None:
            if left < MIN_TTS_S:
                raise
            client = _client(left)
        response = client.audio.speech.create(
            model=_PLAYAI_MODEL,
            voice=_PLAYAI_VOICE,
            response_format="wav",
            input=text,
        )
        return response.read()
