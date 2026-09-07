"""Reglas puras de las claves de API por usuario.

El filtro de providers, la longitud mínima y la fusión de upsert/borrado
viven aquí; el enmascarado (`mask_key`) y el almacenamiento en infrastructure
para que la clave en claro NUNCA cruce hacia application/interface.
"""

from __future__ import annotations

from users.domain.errors import ApiKeyTooShort, InvalidApiKeyPayload

MIN_KEY_LEN = 8


def filter_key_updates(payload: dict, providers) -> dict:
    """Deja solo providers conocidos con valor str; exige al menos uno."""
    updates = {k: v for k, v in payload.items() if k in providers and isinstance(v, str)}
    if not updates:
        raise InvalidApiKeyPayload(
            f"Payload must contain at least one key from: {', '.join(providers)}"
        )
    return updates


def assert_min_key_length(updates: dict, min_len: int = MIN_KEY_LEN) -> None:
    for provider, value in updates.items():
        if value and len(value.strip()) < min_len:
            raise ApiKeyTooShort(
                f"La API key para '{provider}' es demasiado corta (mínimo {min_len} caracteres)."
            )


def merge_api_keys(current: dict, updates: dict) -> dict:
    """Upsert: valor con contenido reemplaza; valor vacío elimina la clave."""
    merged = dict(current)
    for provider, value in updates.items():
        if value.strip():
            merged[provider] = value.strip()
        else:
            merged.pop(provider, None)
    return merged
