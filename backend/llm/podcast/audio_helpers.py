"""Audio helpers for transcribing and generating audio via Groq APIs."""

import logging

from groq import Groq

logger = logging.getLogger(__name__)

_WHISPER_MODEL = "whisper-large-v3-turbo"
_ORPHEUS_MODEL = "canopylabs/orpheus-v1-english"
_ORPHEUS_VOICE = "autumn"
# Fallback si Orpheus falla (audit 2026-07-06 #4: "Connection error" en develop
# tras 2 retries — el modelo sigue vigente en Groq, así que el fallo es de
# red/entorno; playai-tts da una segunda oportunidad antes de degradar a texto).
_PLAYAI_MODEL = "playai-tts"
_PLAYAI_VOICE = "Celeste-PlayAI"


def _client() -> Groq:
    # resolve_key("groq", None) with no db skips the platform-key DB tier
    # entirely — always use the DB-backed resolver the rest of the app uses.
    from llm.clients.clients import _get_provider_key
    key = _get_provider_key("groq")
    return Groq(api_key=key or None)


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


def generar_audio_tts(text: str, voice: str = _ORPHEUS_VOICE) -> bytes:
    """Orpheus TTS — returns WAV bytes; playai-tts as fallback (both WAV-only)."""
    client = _client()
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
            "Orpheus TTS failed (%s, status=%s): %s — retrying with %s",
            type(exc).__name__,
            status,
            exc,
            _PLAYAI_MODEL,
        )
        response = client.audio.speech.create(
            model=_PLAYAI_MODEL,
            voice=_PLAYAI_VOICE,
            response_format="wav",
            input=text,
        )
        return response.read()
