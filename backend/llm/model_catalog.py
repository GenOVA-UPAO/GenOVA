"""Curated LLM model catalog + per-user config defaults and validation.

Single source of truth for the models a user may pick in the LLM settings UI and
for validating saved settings. Ids must match what the providers actually serve
(OpenRouter / Groq) — invalid ids 404 at generation time (the ":free" bug).

CATALOG_ENTRIES is the curated allowlist. `pricing` and `context_length` are
populated at startup from the providers' APIs (catalog_refresh). `active` is set
by whether the model was found in the API response; inactive models are hidden
from the UI.
"""

# ---- Curated allowlist ------------------------------------------------------

CATALOG_ENTRIES = [
    # Groq — pricing=None means gratis (Groq doesn't charge per token).
    {
        "provider": "groq",
        "model_id": "llama-3.3-70b-versatile",
        "label": "Llama 3.3 70B (Groq)",
        "task": "texto",
        "pricing": None,
        "context_length": 128000,
        "active": True,
    },
    {
        "provider": "groq",
        "model_id": "llama-3.1-8b-instant",
        "label": "Llama 3.1 8B (Groq)",
        "task": "texto",
        "pricing": None,
        "context_length": 128000,
        "active": True,
    },
    {
        "provider": "groq",
        "model_id": "qwen/qwen3-32b",
        "label": "Qwen3 32B (Groq)",
        "task": "razonamiento",
        "pricing": None,
        "context_length": 128000,
        "active": True,
    },
    {
        "provider": "groq",
        "model_id": "openai/gpt-oss-120b",
        "label": "GPT-OSS 120B (Groq)",
        "task": "orquestador",
        "pricing": None,
        "context_length": 128000,
        "active": True,
    },
    # OpenRouter — pricing populated at startup from /api/v1/models.
    {
        "provider": "openrouter",
        "model_id": "deepseek/deepseek-v4-flash",
        "label": "DeepSeek V4 Flash (OpenRouter)",
        "task": "codigo",
        "pricing": None,
        "context_length": None,
        "active": True,
        "notes": "LiveCodeBench 91.6 / SWE-bench 79.0. Mejor seguimiento de reglas anidadas.",
    },
    {
        "provider": "openrouter",
        "model_id": "deepseek/deepseek-chat-v3.1",
        "label": "DeepSeek Chat V3.1 (OpenRouter)",
        "task": "codigo",
        "pricing": None,
        "context_length": None,
        "active": True,
    },
    {
        "provider": "openrouter",
        "model_id": "qwen/qwen3-coder",
        "label": "Qwen3 Coder (OpenRouter)",
        "task": "codigo",
        "pricing": None,
        "context_length": None,
        "active": True,
    },
    {
        "provider": "openrouter",
        "model_id": "qwen/qwen3-coder:free",
        "label": "Qwen3 Coder (OpenRouter · free)",
        "task": "codigo",
        "pricing": None,
        "context_length": None,
        "active": True,
    },
    {
        "provider": "openrouter",
        "model_id": "deepseek/deepseek-v4-flash",
        "label": "DeepSeek V4 Flash (OpenRouter)",
        "task": "texto",
        "pricing": None,
        "context_length": None,
        "active": True,
    },
    {
        "provider": "openrouter",
        "model_id": "deepseek/deepseek-chat-v3.1",
        "label": "DeepSeek Chat V3.1 (OpenRouter)",
        "task": "texto",
        "pricing": None,
        "context_length": None,
        "active": True,
    },
    {
        "provider": "openrouter",
        "model_id": "meta-llama/llama-3.3-70b-instruct:free",
        "label": "Llama 3.3 70B (OpenRouter · free)",
        "task": "texto",
        "pricing": None,
        "context_length": None,
        "active": True,
    },
    # OpenRouter meta-models — special routers, not single models.
    # openrouter/auto: free auto-router; sends the prompt to whichever free model
    # OpenRouter considers best for the task on that turn. Zero direct cost.
    {
        "provider": "openrouter",
        "model_id": "openrouter/auto",
        "label": "Auto (OpenRouter · mejor modelo gratis)",
        "task": "texto",
        "pricing": None,
        "context_length": None,
        "active": True,
        "notes": "Enruta automáticamente al mejor modelo gratuito disponible para la tarea.",
    },
    {
        "provider": "openrouter",
        "model_id": "openrouter/auto",
        "label": "Auto (OpenRouter · mejor modelo gratis)",
        "task": "orquestador",
        "pricing": None,
        "context_length": None,
        "active": True,
        "notes": "Enruta automáticamente al mejor modelo gratuito disponible para la tarea.",
    },
    {
        "provider": "openrouter",
        "model_id": "openrouter/auto",
        "label": "Auto (OpenRouter · mejor modelo gratis)",
        "task": "razonamiento",
        "pricing": None,
        "context_length": None,
        "active": True,
        "notes": "Enruta automáticamente al mejor modelo gratuito disponible para la tarea.",
    },
    # openrouter/fusion: ensembles multiple models — higher quality but slower and
    # more expensive (each call hits several models internally).
    {
        "provider": "openrouter",
        "model_id": "openrouter/fusion",
        "label": "Fusion (OpenRouter · ensemble de modelos)",
        "task": "texto",
        "pricing": None,
        "context_length": None,
        "active": True,
        "notes": "Fusiona varios modelos para mayor calidad. Más lento y costoso.",
    },
    # OpenCode Go — personal subscription (bearer token). No API refresh needed;
    # model list is static and verified manually via GET /v1/models.
    {
        "provider": "opencode",
        "model_id": "deepseek-v4-pro",
        "label": "DeepSeek V4 Pro (OpenCode Go)",
        "task": "codigo",
        "pricing": None,
        "context_length": 163840,
        "active": True,
    },
]


