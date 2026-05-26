"""Audio helpers for transcribing and generating audio via Groq APIs."""
import os

from groq import Groq

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

_WHISPER_MODEL = "whisper-large-v3-turbo"
_ORPHEUS_MODEL = "canopylabs/orpheus-v1-english"
_ORPHEUS_VOICE = "autumn"


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
    """Orpheus TTS — returns WAV bytes (Orpheus only supports the wav format)."""
    response = groq_client.audio.speech.create(
        model=_ORPHEUS_MODEL,
        voice=voice,
        response_format="wav",
        input=text,
    )
    return response.read()
