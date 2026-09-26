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

# El modelo que describe las imágenes del RAG ya no es un id fijo (Groq retiró
# el anterior): ver llm.utils.vision_models.

# Groq y OpenRouter retiran modelos sin aviso: un id que ya no ofrecen deja la
# cadena sin ese eslabón (el refresco lo marca «model not found in API»).
# Revisados contra GET /models en 2026-09: gpt-oss-20b es el modelo de chat más
# rápido y barato que queda en Groq (sustituye a llama-3.1-8b-instant) y Gemma 4
# 31B el `:free` general más estable de OpenRouter (sustituye al Llama 3.3 70B
# gratuito, que ya no existe).
_FALLBACK_GROQ_MODEL = "openai/gpt-oss-20b"
_FALLBACK_OR_MODEL = "google/gemma-4-31b-it:free"

# Per-task fallback chain — SEMILLA (el admin puede sobrescribirla por tarea).
# Tried in order on any APIStatusError (rate-limit, 402 insufficient credit,
# provider-specific errors). The last entry is the safety-net Groq model that
# almost always responds within free tier.
_SEED_FALLBACK_CHAIN: dict[str, list[tuple[str, str, dict]]] = {
    "codigo": [
        # Laguna S 2.1 (Poolside) es un modelo de código con 262k de contexto y
        # 32k de salida (caben los 24k de _CODE_MAX_TOKENS). Medido en 2026-09
        # con un quiz HTML en español: HTML completo, JS válido y sin mezclar
        # inglés, en ~48 s y respondiendo siempre. Sustituye a Qwen3.8 27B
        # :free, que no se conserva detrás: su único proveedor devolvía 429 en
        # casi todos los intentos (1 de ~25), tardó 333 s y su JS no compilaba
        # (comillas sin escapar). Un eslabón que casi nunca responde solo añade
        # esperas antes de llegar a Gemma y a Groq.
        ("openrouter", "poolside/laguna-s-2.1:free", {}),
        ("openrouter", _FALLBACK_OR_MODEL, {}),
        # Sustituye a Llama 3.3 70B (retirado). Qwen3.8 27B en Groq solo deja
        # 16k tokens de salida, menos que los 24k de _CODE_MAX_TOKENS.
        ("groq", "openai/gpt-oss-120b", {}),
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


# Autor del OVA en ejecución, dentro de `llm_config`: con él se buscan sus
# claves propias en el momento de cada llamada. Solo viaja el id, nunca las
# claves: el estado del grafo puede persistirse (OVA_PG_CHECKPOINT=1).
OWNER_FIELD = "_owner_id"


def with_owner(llm_config: dict | None, user_id: object) -> dict:
    """Copia de `llm_config` que sabe de quién son las claves propias a usar."""
    config = dict(llm_config or {})
    if user_id:
        config[OWNER_FIELD] = str(user_id)
    return config


def own_keys(llm_config: dict | None) -> dict[str, str]:
    """Proveedor → clave propia del autor (vacío si no hay autor o no tiene)."""
    owner = (llm_config or {}).get(OWNER_FIELD)
    if not owner:
        return {}
    from llm.clients.clients import get_user_keys

    return get_user_keys(str(owner))


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


class LLMBudgetExhaustedError(RuntimeError):
    """La cadena de modelos ni se intentó: el presupuesto del recurso (reloj)
    se agotó antes de llegar a ella. Distinto de "todos los modelos fallaron"
    — el remedio es el reparto del tiempo o el modelo primario, no los
    fallbacks. Subclase de RuntimeError para no romper a los que atrapan
    RuntimeError genérico."""


# Budgets below this → thinking off (JSON corto / critic / podcast).
_THINK_OFF_MAX = 6000
# Budgets at/above this → codigo-scale: adaptive/low thinking with hard cap.
_THINK_LARGE_MAX = 24000

# Presupuesto de salida para la tarea 'codigo' (HTML). Bajado de 32768: una
# generación real usa ~20k tokens; 24k da margen sin runaway de reasoning ni
# latencia de más. Centralizado (antes era un literal repetido en generate/refine).
_CODE_MAX_TOKENS = 24000


# Modelos de respaldo de OpenRouter que pueden razonar por defecto y en los que
# ese razonamiento no compensa: son eslabones de rescate, donde importa
# responder pronto, y el razonamiento cuenta contra `max_tokens` (puede dejar
# el HTML a medias o `content` vacío). Los tres admiten apagarlo del todo
# (`reasoning` está en su `supported_parameters` de GET /models). Medido con
# los `:free` en 2026-09, mismo prompt con y sin el ajuste:
#   - Laguna S 2.1: 1031 → 0 tokens de razonamiento, 41,7 → 14,3 s (en un quiz
#     HTML: 803 → 0, 72 → 48 s, con HTML igual de válido).
#   - Qwen3.8 27B: 821 → 0 tokens de razonamiento, 55,1 → 25,6 s.
#   - Gemma 4: ya respondía sin razonar (0 → 0); se apaga igualmente porque su
#     «thinking» es configurable y otro proveedor de la variante de pago
#     podría activarlo.
# Las respuestas sin razonamiento siguieron siendo correctas. Se comparan por
# prefijo sin el sufijo `:free`: valen igual la variante gratuita y la de pago.
_OR_REASONING_OFF_PREFIXES = (
    "qwen/qwen3.8-27b",
    "google/gemma-4-",
    "poolside/laguna-",
)


def _or_reasoning_off(provider: str, model_id: str) -> bool:
    """¿Es un modelo de OpenRouter al que se le apaga siempre el razonamiento?"""
    if provider != "openrouter":
        return False
    base = (model_id or "").lower().removesuffix(":free")
    return base.startswith(_OR_REASONING_OFF_PREFIXES)


def with_model_thinking(provider: str, model_id: str, extra: dict, max_tokens: int) -> dict:
    """Budget-aware thinking for DeepSeek / MiniMax (avoids EmptyContentError).

    Small ``max_tokens`` (<6k): thinking disabled — CoT would eat the whole budget.
    Medium (texto ~8k): light thinking (DeepSeek ``effort=low`` / MiniMax adaptive
    with ``reasoning.max_tokens=2048``, ``exclude=true``).
    Large (codigo ~32k): adaptive/low with ``reasoning.max_tokens=4096``.

    Qwen3.8 27B, Gemma 4 y Laguna en OpenRouter: razonamiento apagado con
    cualquier presupuesto (ver ``_OR_REASONING_OFF_PREFIXES``).

    Preserves an explicit ``extra_body`` from the caller.
    """
    call_extra = dict(extra or {})
    if "extra_body" in call_extra:
        return call_extra
    if _or_reasoning_off(provider, model_id):
        # `enabled: false` es la forma genérica de OpenRouter de apagarlo del
        # todo (no solo reducirlo); él lo traduce al parámetro de cada proveedor.
        call_extra["extra_body"] = {"reasoning": {"enabled": False}}
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

    # Con clave propia el usuario elige en el catálogo de su proveedor, no en la
    # lista curada: el guardado ya validó el modelo contra ese catálogo.
    own = provider in own_keys(llm_config)
    if provider and model_id and (own or is_valid_model(provider, model_id)):
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
        # Sin ningún modelo activado de su proveedor, se le ofrece la lista
        # entera (ver el catálogo por usuario): cualquiera de ella vale.
        if own and not any(p == provider for p, _ in enabled_keys):
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

