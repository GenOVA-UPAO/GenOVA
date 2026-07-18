"""LLM SDK client initialization and API key resolution."""

import contextlib
import contextvars
import time
from threading import RLock

import structlog
from groq import Groq
from openai import OpenAI

from core.config import settings

logger = structlog.get_logger(__name__)

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


def traced_openai(client: OpenAI) -> OpenAI:
    """Envuelve un cliente OpenAI con tracing LangSmith: cada
    ``chat.completions.create`` aparece como run hijo 'llm' (tokens/costo/latencia)
    bajo el nodo LangGraph actual (resource_worker, critic…).

    No-op si el tracing está apagado. Se envuelve POR LLAMADA porque
    ``client.with_options()`` devuelve una copia sin el patch — envolver solo el
    cliente base perdería el trazado en la ruta con api_key/timeout (la común).
    """
    if not (settings.langsmith_tracing and settings.langsmith_api_key):
        return client
    # wrap_openai muta el cliente in-place y lo devuelve; marcar para no re-envolver
    # el mismo objeto (las copias de with_options son frescas → se envuelven 1 vez).
    if getattr(client, "_genova_traced", False):
        return client
    try:
        from langsmith.wrappers import wrap_openai

        wrapped = wrap_openai(client)
    except Exception:  # nunca romper la generación por instrumentar
        return client
    # cliente sin __dict__ escribible: se envolvería de nuevo, inofensivo
    with contextlib.suppress(Exception):
        wrapped._genova_traced = True
    return wrapped


# RunTree padre del job en curso (LangSmith). Lo setea job_trace por nodo; _chat lo
# pasa EXPLÍCITO a wrap_openai (langsmith_extra) para anidar de forma robusta a través
# de los thread-pools del fan-out — los contextvars no cruzan ThreadPoolExecutor.submit,
# así que el contexto ambiente de langsmith no basta.
_CURRENT_PARENT: contextvars.ContextVar = contextvars.ContextVar("genova_ls_parent", default=None)


def current_parent():
    """RunTree padre del job en curso, o None fuera de una generación/sin tracing."""
    return _CURRENT_PARENT.get()


def set_current_parent(rt):
    """Setea el padre; devuelve el token para reset_current_parent."""
    return _CURRENT_PARENT.set(rt)


def reset_current_parent(token) -> None:
    with contextlib.suppress(Exception):
        _CURRENT_PARENT.reset(token)
