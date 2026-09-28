"""Reglas puras de la lista de modelos habilitados por usuario.

El catálogo completo y los defaults se INYECTAN (users.application no importa
llm). Lanza ValueError con los mensajes exactos que el router traduce a 400.
"""

from __future__ import annotations


def validate_enabled_models(
    payload: list[dict], *, full_entries: list[dict], defaults
) -> list[dict]:
    valid_keys = {(e["provider"], e["model_id"]) for e in full_entries}
    seen: set[tuple[str, str]] = set()
    clean: list[dict] = []
    for item in payload:
        provider = item.get("provider")
        model_id = item.get("model_id")
        if not (provider and model_id):
            continue
        key = (provider, model_id)
        if key in seen:
            continue
        if key not in valid_keys:
            raise ValueError(f"Modelo no reconocido: {provider}/{model_id}")
        seen.add(key)
        clean.append({"provider": provider, "model_id": model_id})

    defaults_keys = {(d["provider"], d["model_id"]) for d in defaults}
    for d in defaults_keys:
        if d not in seen:
            clean.append({"provider": d[0], "model_id": d[1]})

    return clean
