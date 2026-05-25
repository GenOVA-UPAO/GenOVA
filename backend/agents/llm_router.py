"""LLM routing — Groq (primary) + OpenRouter (secondary / arbitrary model)."""
import logging
import os
import time

from groq import Groq
from groq import APIStatusError as GroqAPIStatusError
from groq import RateLimitError as GroqRateLimitError
from openai import APIStatusError as OpenAIAPIStatusError
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
    "texto":        ("groq",       "llama-3.3-70b-versatile",       {}),
    # DeepSeek V4 Flash: 284B MoE / 13B active, 1M context, LiveCodeBench
    # 91.6 / SWE-bench 79 — much better at following nested HTML rules than
    # qwen3-coder. Same free tier (OpenRouter 50/day, 1000/day with $10 prepaid).
    "codigo":       ("openrouter", "deepseek/deepseek-v4-flash:free", {}),
    "orquestador":  ("groq",       "openai/gpt-oss-120b",           {"reasoning_effort": "medium"}),
    "razonamiento": ("groq",       "qwen/qwen3-32b",                {"reasoning_effort": "default"}),
}

_VISION_MODEL  = "meta-llama/llama-4-scout-17b-16e-instruct"
_WHISPER_MODEL = "whisper-large-v3-turbo"
_ORPHEUS_MODEL = "canopylabs/orpheus-v1-english"
_ORPHEUS_VOICE = "autumn"

_FALLBACK_GROQ_MODEL = "llama-3.1-8b-instant"
_FALLBACK_OR_MODEL   = "meta-llama/llama-3.3-70b-instruct:free"

# Per-task fallback chain. Tried in order on any APIStatusError (rate-limit,
# 402 insufficient credit, provider-specific errors). The last entry is the
# safety-net Groq model that almost always responds within free tier.
_FALLBACK_CHAIN: dict[str, list[tuple[str, str, dict]]] = {
    "codigo": [
        ("openrouter", "qwen/qwen3-coder:free", {}),
        ("openrouter", "z-ai/glm-4.5-air:free", {}),
        ("openrouter", _FALLBACK_OR_MODEL, {}),
        ("groq", "llama-3.3-70b-versatile", {}),
    ],
    "texto": [
        ("groq", _FALLBACK_GROQ_MODEL, {}),
        ("openrouter", _FALLBACK_OR_MODEL, {}),
    ],
    "orquestador": [
        ("groq", "qwen/qwen3-32b", {}),
        ("groq", _FALLBACK_GROQ_MODEL, {}),
    ],
    "razonamiento": [
        ("groq", "openai/gpt-oss-120b", {"reasoning_effort": "low"}),
        ("groq", _FALLBACK_GROQ_MODEL, {}),
    ],
}


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
    content = r.choices[0].message.content if r.choices else None
    if not content or not content.strip():
        # Some reasoning models return reasoning_content separately and leave
        # `content` empty; treat that as a recoverable failure so the fallback
        # chain advances to the next model.
        raise EmptyContentError(f"Empty content from {provider}/{model_id}")
    return content


class EmptyContentError(RuntimeError):
    """LLM returned empty content (e.g. reasoning model that didn't emit text)."""


_RECOVERABLE_ERRORS = (
    GroqRateLimitError,
    OpenAIRateLimitError,
    GroqAPIStatusError,
    OpenAIAPIStatusError,
    EmptyContentError,
)


def generar_texto(prompt: str, tarea: str, max_tokens: int = 3000) -> str:
    """Route a task to its model and walk the per-task fallback chain on any
    recoverable API error (rate-limit, 402 insufficient credit, provider 5xx,
    Crucible/sub-host failures). The chain ends in a Groq model that almost
    always responds within the free tier."""
    primary = _MODELOS.get(tarea, _MODELOS["texto"])
    chain: list[tuple[str, str, dict]] = [primary, *_FALLBACK_CHAIN.get(tarea, [])]

    last_err: Exception | None = None
    for i, (proveedor, model_id, extra) in enumerate(chain):
        role = "primary" if i == 0 else f"fallback {i}/{len(chain) - 1}"
        if i > 0:
            backoff = min(2 ** (i - 1), 8)
            logger.info(
                "Task '%s' switching to %s → %s/%s (backoff %ds)",
                tarea, role, proveedor, model_id, backoff,
            )
            time.sleep(backoff)
        try:
            return _chat(proveedor, model_id, prompt, max_tokens, extra)
        except _RECOVERABLE_ERRORS as exc:
            last_err = exc
            next_step = (
                f"{chain[i + 1][0]}/{chain[i + 1][1]}" if i + 1 < len(chain) else "<chain exhausted>"
            )
            logger.warning(
                "Task '%s' %s %s/%s failed (%s). Next: %s.",
                tarea, role, proveedor, model_id, type(exc).__name__, next_step,
            )
    raise last_err or RuntimeError("All LLM fallbacks failed")


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
    """Orpheus TTS — returns WAV bytes (Orpheus only supports the wav format)."""
    response = groq_client.audio.speech.create(
        model=_ORPHEUS_MODEL,
        voice=voice,
        response_format="wav",
        input=text,
    )
    return response.read()
