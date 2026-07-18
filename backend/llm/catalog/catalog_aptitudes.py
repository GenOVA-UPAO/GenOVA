"""Derive task aptitudes from category/modality so multimodal models can
serve more than one assignment task (HU-034 R5 / D7)."""

from __future__ import annotations

# Canonical catalog categories (always filterable in UI).
CANONICAL_TYPES = (
    "texto",
    "codigo",
    "razonamiento",
    "multimodal",
    "imagen",
    "video",
    "embedding",
    "audio",
)

# category → default aptitudes for assignment pools.
_CATEGORY_APTITUDES: dict[str, tuple[str, ...]] = {
    # General text LLMs can cover orchestration + reasoning assignment slots.
    "texto": ("texto", "orquestador", "razonamiento"),
    "codigo": ("codigo",),
    "razonamiento": ("razonamiento", "texto"),
    "imagen": ("imagen",),
    "video": ("video",),
    "embedding": ("embedding",),
    "audio": ("audio",),
    "multimodal": ("texto", "imagen"),  # refined by modality parsing
}


def _normalize_modality(raw: str | None) -> str:
    """Collapse OpenRouter-style 'text+image->text' into a coarse modality key."""
    if not raw:
        return "text"
    m = raw.lower().strip()
    if m in ("text", "multimodal", "image", "embedding", "audio", "video"):
        return m
    # OpenRouter: "text+image->text", "text->image", "text->video", …
    left, _, right = m.partition("->")
    inputs = {p.strip() for p in left.replace("+", ",").split(",") if p.strip()}
    outputs = (
        {p.strip() for p in right.replace("+", ",").split(",") if p.strip()} if right else set()
    )
    if "video" in outputs:
        return "video"
    if "video" in inputs:
        if "text" in inputs or "text" in outputs or len(inputs | outputs) > 1:
            return "multimodal"
        return "video"
    if "image" in outputs and "text" not in outputs and len(outputs) <= 1:
        return "image"
    if "embedding" in outputs or "embeddings" in m:
        return "embedding"
    if "audio" in inputs or "audio" in outputs:
        if "text" in inputs or "text" in outputs:
            return "multimodal"
        return "audio"
    if "image" in inputs or ("image" in outputs and "text" in outputs):
        return "multimodal"
    return "text"


def parse_modality(api_entry: dict | None) -> str:
    """Extract normalized modality from a provider API entry."""
    if not api_entry:
        return "text"
    arch = api_entry.get("architecture") or {}
    if isinstance(arch, dict):
        raw = arch.get("modality") or arch.get("output_modality")
        if raw:
            return _normalize_modality(str(raw))
        outs = arch.get("output_modalities") or []
        inns = arch.get("input_modalities") or []
        if outs or inns:
            combo = "+".join(inns) + "->" + "+".join(outs)
            return _normalize_modality(combo)
    return _normalize_modality(str(api_entry.get("modality") or "text"))


def aptitudes_for(
    category: str, modality: str = "text", api_entry: dict | None = None
) -> list[str]:
    """Return ordered aptitudes (task keys) this catalog entry can serve."""
    cat = category or "texto"
    if cat != "multimodal":
        return list(_CATEGORY_APTITUDES.get(cat, (cat,)))

    apt: list[str] = []
    arch = (api_entry or {}).get("architecture") or {}
    inns: set[str] = set()
    outs: set[str] = set()
    if isinstance(arch, dict):
        inns = {str(x).lower() for x in (arch.get("input_modalities") or [])}
        outs = {str(x).lower() for x in (arch.get("output_modalities") or [])}

    if inns or outs:
        if "text" in inns or "text" in outs:
            apt.append("texto")
        if "image" in inns or "image" in outs:
            apt.append("imagen")
        if "video" in inns or "video" in outs:
            apt.append("video")
        if "audio" in inns or "audio" in outs:
            apt.append("audio")
    else:
        mod = modality or parse_modality(api_entry)
        apt.extend(_CATEGORY_APTITUDES["multimodal"])
        if mod == "video":
            apt = ["video", "texto"]
        elif mod == "audio":
            apt = ["audio", "texto"]

    if not apt:
        apt = list(_CATEGORY_APTITUDES["multimodal"])

    seen: set[str] = set()
    ordered: list[str] = []
    for a in apt:
        if a not in seen:
            seen.add(a)
            ordered.append(a)
    return ordered


def models_apt_for_task(entries: list[dict], task: str) -> list[dict]:
    """Filter catalog entries that are apt for an assignment task (HU-035 hook)."""
    return [e for e in entries if task in (e.get("aptitudes") or [])]
