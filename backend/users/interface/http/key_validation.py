"""Valida todas las claves antes de escribir ninguna; rechazos no reemplazan datos."""

from fastapi import HTTPException

from llm.catalog.provider_check import check_provider_key
from users.domain.api_keys import assert_min_key_length, filter_key_updates


def validate_key_updates(payload: dict, providers, *, source: str) -> dict:
    updates = filter_key_updates(payload, providers)
    assert_min_key_length(updates)
    checks = {}
    for provider, key in updates.items():
        result = check_provider_key(provider, key.strip() or None, key_source=source)
        if result["code"] == "invalid_key":
            raise HTTPException(422, detail="Clave no válida. El proveedor la rechazó; se conserva la clave anterior.")
        if result["code"] == "unreachable":
            result = {**result, "code": "unchecked"}
        checks[provider] = result
    return checks
