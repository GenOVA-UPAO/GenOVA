"""Validador mínimo de JSON Schema (subconjunto que usan las plantillas).

Soporta: type (object/array/string/integer/number/boolean), properties,
required, additionalProperties=false, items, minItems, maxItems, enum,
minLength, maxLength. Sin dependencia externa: el subconjunto es lo que se
puede pedir a los proveedores con salida estructurada.

Helpers `obj/arr/s/i` para escribir schemas cortos en las plantillas.
"""

from __future__ import annotations

_TYPES = {
    "object": dict,
    "array": list,
    "string": str,
    "integer": int,
    "number": (int, float),
    "boolean": bool,
}


def validate(data, schema: dict, path: str = "") -> list[str]:  # noqa: C901, PLR0912
    where = path or "(raíz)"
    t = schema.get("type")
    if t and not isinstance(data, _TYPES[t]) or (t in ("integer", "number") and isinstance(data, bool)):
        return [f"{where}: se esperaba {t}"]
    errs: list[str] = []
    if "enum" in schema and data not in schema["enum"]:
        errs.append(f"{where}: debe ser uno de {schema['enum']}")
    if t == "string":
        if len(data.strip()) < schema.get("minLength", 0):
            errs.append(f"{where}: texto demasiado corto")
        if "maxLength" in schema and len(data) > schema["maxLength"] * 1.3:
            errs.append(f"{where}: texto demasiado largo (máx {schema['maxLength']})")
    if t == "array":
        if len(data) < schema.get("minItems", 0):
            errs.append(f"{where}: mínimo {schema['minItems']} elementos")
        if "maxItems" in schema and len(data) > schema["maxItems"]:
            errs.append(f"{where}: máximo {schema['maxItems']} elementos")
        for n, item in enumerate(data):
            errs += validate(item, schema.get("items", {}), f"{path}[{n}]")
    if t == "object":
        for req in schema.get("required", []):
            if req not in data:
                errs.append(f"{where}: falta «{req}»")
        for k, sub in schema.get("properties", {}).items():
            if k in data:
                errs += validate(data[k], sub, f"{path}.{k}" if path else k)
    return errs


def s(max_len: int | None = None, min_len: int = 1, **kw) -> dict:
    out = {"type": "string", "minLength": min_len, **kw}
    if max_len:
        out["maxLength"] = max_len
    return out


def i(**kw) -> dict:
    return {"type": "integer", **kw}


def b() -> dict:
    return {"type": "boolean"}


def arr(items: dict, min_items: int | None = None, max_items: int | None = None) -> dict:
    out = {"type": "array", "items": items}
    if min_items is not None:
        out["minItems"] = min_items
    if max_items is not None:
        out["maxItems"] = max_items
    return out


def obj(**props: dict) -> dict:
    return {
        "type": "object",
        "properties": props,
        "required": list(props),
        "additionalProperties": False,
    }
