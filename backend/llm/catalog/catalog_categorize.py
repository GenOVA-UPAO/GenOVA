"""Model categorization heuristics: maps raw OpenRouter/Groq modality + model_id
keywords to GenOVA's normalized category set (texto/codigo/razonamiento/etc.)."""

MODALITY_CATEGORY = {
    "text": "texto",
    "multimodal": "multimodal",
    "image": "imagen",
    "embedding": "embedding",
    "audio": "audio",
}

_CODIGO_KEYWORDS = (
    "coder",
    "code",
    "dev",
    "programming",
    "claude",
    "gpt-4",
    "deepseek",
    "gemini-pro",
    "gemini-flash",
    "o1",
    "o3",
    "o4",
)

_RAZONAMIENTO_KEYWORDS = (
    "r1",
    "reasoning",
    "think",
    "gpt-oss",
    "gpt-5",
)


def categorize_model(api_entry: dict, provider: str) -> str:
    arch = api_entry.get("architecture") or {}
    modality = arch.get("modality", "text") if isinstance(arch, dict) else str(arch)
    category = MODALITY_CATEGORY.get(modality, "texto")
    mid = (api_entry.get("id") or "").lower()
    if category in ("texto", "multimodal"):
        if any(kw in mid for kw in _CODIGO_KEYWORDS):
            return "codigo"
        if any(kw in mid for kw in _RAZONAMIENTO_KEYWORDS):
            return "razonamiento"
    return category
