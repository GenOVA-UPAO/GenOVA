"""LLM routing — Groq (primary) + OpenRouter (secondary / arbitrary model)."""

import logging
import time

from groq import APIConnectionError as GroqAPIConnectionError
from groq import APIStatusError as GroqAPIStatusError
from groq import APITimeoutError as GroqAPITimeoutError
from groq import Groq
from groq import RateLimitError as GroqRateLimitError
from openai import APIConnectionError as OpenAIAPIConnectionError
from openai import APIStatusError as OpenAIAPIStatusError
from openai import APITimeoutError as OpenAIAPITimeoutError
from openai import OpenAI
from openai import RateLimitError as OpenAIRateLimitError

from config import settings
from llm.model_catalog import clamp_timeout, is_valid_model

logger = logging.getLogger(__name__)

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
groq_client = Groq(api_key=settings.groq_api_key, timeout=_LLM_TIMEOUT_S, max_retries=0)

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

# (provider, model_id, extra_kwargs) — SEMILLA. El admin puede sobrescribir por
# tarea desde la UI (llm_config_store / PlatformConfig); estas se usan cuando no
# hay config admin o la entrada guardada es inválida.
# Groq uses max_completion_tokens; OpenRouter uses max_tokens (OpenAI-compat).
_SEED_MODELOS: dict[str, tuple] = {
    "texto": ("groq", "llama-3.3-70b-versatile", {}),
    # DeepSeek V4 Pro via OpenCode Go subscription — stronger code model.
    "codigo": ("opencode", "deepseek-v4-pro", {}),
    "orquestador": ("groq", "openai/gpt-oss-120b", {"reasoning_effort": "medium"}),
    "razonamiento": ("groq", "qwen/qwen3-32b", {"reasoning_effort": "default"}),
}

_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

_FALLBACK_GROQ_MODEL = "llama-3.1-8b-instant"
_FALLBACK_OR_MODEL = "meta-llama/llama-3.3-70b-instruct:free"

