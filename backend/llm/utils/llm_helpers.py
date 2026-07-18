"""LLM model selection, fallback chains, retry logic, and error types."""

import structlog
from groq import APIConnectionError as GroqAPIConnectionError
from groq import APIStatusError as GroqAPIStatusError
from groq import APITimeoutError as GroqAPITimeoutError
from groq import RateLimitError as GroqRateLimitError
from openai import APIConnectionError as OpenAIAPIConnectionError
from openai import APIStatusError as OpenAIAPIStatusError
from openai import APITimeoutError as OpenAIAPITimeoutError
from openai import RateLimitError as OpenAIRateLimitError

from llm.catalog.model_catalog import clamp_timeout, is_valid_model

logger = structlog.get_logger(__name__)

# (provider, model_id, extra_kwargs) — SEMILLA. El admin puede sobrescribir por
# tarea desde la UI (llm_config_store / PlatformConfig); estas se usan cuando no
# hay config admin o la entrada guardada es inválida.
# Groq uses max_completion_tokens; OpenRouter uses max_tokens (OpenAI-compat).
_SEED_MODELOS: dict[str, tuple] = {
    # Groq quota se agota rápido con prompts largos → OpenRouter como primario.
    "texto": ("openrouter", "deepseek/deepseek-v4-flash", {}),
    # DeepSeek V4 Pro via OpenCode Go subscription — stronger code model.
    "codigo": ("opencode", "deepseek-v4-pro", {}),
    "orquestador": ("openrouter", "deepseek/deepseek-v4-flash", {}),
    "razonamiento": ("openrouter", "deepseek/deepseek-v4-flash", {}),
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
        ("openrouter", "qwen/qwen3-coder:free", {}),
        ("openrouter", _FALLBACK_OR_MODEL, {}),
        ("groq", "llama-3.3-70b-versatile", {}),
    ],
    "texto": [
        ("openrouter", "deepseek/deepseek-chat-v3.1", {}),
        ("openrouter", _FALLBACK_OR_MODEL, {}),
        ("groq", _FALLBACK_GROQ_MODEL, {}),
    ],
    "orquestador": [
        ("openrouter", "deepseek/deepseek-chat-v3.1", {}),
        ("openrouter", _FALLBACK_OR_MODEL, {}),
        ("groq", _FALLBACK_GROQ_MODEL, {}),
    ],
    "razonamiento": [
        ("openrouter", "deepseek/deepseek-chat-v3.1", {}),
        ("openrouter", _FALLBACK_OR_MODEL, {}),
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
    from llm.utils import llm_config_store

    out = dict(_SEED_MODELOS)
    for tarea, e in (llm_config_store.stored_cached().get("defaults") or {}).items():
        t = _entry_tuple(e)
        if t and tarea in out:
            out[tarea] = t
    return out


def _fallback_chain(tarea: str, llm_config: dict | None = None) -> list[tuple]:
    """Cadena de fallback para la tarea: user override > config admin > semilla."""
    from llm.utils import llm_config_store

    cfg = (llm_config or {}).get(tarea) or {}
    user_fbs = cfg.get("fallbacks")
    if isinstance(user_fbs, list) and user_fbs:
        chain = [t for t in (_entry_tuple(e) for e in user_fbs) if t]
        if chain:
            return chain

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
        tarea: [{"provider": p, "model_id": m, "extra": x} for (p, m, x) in _fallback_chain(tarea)]
        for tarea in _SEED_MODELOS
    }
    # HU-035 — media (imagen/video) no tiene semilla: solo lo almacenado + switches.
    from llm.utils import llm_config_store

    media_defaults, media_fallbacks, flags = llm_config_store.effective_media_slice()
    defaults.update(media_defaults)
    fallbacks.update(media_fallbacks)
    return {"defaults": defaults, "fallbacks": fallbacks, "generation_enabled": flags}


class EmptyContentError(RuntimeError):
    """LLM returned empty content (e.g. reasoning model that didn't emit text)."""


# Budgets below this → thinking off (JSON corto / critic / podcast).
_THINK_OFF_MAX = 6000
# Budgets at/above this → codigo-scale: adaptive/low thinking with hard cap.
_THINK_LARGE_MAX = 24000

# Presupuesto de salida para la tarea 'codigo' (HTML). Bajado de 32768: una
# generación real usa ~20k tokens; 24k da margen sin runaway de reasoning ni
# latencia de más. Centralizado (antes era un literal repetido en generate/refine).
_CODE_MAX_TOKENS = 24000


def with_model_thinking(provider: str, model_id: str, extra: dict, max_tokens: int) -> dict:
    """Budget-aware thinking for DeepSeek / MiniMax (avoids EmptyContentError).

    Small ``max_tokens`` (<6k): thinking disabled — CoT would eat the whole budget.
    Medium (texto ~8k): light thinking (DeepSeek ``effort=low`` / MiniMax adaptive
    with ``reasoning.max_tokens=2048``, ``exclude=true``).
    Large (codigo ~32k): adaptive/low with ``reasoning.max_tokens=4096``.

    Preserves an explicit ``extra_body`` from the caller.
    """
    call_extra = dict(extra or {})
    if "extra_body" in call_extra:
        return call_extra
    mid = (model_id or "").lower()
    is_ds = "deepseek" in mid
    is_mm = "minimax" in mid
    is_openai_reason = provider == "openrouter" and ("gpt-5" in mid or "codex" in mid)
    if not is_ds and not is_mm and not is_openai_reason:
        return call_extra

    if is_openai_reason:
        # OpenAI (gpt-5.x / codex): los tokens de reasoning cuentan contra el
        # presupuesto y pueden dejar `content` vacío (EmptyContentError). Acotar el
        # esfuerzo y excluir el reasoning del output deja sitio para el HTML.
        effort = "minimal" if max_tokens < _THINK_OFF_MAX else "low"
        call_extra["extra_body"] = {"reasoning": {"effort": effort, "exclude": True}}
        return call_extra

    if max_tokens < _THINK_OFF_MAX:
        body: dict = {"thinking": {"type": "disabled"}}
        if provider == "openrouter":
            body["reasoning"] = {"effort": "none"}
        call_extra["extra_body"] = body
        return call_extra

    reason_cap = 4096 if max_tokens >= _THINK_LARGE_MAX else 2048
    if provider == "openrouter":
        if is_mm:
            body = {
                "thinking": {"type": "adaptive"},
                "reasoning": {"max_tokens": reason_cap, "exclude": True},
            }
        else:
            body = {
                "thinking": {"type": "enabled"},
                "reasoning": {"effort": "low", "exclude": True},
            }
    else:
        # OpenCode / native: only provider thinking toggle.
        body = {"thinking": {"type": "adaptive" if is_mm else "enabled"}}
    call_extra["extra_body"] = body
    return call_extra


def with_thinking_disabled(provider: str, model_id: str, extra: dict) -> dict:
    """Back-compat: force thinking off (small-budget path)."""
    return with_model_thinking(provider, model_id, extra, max_tokens=0)


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
    from llm.catalog.model_catalog import is_default_model

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


def _retry_delay(
    exc: Exception | None, prev_provider: str | None, next_provider: str, i: int
) -> float:
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
