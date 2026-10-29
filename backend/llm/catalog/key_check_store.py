"""Última comprobación vinculada a la clave exacta mediante hash, nunca en claro."""

import hashlib
import json

from models import PlatformConfig


def save_check(db, provider: str, key: str | None, result: dict) -> None:
    name = f"{provider}_key_check"
    value = json.dumps({"fingerprint": hashlib.sha256((key or "").encode()).hexdigest(), "result": result})
    row = db.get(PlatformConfig, name)
    if row is None:
        db.add(PlatformConfig(key=name, value=value))
    else:
        row.value = value
    db.commit()


def platform_checks(db, providers) -> dict:
    from llm.clients.key_resolver import resolve_platform_key

    checks = {}
    for provider in providers:
        key, source = resolve_platform_key(provider, db)
        result = {"provider": provider, "code": "unchecked" if key else "no_key", "key_source": source, "models": None}
        row = db.get(PlatformConfig, f"{provider}_key_check")
        if row:
            try:
                stored = json.loads(row.value)
                if stored["fingerprint"] == hashlib.sha256((key or "").encode()).hexdigest():
                    result = stored["result"]
            except (ValueError, KeyError):
                pass  # fila corrupta o de otro formato: se trata como «sin comprobar»
        checks[provider] = result
    return checks
