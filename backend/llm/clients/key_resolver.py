"""API key resolution: user key → inherited key → platform DB key → env var.

Priority chain for every provider:
  1. User's own key (user_api_keys[provider])
  2. Linked owner's key when user has an active link and no own key
  3. Platform key set by an admin (platform_config table)
  4. Env var (GROQ_API_KEY, OPENROUTER_API_KEY, …)
"""

import logging
import os

logger = logging.getLogger(__name__)

PROVIDERS = ("groq", "openrouter", "opencode", "siliconflow", "runware", "falai", "huggingface")

_ENV_VARS: dict[str, str] = {
    "groq": "GROQ_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
    "opencode": "OPENCODE_API_KEY",
    "siliconflow": "SILICONFLOW_API_KEY",
    "runware": "RUNWARE_API_KEY",
    "falai": "FALAI_API_KEY",
    "huggingface": "HF_TOKEN",
}

# DB key name format: "{provider}_api_key"
_DB_KEY = "{}_api_key".format


def _inherited_key(provider: str, user_id, db) -> str | None:
    if db is None or user_id is None:
        return None
    try:
        from sqlalchemy import select

        from models import User, UserLink

        link = (
            db.execute(
                select(UserLink).where(
                    UserLink.linked_user_id == user_id,
                    UserLink.status == "active",
                )
            )
            .scalars()
            .first()
        )
        if not link:
            return None
        owner = db.get(User, link.owner_user_id)
        if not owner:
            return None
        key = (owner.user_api_keys or {}).get(provider, "").strip()
        return key or None
    except Exception:
        logger.warning(
            "_inherited_key: DB error for user_id=%s provider=%s", user_id, provider, exc_info=True
        )
        return None


def resolve_key(provider: str, user_api_keys: dict | None, db=None, user_id=None) -> str | None:
    """Return the best available API key for `provider` or None."""
    if user_api_keys:
        k = user_api_keys.get(provider, "").strip()
        if k:
            return k
    inherited = _inherited_key(provider, user_id, db)
    if inherited:
        return inherited
    if db is not None:
        try:
            from models import PlatformConfig

            row = db.get(PlatformConfig, _DB_KEY(provider))
            if row and row.value.strip():
                return row.value.strip()
        except Exception:
            # DB unavailable/misconfigured → fall back to the env var below.
            pass
    return os.getenv(_ENV_VARS.get(provider, ""), "").strip() or None


def mask_key(key: str | None) -> str | None:
    """Return '••••••••XXXX' (last 4 chars visible) or None when key absent."""
    if not key or len(key) < 5:
        return None
    return "••••••••" + key[-4:]
