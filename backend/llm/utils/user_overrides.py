"""Qué elecciones de modelo de un usuario se respetan al generar.

Regla de producto: sin clave API propia el usuario genera con los modelos que
fijó el administrador. Con clave propia puede elegir otros, pero se pagan con
su clave; por eso solo cuenta una elección cuyo proveedor tenga la clave del
usuario. Así una elección guardada no pasa a consumir la clave de la
plataforma si el usuario quita su clave o elige un proveedor sin ella. El
administrador ya usa las claves de la plataforma: sus elecciones cuentan siempre.
"""

from __future__ import annotations


def own_key_providers(user_api_keys: dict | None) -> set[str]:
    """Proveedores para los que el usuario guardó una clave no vacía."""
    return {
        provider
        for provider, key in (user_api_keys or {}).items()
        if isinstance(key, str) and key.strip()
    }


def honored_overrides(
    llm_settings: dict | None, user_api_keys: dict | None, *, is_admin: bool
) -> dict:
    """Subconjunto de `llm_settings` que la generación debe respetar."""
    settings = llm_settings or {}
    if is_admin:
        return dict(settings)
    own = own_key_providers(user_api_keys)
    honored: dict[str, dict] = {}
    for tipo, entry in settings.items():
        if not isinstance(entry, dict) or entry.get("provider") not in own:
            continue
        clean = dict(entry)
        fallbacks = entry.get("fallbacks")
        if isinstance(fallbacks, list):
            clean["fallbacks"] = [
                f for f in fallbacks if isinstance(f, dict) and f.get("provider") in own
            ]
        honored[tipo] = clean
    return honored
