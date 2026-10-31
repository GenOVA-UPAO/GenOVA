"""Resolve image/video generation settings from llm_config (+ legacy ova_settings).

HU-035: pipeline consumes the imagen chain from platform llm_config; one-shot
legacy map from ``ova_settings.image_*`` when the chain is still empty.
"""

from __future__ import annotations

import os
import uuid

import structlog

from llm.utils import llm_config_store

logger = structlog.get_logger(__name__)

_DEFAULT_MAX = int(os.getenv("OVA_MAX_GENERATED_IMAGES", "2"))
# Autor del job: de quién son las claves propias o heredadas al generar.
OWNER_KEY = "owner_id"
# Eslabón elegido por el usuario: solo se paga con su clave (propia o heredada).
USER_KEY_ONLY = "user_key_only"


def legacy_image_entry(ova_settings: dict | None) -> tuple[dict | None, bool]:
    """Map ova_settings.image_* → (entry|None, enabled).

    ``image_provider == "none"`` → disabled. Missing provider → no legacy entry.
    """
    s = ova_settings or {}
    provider = s.get("image_provider")
    if provider is None:
        return None, True
    if provider in ("", "none"):
        return None, False
    model = s.get("image_model")
    if not model:
        return {"provider": provider, "model_id": provider, "extra": {}}, True
    return {"provider": provider, "model_id": model, "extra": {}}, True


def imagen_chain(stored: dict | None = None, ova_settings: dict | None = None) -> list[dict]:
    """Primary + fallbacks for imagen; legacy ova_settings if store empty."""
    data = stored if stored is not None else llm_config_store.stored_cached()
    defaults = (data or {}).get("defaults") or {}
    fallbacks = (data or {}).get("fallbacks") or {}
    chain: list[dict] = []
    primary = defaults.get("imagen")
    if isinstance(primary, dict) and primary.get("provider") and primary.get("model_id"):
        chain.append(primary)
    for fb in fallbacks.get("imagen") or []:
        if isinstance(fb, dict) and fb.get("provider") and fb.get("model_id"):
            chain.append(fb)
    if chain:
        return chain
    legacy, _ = legacy_image_entry(ova_settings)
    return [legacy] if legacy else []


def video_chain(stored: dict | None = None) -> list[dict]:
    """Primary + fallbacks for video task (empty if unconfigured)."""
    data = stored if stored is not None else llm_config_store.stored_cached()
    defaults = (data or {}).get("defaults") or {}
    fallbacks = (data or {}).get("fallbacks") or {}
    chain: list[dict] = []
    primary = defaults.get("video")
    if isinstance(primary, dict) and primary.get("provider") and primary.get("model_id"):
        chain.append(primary)
    for fb in fallbacks.get("video") or []:
        if isinstance(fb, dict) and fb.get("provider") and fb.get("model_id"):
            chain.append(fb)
    return chain


def build_image_settings(
    *,
    ova_settings: dict | None,
    user_api_keys: dict | None,
    db,
    user_id=None,
) -> dict:
    """Settings for enrich_with_images: respects generation_enabled + chain.

    No lleva claves: estos settings se guardan en ``OvaJob.params`` y en el
    estado del grafo. Solo el autor (``owner_id``); la clave se resuelve al
    generar cada imagen (:func:`with_resolved_keys`), así una clave rotada,
    borrada o un vínculo revocado dejan de usarse también al reanudar.

    Regla de producto (``llm/utils/user_overrides.py``): la elección del propio
    usuario (``ova_settings.image_*``, sin cadena del admin) solo se respeta si
    la paga su clave (propia o heredada); nunca la de plataforma.
    """
    stored = llm_config_store.stored_cached()
    flags_raw = (stored or {}).get("generation_enabled")
    if flags_raw is None and (ova_settings or {}).get("image_provider") == "none":
        enabled = False
    else:
        enabled = llm_config_store.generation_enabled("imagen", stored)

    chain = imagen_chain(stored, None)
    if not chain:
        chain = _user_paid_legacy(ova_settings, user_api_keys, db, user_id)
    max_images = int((ova_settings or {}).get("max_images", _DEFAULT_MAX))
    if not enabled or max_images <= 0 or not chain:
        return {
            "max_images": 0,
            "provider": "none",
            "image_model": None,
            "chain": [],
            "enabled": False,
        }

    primary = chain[0]
    return {
        "max_images": max_images,
        "provider": primary["provider"],
        "image_model": primary.get("model_id"),
        "chain": [dict(entry) for entry in chain],
        "enabled": True,
        OWNER_KEY: str(user_id) if user_id else None,
    }


def _user_paid_legacy(ova_settings, user_api_keys, db, user_id) -> list[dict]:
    """[entrada legacy] si el usuario tiene clave (propia o heredada) para pagarla, si no []."""
    legacy, _ = legacy_image_entry(ova_settings)
    if not legacy:
        return []
    from llm.clients.key_resolver import resolve_user_key

    if not resolve_user_key(legacy["provider"], user_api_keys, db, user_id):
        logger.info("legacy image choice ignored: no user key", provider=legacy["provider"])
        return []
    return [{**legacy, USER_KEY_ONLY: True}]


def strip_image_keys(settings: dict | None, owner_id=None) -> dict:
    """Copia de ``settings`` sin claves (jobs creados antes de no guardarlas).

    Marca al autor para que la clave se resuelva al usarla, como en los nuevos.
    """
    if not settings:
        return {}
    clean = {k: v for k, v in settings.items() if k != "api_key"}
    if isinstance(clean.get("chain"), list):
        clean["chain"] = [
            {k: v for k, v in e.items() if k != "api_key"} if isinstance(e, dict) else e
            for e in clean["chain"]
        ]
    if clean.get("enabled") is not False and not clean.get(OWNER_KEY) and owner_id:
        clean[OWNER_KEY] = str(owner_id)
    return clean


def with_resolved_keys(settings: dict) -> dict:
    """Copia en memoria de ``settings`` con la clave de cada eslabón resuelta ahora.

    Orden de :func:`resolve_key`: propia del autor, heredada, plataforma, entorno.
    Solo para settings de :func:`build_image_settings` (llevan ``owner_id``); los
    demás (tests, LOCAL_IMAGE_URL) se devuelven tal cual. Nunca se persiste.
    """
    if OWNER_KEY not in settings or not settings.get("chain"):
        return settings
    from core.database import SessionLocal
    from llm.clients.clients import get_user_keys
    from llm.clients.key_resolver import resolve_key, resolve_user_key

    owner = settings.get(OWNER_KEY)
    owner_uuid = _as_uuid(owner)
    keys = get_user_keys(str(owner_uuid)) if owner_uuid else {}
    db = SessionLocal()
    try:
        chain = [
            {**e, "api_key": (resolve_user_key if e.get(USER_KEY_ONLY) else resolve_key)(
                e["provider"], keys, db, owner_uuid
            )}
            for e in settings["chain"]
            if isinstance(e, dict) and e.get("provider")
        ]
    finally:
        db.close()
    return {**settings, "chain": chain, "api_key": chain[0]["api_key"] if chain else None}


def _as_uuid(value):
    try:
        return uuid.UUID(str(value)) if value else None
    except ValueError:
        return None


def should_generate_video(stored: dict | None = None) -> bool:
    """Video generation off by default; on only when switch + chain present."""
    data = stored if stored is not None else llm_config_store.stored_cached()
    if not llm_config_store.generation_enabled("video", data):
        return False
    return bool(video_chain(data))
