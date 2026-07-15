"""Model categorization heuristics: maps raw OpenRouter/Groq modality + model_id
keywords to GenOVA's normalized category set (texto/codigo/razonamiento/etc.)."""

MODALITY_CATEGORY = {
    "text": "texto",
    "multimodal": "multimodal",
    "image": "imagen",
    "embedding": "embedding",
    "audio": "audio",
    "video": "video",
}

# Model-id keywords that identify video-generation models whose declared
# modality is still text->text in the provider listing (e.g. Kling on OpenRouter).
_VIDEO_KEYWORDS = ("video", "kling", "sora", "veo")

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


def categorize_model(api_entry: dict, provider: str = "") -> str:
    del provider  # reservado para reglas por proveedor; la heurística es global
    from llm.catalog.catalog_aptitudes import parse_modality

    category = MODALITY_CATEGORY.get(parse_modality(api_entry), "texto")
    mid = (api_entry.get("id") or "").lower()
    if category in ("texto", "multimodal"):
        if any(kw in mid for kw in _VIDEO_KEYWORDS):
            return "video"
        if any(kw in mid for kw in _CODIGO_KEYWORDS):
            return "codigo"
        if any(kw in mid for kw in _RAZONAMIENTO_KEYWORDS):
            return "razonamiento"
    return category
