"""«Probar conexión» de un proveedor: ¿la clave sirve y cuántos modelos da?

Reutiliza los listados de `provider_listing` (los mismos que el catálogo) y su
clasificación de errores. Devuelve un código estable para la interfaz:
`connected` (con el número de modelos), `no_key`, `invalid_key`,
`rate_limited`, `unreachable`, `error` o `unchecked` (proveedores de imagen, que
no tienen un listado que pedir con la clave).

La clave nunca sale de aquí ni se registra (ver `log_listing_failure`).
"""

from llm.catalog.catalog_refresh import get_full_catalog_entries
from llm.catalog.provider_listing import (
    LISTABLE_PROVIDERS,
    classify_error,
    list_models_with_key,
    log_listing_failure,
)

CONNECTED = "connected"
NO_KEY = "no_key"
UNCHECKED = "unchecked"


def _public_count(provider: str) -> int:
    """Modelos del catálogo de plataforma de `provider` (OpenRouter publica su
    lista sin clave: la clave válida da acceso a todos)."""
    return sum(
        1
        for e in get_full_catalog_entries()
        if e.get("provider") == provider and e.get("active", True)
    )


def check_provider_key(provider: str, api_key: str | None, *, key_source: str) -> dict:
    """Valida `api_key` contra `provider`. Nunca lanza."""
    base = {"provider": provider, "key_source": key_source, "models": None}
    if not api_key:
        return {**base, "code": NO_KEY}
    if provider not in LISTABLE_PROVIDERS:
        return {**base, "code": UNCHECKED}
    try:
        ids = list_models_with_key(provider, api_key)
    except Exception as exc:
        log_listing_failure(provider, exc, context="provider check")
        return {**base, "code": classify_error(exc)}
    count = len(ids) if ids is not None else _public_count(provider)
    return {**base, "code": CONNECTED, "models": count}
