"""Builds the full in-memory model catalog from provider API data.

Extracted from catalog_refresh_providers to keep file sizes under 200 lines.
"""

from llm.catalog.catalog_aptitudes import aptitudes_for
from llm.catalog.catalog_categorize import categorize_model
from llm.catalog.catalog_pricing import format_pricing, format_pricing_detail
from llm.catalog.model_catalog import CATALOG_ENTRIES

# Groq no daba el contexto de cada modelo: sin sus datos se sigue suponiendo este.
_GROQ_DEFAULT_CONTEXT = 128000


def groq_modality(meta: dict | None) -> str:
    """«text+image->text» a partir de las modalidades que declara Groq (o «text»)."""
    meta = meta or {}
    inputs = [str(m).lower() for m in meta.get("input_modalities") or []]
    outputs = [str(m).lower() for m in meta.get("output_modalities") or []]
    if not inputs and not outputs:
        return "text"
    return "+".join(inputs or ["text"]) + "->" + "+".join(outputs or ["text"])


def _groq_row(model_id: str, meta: dict | None, curated: bool) -> dict:
    """Fila de un modelo de Groq. Su API declara nombre, modalidades y contexto:
    sin ellos, Orpheus (voz) y Whisper (transcripción) salían como modelos de
    texto «de 128k» y con el id por nombre."""
    meta = meta or {}
    modality = groq_modality(meta)
    context = meta.get("context_length") or meta.get("context_window")
    return {
        "provider": "groq",
        "model_id": model_id,
        "label": str(meta.get("name") or model_id),
        "description": "",
        "category": categorize_model(
            {"id": model_id, "architecture": {"modality": modality}}, "groq"
        ),
        "modality": modality,
        "pricing": None,
        "pricing_detail": None,
        "context_length": context if isinstance(context, int) else _GROQ_DEFAULT_CONTEXT,
        "curated": curated,
        "active": True,
        "task": "texto" if curated else None,
    }


def _build_full_catalog(
    or_data: dict[str, dict],
    groq_ids: set[str] | dict[str, dict],
    opencode_ids: set[str] | None = None,
    hf_ids: set[str] | None = None,
) -> list[dict]:
    curated_keys = {(e["provider"], e["model_id"]) for e in CATALOG_ENTRIES}
    result: list[dict] = []

    for model_id, raw in or_data.items():
        curated = ("openrouter", model_id) in curated_keys
        arch = raw.get("architecture") or {}
        modality = arch.get("modality", "text") if isinstance(arch, dict) else "text"
        pricing = raw.get("pricing")
        result.append({
            "provider": "openrouter",
            "model_id": model_id,
            "label": raw.get("name") or model_id,
            "description": (raw.get("description") or "").strip()[:200],
            "category": categorize_model(raw, "openrouter"),
            "modality": modality,
            "pricing": format_pricing(pricing),
            "pricing_detail": format_pricing_detail(pricing),
            "context_length": raw.get("context_length"),
            "curated": curated,
            "active": True,
            "task": "codigo" if curated else None,
        })

    for model_id in groq_ids:
        meta = groq_ids.get(model_id) if isinstance(groq_ids, dict) else None
        result.append(_groq_row(model_id, meta, ("groq", model_id) in curated_keys))

    if opencode_ids is not None:
        curated_oc = {e["model_id"] for e in CATALOG_ENTRIES if e["provider"] == "opencode"}
        for model_id in opencode_ids:
            curated = model_id in curated_oc
            result.append({
                "provider": "opencode",
                "model_id": model_id,
                "label": model_id,
                "description": "",
                "category": "codigo",
                "modality": "text",
                "pricing": None,
                "pricing_detail": None,
                "context_length": None,
                "curated": curated,
                "active": True,
                "task": "codigo" if curated else None,
            })
    else:
        for entry in CATALOG_ENTRIES:
            if entry["provider"] not in ("openrouter", "groq") and entry["active"]:
                result.append({
                    "provider": entry["provider"],
                    "model_id": entry["model_id"],
                    "label": entry["label"],
                    "description": "",
                    "category": entry.get("task") or "codigo",
                    "modality": entry.get("modality", "text"),
                    "pricing": entry.get("pricing"),
                    "pricing_detail": None,
                    "context_length": entry.get("context_length"),
                    "curated": (entry["provider"], entry["model_id"]) in curated_keys,
                    "active": True,
                    "task": entry.get("task"),
                })

    if hf_ids:
        curated_hf = {e["model_id"] for e in CATALOG_ENTRIES if e["provider"] == "huggingface"}
        for model_id in hf_ids:
            result.append({
                "provider": "huggingface",
                "model_id": model_id,
                "label": model_id,
                "description": "",
                "category": "texto",
                "modality": "text",
                "pricing": "Gratuito",
                "pricing_detail": None,
                "context_length": None,
                "curated": model_id in curated_hf,
                "active": True,
                "task": None,
            })

    result.sort(key=lambda e: (not e["curated"], e["provider"], e["model_id"]))
    for e in result:
        e["aptitudes"] = aptitudes_for(e["category"], str(e.get("modality") or "text"))
    return result