def _build_provider_catalog() -> dict[str, list[str]]:
    """Derive the legacy CATALOG {provider: [model_ids]} from CATALOG_ENTRIES."""
    cat: dict[str, list[str]] = {}
    for e in CATALOG_ENTRIES:
        if e["active"]:
            cat.setdefault(e["provider"], []).append(e["model_id"])
    return cat


# Valid, currently-served models per provider (text + code capable).
# Rebuilt at startup after catalog_refresh marks entries active/inactive.
CATALOG: dict[str, list[str]] = _build_provider_catalog()


def _rebuild_catalog() -> None:
    """Recompute CATALOG after catalog_refresh updates CATALOG_ENTRIES."""
    global CATALOG
    CATALOG = _build_provider_catalog()


# System defaults per generation type (mirror llm_router._SEED_MODELOS primaries).
DEFAULTS: dict[str, dict] = {
    "texto": {"provider": "openrouter", "model_id": "deepseek/deepseek-v4-flash"},
    "codigo": {"provider": "opencode", "model_id": "deepseek-v4-pro"},
    "orquestador": {"provider": "openrouter", "model_id": "deepseek/deepseek-v4-flash"},
    "razonamiento": {"provider": "openrouter", "model_id": "deepseek/deepseek-v4-flash"},
}

TASKS: tuple[str, ...] = tuple(DEFAULTS.keys())

# Set of (provider, model_id) tuples that may never be disabled by the user.
_DEFAULT_KEYS: set[tuple[str, str]] = {(d["provider"], d["model_id"]) for d in DEFAULTS.values()}


def is_default_model(provider: str, model_id: str) -> bool:
    """True when provider/model_id is a system default (locked in UI)."""
    return (provider, model_id) in _DEFAULT_KEYS


# Per-call timeout bounds (seconds).
TIMEOUT_MIN = 30.0
TIMEOUT_MAX = 300.0
DEFAULT_TIMEOUT_S = 120.0


def is_valid_model(provider: str, model_id: str) -> bool:
    """True when provider/model_id is a known, serveable model."""
    return model_id in CATALOG.get(provider, [])


def clamp_timeout(value) -> float | None:
    """Return the timeout if numeric and within bounds, else None (reject)."""
    try:
        t = float(value)
    except (TypeError, ValueError):
        return None
    return t if TIMEOUT_MIN <= t <= TIMEOUT_MAX else None


def merge_with_defaults(
    user_settings: dict | None,
    extra_keys: set[tuple[str, str]] | None = None,
) -> dict:
    """Effective per-type config: a valid user override or the system default,
    each with a usable timeout_s. Used by the generation pipeline and the GET.

    `extra_keys` is the set of (provider, model_id) the user has explicitly
    enabled — models not in the curated CATALOG are accepted when they appear
    here (user opted in via the model browser).
    """
    user_settings = user_settings or {}
    out: dict[str, dict] = {}
    for tipo, dflt in DEFAULTS.items():
        u = user_settings.get(tipo) or {}
        provider, model_id = u.get("provider"), u.get("model_id")
        extra_ok = bool(extra_keys and (provider, model_id) in extra_keys)
        if provider and model_id and (is_valid_model(provider, model_id) or extra_ok):
            entry = {"provider": provider, "model_id": model_id}
        else:
            entry = dict(dflt)
        t = clamp_timeout(u.get("timeout_s")) if u.get("timeout_s") is not None else None
        entry["timeout_s"] = t if t is not None else DEFAULT_TIMEOUT_S
        out[tipo] = entry
    return out


def sanitize_settings(
    payload: dict | None,
    extra_keys: set[tuple[str, str]] | None = None,
) -> dict:
    """Validate a PUT payload, keeping only valid (provider, model_id, timeout_s)
    entries per known type. Raises ValueError on an invalid model/timeout so the
    router can return 400.

    `extra_keys` is the set of (provider, model_id) the user has explicitly
    enabled — models not in the curated CATALOG are accepted when they appear
    here (user opted in via the model browser).
    """
    payload = payload or {}
    clean: dict[str, dict] = {}
    for tipo, raw in payload.items():
        if tipo not in DEFAULTS or not isinstance(raw, dict):
            continue
        provider, model_id = raw.get("provider"), raw.get("model_id")
        if not (provider and model_id):
            continue
        extra_ok = bool(extra_keys and (provider, model_id) in extra_keys)
        if not is_valid_model(provider, model_id) and not extra_ok:
            raise ValueError(f"Modelo no permitido para {tipo}: {provider}/{model_id}")
        t = clamp_timeout(raw.get("timeout_s", DEFAULT_TIMEOUT_S))
        if t is None:
            raise ValueError(f"Timeout fuera de rango para {tipo} (30-300s)")
        clean[tipo] = {"provider": provider, "model_id": model_id, "timeout_s": t}
    return clean
