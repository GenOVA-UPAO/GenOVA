"""LLM SDK client initialization and API key resolution."""

import logging
import time
from threading import RLock

from groq import Groq
from openai import OpenAI

from core.config import settings

logger = logging.getLogger(__name__)

_key_cache: dict[str, tuple[str | None, float]] = {}
_key_lock = RLock()
_KEY_TTL_S = 30.0


def _get_provider_key(provider: str) -> str | None:
    """Resolve API key from DB (PlatformConfig) → env var. TTL 30s."""
    now = time.monotonic()
    with _key_lock:
        hit = _key_cache.get(provider)
        if hit and now - hit[1] < _KEY_TTL_S:
            return hit[0]
    from core.database import SessionLocal
    from llm.clients.key_resolver import resolve_key

    db = SessionLocal()
    try:
        key = resolve_key(provider, None, db)
    finally:
        db.close()
    with _key_lock:
        _key_cache[provider] = (key, now)
    return key


# Cap per-call wait so a stuck provider doesn't hang the request thread
# (Render free workers have no per-request timeout — they hang forever).
# 120s default: the 'codigo' task streams up to 12k tokens of HTML, which
# legitimately takes 1–2 min; a 30s cap aborted valid generations mid-stream.
# Tune down via LLM_TIMEOUT_S where workers are time-boxed.
_LLM_TIMEOUT_S = settings.llm_timeout_s

# max_retries=0 en todos: ya recorremos nuestra propia cadena de fallback en
# generar_texto, así que los reintentos internos del SDK (default 2) solo
# multiplican la espera ante un proveedor lento/caído (3×timeout por intento +
# la cadena externa) → la "carga indefinida". Un intento por modelo, y el control
# de reintentos/backoff vive en generar_texto.
groq_client = Groq(api_key=settings.groq_api_key or "not-configured", timeout=_LLM_TIMEOUT_S, max_retries=0)

# OpenRouter uses the OpenAI-compatible endpoint.
# HTTP-Referer and X-Title are optional but enable app attribution in OR dashboard.
openrouter_client = OpenAI(
    api_key=settings.openrouter_api_key or "not-configured",
    base_url="https://openrouter.ai/api/v1",
    default_headers={
        "HTTP-Referer": settings.app_url,
        "X-Title": "GenOVA",
    },
    timeout=_LLM_TIMEOUT_S,
    max_retries=0,
)

# OpenCode Go uses the OpenAI-compatible endpoint.
opencode_client = OpenAI(
    api_key=settings.opencode_api_key or "not-configured",
    base_url="https://opencode.ai/zen/go/v1",
    timeout=_LLM_TIMEOUT_S,
    max_retries=0,
)

# HuggingFace Serverless Inference — OpenAI-compatible text generation.
huggingface_client = OpenAI(
    api_key=settings.hf_token or "not-configured",
    base_url="https://api-inference.huggingface.co/v1/",
    timeout=_LLM_TIMEOUT_S,
    max_retries=0,
)
