"""API key resolution: user key → platform DB key → env var fallback.

Priority chain for every provider:
  1. User's own key (user_api_keys[provider])
  2. Platform key set by an admin (platform_config table)
  3. Env var (GROQ_API_KEY, OPENROUTER_API_KEY, …)
"""

import os

PROVIDERS = ("groq", "openrouter", "opencode", "siliconflow", "runware", "falai")

_ENV_VARS: dict[str, str] = {
    "groq": "GROQ_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
    "opencode": "OPENCODE_API_KEY",
    "siliconflow": "SILICONFLOW_API_KEY",
    "runware": "RUNWARE_API_KEY",
    "falai": "FALAI_API_KEY",
}

# DB key name format: "{provider}_api_key"
_DB_KEY = "{}_api_key".format


def resolve_key(provider: str, user_api_keys: dict | None, db=None) -> str | None:
    """Return the best available API key for `provider` or None."""
    if user_api_keys:
        k = user_api_keys.get(provider, "").strip()
        if k:
            return k
    if db is not None:
        try:
            from models import PlatformConfig

            row = db.get(PlatformConfig, _DB_KEY(provider))
            if row and row.value.strip():
                return row.value.strip()
        except Exception:
            pass
    return os.getenv(_ENV_VARS.get(provider, ""), "").strip() or None


def mask_key(key: str | None) -> str | None:
    """Return '••••••••XXXX' (last 4 chars visible) or None when key absent."""
    if not key or len(key) < 5:
        return None
    return "••••••••" + key[-4:]