# Per-task fallback chain — SEMILLA (el admin puede sobrescribirla por tarea).
# Tried in order on any APIStatusError (rate-limit, 402 insufficient credit,
# provider-specific errors). The last entry is the safety-net Groq model that
# almost always responds within free tier.
_SEED_FALLBACK_CHAIN: dict[str, list[tuple[str, str, dict]]] = {
    "codigo": [
        # Free, valid code model first; then a general free model; the last
        # entry is the fast Groq safety net that almost always responds.
        ("openrouter", "qwen/qwen3-coder:free", {}),
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


def _entry_tuple(e: dict) -> tuple | None:
    """{provider, model_id, extra} → (provider, model_id, extra) o None."""
    p, m = e.get("provider"), e.get("model_id")
    if not (p and m):
        return None
    extra = e.get("extra")
    return (p, m, extra if isinstance(extra, dict) else {})


def _default_models() -> dict[str, tuple]:
    """Defaults por tarea: config admin (llm_config_store) ⊕ semilla."""
    from llm import llm_config_store

    out = dict(_SEED_MODELOS)
    for tarea, e in (llm_config_store.stored_cached().get("defaults") or {}).items():
        t = _entry_tuple(e)
        if t and tarea in out:
            out[tarea] = t
    return out


def _fallback_chain(tarea: str) -> list[tuple]:
    """Cadena de fallback para la tarea: config admin o semilla."""
    from llm import llm_config_store

    stored = (llm_config_store.stored_cached().get("fallbacks") or {}).get(tarea)
    if stored:
        chain = [t for t in (_entry_tuple(e) for e in stored) if t]
        if chain:
            return chain
    return _SEED_FALLBACK_CHAIN.get(tarea, [])


def effective_llm_config() -> dict:
    """Config efectiva (semilla ⊕ admin) en forma JSON, para la API/UI admin."""
    defaults = {
        tarea: {"provider": p, "model_id": m, "extra": x}
        for tarea, (p, m, x) in _default_models().items()
    }
    fallbacks = {
        tarea: [
            {"provider": p, "model_id": m, "extra": x}
            for (p, m, x) in _fallback_chain(tarea)
        ]
        for tarea in _SEED_MODELOS
    }
    return {"defaults": defaults, "fallbacks": fallbacks}


def _chat(
    provider: str,
    model_id: str,
    prompt: str,
    max_tokens: int,
    extra: dict,
    timeout: float | None = None,
) -> str:
    msgs = [{"role": "user", "content": prompt}]
    if provider == "groq":
        client = groq_client.with_options(timeout=timeout) if timeout else groq_client
        # Groq models support up to 8192 output tokens. Previous cap at 3500
        # truncated HTML resources mid-script, breaking interactivity.
        r = client.chat.completions.create(
            model=model_id, messages=msgs, max_completion_tokens=min(max_tokens, 8192), **extra
        )
    elif provider == "opencode":
        client = opencode_client.with_options(timeout=timeout) if timeout else opencode_client
        r = client.chat.completions.create(
            model=model_id, messages=msgs, max_tokens=max_tokens, **extra
        )
    else:
        client = openrouter_client.with_options(timeout=timeout) if timeout else openrouter_client
        r = client.chat.completions.create(
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
    # Timeouts / connection drops: advance the chain to the next (often faster)
    # model instead of failing the whole resource and retrying the same slow one.
    GroqAPITimeoutError,
    OpenAIAPITimeoutError,
    GroqAPIConnectionError,
    OpenAIAPIConnectionError,
    EmptyContentError,
)


def _resolve_primary(
    tarea: str, llm_config: dict | None, enabled_models: list | None = None
) -> tuple[tuple, float | None]:
    """Pick the primary (provider, model, extra) and per-call timeout, honoring a
    valid per-user override for `tarea`; fall back to the system default model.

    If `enabled_models` is provided, the user's model choice is checked against it
    (plus system defaults are always allowed). Models disabled by the user silently
    fall back to the default."""
    from llm.model_catalog import is_default_model

    models = _default_models()
    default = models.get(tarea, models["texto"])
    cfg = (llm_config or {}).get(tarea) or {}
    provider, model_id = cfg.get("provider"), cfg.get("model_id")
    timeout = clamp_timeout(cfg.get("timeout_s")) if cfg.get("timeout_s") is not None else None

    if provider and model_id and is_valid_model(provider, model_id):
        if enabled_models is None:
            return (provider, model_id, {}), timeout
        enabled_keys = {
            (e["provider"], e["model_id"])
            for e in enabled_models
            if isinstance(e, dict) and e.get("provider") and e.get("model_id")
        }
        key = (provider, model_id)
        if key in enabled_keys or is_default_model(provider, model_id):
            return (provider, model_id, {}), timeout
    return default, timeout


def _retry_after_seconds(exc: Exception) -> float | None:
    """Lee el header Retry-After del 429, si lo trae (Groq/OpenAI lo exponen)."""
    resp = getattr(exc, "response", None)
    if resp is None:
        return None
    try:
        val = resp.headers.get("retry-after")
        return float(val) if val else None
    except (TypeError, ValueError, AttributeError):
        return None


def _retry_delay(exc: Exception | None, prev_provider: str | None, next_provider: str, i: int) -> float:
    """Backoff adaptativo antes del intento i (>0) de la cadena de fallback.

    Genérico: exponencial acotado. Rate-limit (429): honra un Retry-After corto;
    si el siguiente intento es de OTRO proveedor, no espera (su ventana de límite
    es independiente); si es el mismo proveedor saturado, espera un poco más."""
    base = min(2 ** (i - 1), 8)
    if isinstance(exc, (GroqRateLimitError, OpenAIRateLimitError)):
        ra = _retry_after_seconds(exc)
        if ra is not None and ra <= 20:
            return ra
        if next_provider != prev_provider:
            return 0.0
        return float(min(base * 2, 15))
    return float(base)


def generar_texto(
    prompt: str,
    tarea: str,
    max_tokens: int = 3000,
    llm_config: dict | None = None,
    enabled_models: list | None = None,
) -> str:
    """Route a task to its model and walk the per-task fallback chain on any
    recoverable API error (rate-limit, 402 insufficient credit, provider 5xx,
    Crucible/sub-host failures). The chain ends in a Groq model that almost
    always responds within the free tier. `llm_config` carries per-user model/
    timeout overrides for the primary attempt. `enabled_models` restricts overrides
    to models the user has explicitly enabled (system defaults always pass)."""
    primary, timeout = _resolve_primary(tarea, llm_config, enabled_models=enabled_models)
    chain: list[tuple[str, str, dict]] = [primary, *_fallback_chain(tarea)]

    last_err: Exception | None = None
    prev_provider: str | None = None
    for i, (proveedor, model_id, extra) in enumerate(chain):
        role = "primary" if i == 0 else f"fallback {i}/{len(chain) - 1}"
        if i > 0:
            backoff = _retry_delay(last_err, prev_provider, proveedor, i)
            logger.info(
                "Task '%s' switching to %s → %s/%s (backoff %.1fs)",
                tarea,
                role,
                proveedor,
                model_id,
                backoff,
            )
            if backoff:
                time.sleep(backoff)
        try:
            return _chat(proveedor, model_id, prompt, max_tokens, extra, timeout)
        except _RECOVERABLE_ERRORS as exc:
            last_err = exc
            prev_provider = proveedor
            next_step = (
                f"{chain[i + 1][0]}/{chain[i + 1][1]}"
                if i + 1 < len(chain)
                else "<chain exhausted>"
            )
            logger.warning(
                "Task '%s' %s %s/%s failed (%s). Next: %s.",
                tarea,
                role,
                proveedor,
                model_id,
                type(exc).__name__,
                next_step,
            )
    raise last_err or RuntimeError("All LLM fallbacks failed")


def generar_texto_with_model(
    prompt: str, model_id: str, provider: str, max_tokens: int = 4000
) -> str:
    """Call an arbitrary model on the given provider (groq or openrouter)."""
    try:
        if provider == "groq":
            response = groq_client.chat.completions.create(
                model=model_id,
                messages=[{"role": "user", "content": prompt}],
                max_completion_tokens=max_tokens,
            )
        elif provider == "opencode":
            response = opencode_client.chat.completions.create(
                model=model_id,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
            )
        else:
            response = openrouter_client.chat.completions.create(
                model=model_id,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
            )
        return response.choices[0].message.content

    except (GroqRateLimitError, OpenAIRateLimitError):
        logger.warning(
            "Rate limit on model='%s' provider='%s'; falling back to %s",
            model_id,
            provider,
            _FALLBACK_OR_MODEL,
        )
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
        timeout=_LLM_TIMEOUT_S,
    )
    return response.choices[0].message.content
