"""Síntesis de voz en español con OpenRouter (por defecto `openai/gpt-audio-mini`).

Groq solo ofrece voces en inglés (Orpheus), así que el micro-podcast en español
sonaba con acento inglés y en WAV de varios MB. Aquí:

- La salida de audio de OpenRouter exige ``stream=true`` y, en streaming, solo
  admite ``pcm16`` (24 kHz, mono): se reúne el PCM y se codifica a MP3 (48 kbps)
  en el servidor, unas 7 veces más ligero que el WAV.
- Sin tope, el modelo puede seguir emitiendo audio mucho después de terminar el
  texto (medido: 817 s de audio para un texto de 14 s). ``max_tokens`` se acota
  por la longitud del texto y además se recorta el silencio del final.
- Las instrucciones piden leer el texto palabra por palabra: sin ellas el modelo
  añadía coletillas («Entendido. Voy a leer…»).
"""

from __future__ import annotations

import base64
import json
import os
from array import array

import httpx
import structlog

logger = structlog.get_logger(__name__)

_MODEL = os.getenv("OPENROUTER_TTS_MODEL", "openai/gpt-audio-mini")
_VOICE = os.getenv("OPENROUTER_TTS_VOICE", "alloy")
_SAMPLE_RATE = 24_000
_MP3_KBPS = 48
_TIMEOUT_S = 180.0
# Medido con gpt-audio-mini: ~20 tokens de audio por segundo de voz, y el
# español leído va a unos 14 caracteres por segundo.
_TOKENS_PER_SECOND = 20
_CHARS_PER_SECOND = 14
_TOKEN_MARGIN = 1.6
# Muestras por debajo de esta amplitud cuentan como silencio al recortar.
_SILENCE_THRESHOLD = 400
_TAIL_KEEP_S = 0.4

_SYSTEM = (
    "Eres un motor de síntesis de voz. Tu única tarea es pronunciar, palabra por palabra y "
    "en español neutro, el texto que está entre las etiquetas <leer> y </leer>. No saludes, "
    "no confirmes, no comentes ni añadas introducciones o cierres: el audio empieza con la "
    "primera palabra del texto y termina con la última."
)


def max_audio_tokens(text: str) -> int:
    """Tope de tokens de audio para `text`, con margen para pausas y entonación."""
    seconds = max(10.0, len(text) / _CHARS_PER_SECOND)
    return int(seconds * _TOKENS_PER_SECOND * _TOKEN_MARGIN) + 200


def trim_silence(pcm: bytes) -> bytes:
    """Quita el silencio del principio y del final (PCM 16 bits mono)."""
    samples = array("h")
    samples.frombytes(pcm[: len(pcm) - len(pcm) % 2])
    if not samples:
        return b""
    start = next((i for i, s in enumerate(samples) if abs(s) > _SILENCE_THRESHOLD), None)
    if start is None:
        return b""
    end = next(
        (i for i in range(len(samples) - 1, -1, -1) if abs(samples[i]) > _SILENCE_THRESHOLD),
        start,
    )
    keep = int(_TAIL_KEEP_S * _SAMPLE_RATE)
    return samples[max(0, start - keep) : min(len(samples), end + keep)].tobytes()


def encode_mp3(pcm: bytes) -> bytes:
    import lameenc

    encoder = lameenc.Encoder()
    encoder.set_bit_rate(_MP3_KBPS)
    encoder.set_in_sample_rate(_SAMPLE_RATE)
    encoder.set_channels(1)
    encoder.set_quality(2)
    return bytes(encoder.encode(pcm) + encoder.flush())


def _stream_pcm(text: str, api_key: str) -> bytes:
    payload = {
        "model": _MODEL,
        "modalities": ["text", "audio"],
        "audio": {"voice": _VOICE, "format": "pcm16"},
        "stream": True,
        "temperature": 0,
        "max_tokens": max_audio_tokens(text),
        "messages": [
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": f"<leer>{text}</leer>"},
        ],
    }
    chunks: list[str] = []
    with httpx.stream(
        "POST",
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "X-Title": "GenOVA",
        },
        json=payload,
        timeout=_TIMEOUT_S,
    ) as resp:
        if resp.status_code >= 400:
            body = resp.read().decode("utf-8", "replace")[:240].replace("\n", " ")
            raise RuntimeError(f"OpenRouter TTS {resp.status_code}: {body}")
        for line in resp.iter_lines():
            if not line.startswith("data: "):
                continue
            data = line[len("data: ") :]
            if data.strip() == "[DONE]":
                break
            for choice in json.loads(data).get("choices") or []:
                audio = (choice.get("delta") or {}).get("audio") or {}
                if audio.get("data"):
                    chunks.append(audio["data"])
    return base64.b64decode("".join(chunks))


def synthesize_mp3(text: str, api_key: str | None) -> bytes | None:
    """MP3 con `text` leído en español, o None si no hay clave o la síntesis falla."""
    if not api_key or not text.strip():
        return None
    try:
        pcm = trim_silence(_stream_pcm(text, api_key))
    except Exception as exc:
        # Solo el tipo y el mensaje: nunca la clave.
        logger.warning("openrouter tts failed", model=_MODEL, error_type=type(exc).__name__, error=str(exc)[:200])
        return None
    if not pcm:
        logger.warning("openrouter tts returned no audio", model=_MODEL)
        return None
    return encode_mp3(pcm)
