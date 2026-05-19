import os

from groq import Groq
from openai import OpenAI

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
openrouter_client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
)

# (proveedor, model_id, extra_kwargs)
_MODELOS: dict[str, tuple] = {
    "texto":        ("groq",       "llama-3.3-70b-versatile",              {}),
    "codigo":       ("openrouter", "qwen/qwen3-coder:free",                {}),
    "orquestador":  ("groq",       "openai/gpt-oss-120b",                  {"reasoning_effort": "medium"}),
    "razonamiento": ("groq",       "qwen/qwen3-32b",                       {"reasoning_effort": "default"}),
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


def generar_texto(prompt: str, tarea: str, max_tokens: int = 3000) -> str:
    proveedor, model_id, extra = _MODELOS.get(tarea, _MODELOS["texto"])

    try:
        if proveedor == "groq":
            response = groq_client.chat.completions.create(
                model=model_id,
                messages=[{"role": "user", "content": prompt}],
                max_completion_tokens=max_tokens,
                **extra,
            )
        else:
            response = openrouter_client.chat.completions.create(
                model=model_id,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                **extra,
            )
        return response.choices[0].message.content

    except Exception as e:
        if "429" in str(e):
            response = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                max_completion_tokens=max_tokens,
            )
            return response.choices[0].message.content
        raise


def generar_vision(messages: list[dict], max_tokens: int = 1024) -> str:
    """Multi-turn messages with image_url content blocks for RAG image analysis."""
    response = groq_client.chat.completions.create(
        model=_VISION_MODEL,
        messages=messages,
        max_completion_tokens=max_tokens,
    )
    return response.choices[0].message.content


def transcribir_audio(file_path: str) -> str:
    """Whisper STT for uploaded audio files (max 19.5 MB)."""
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
