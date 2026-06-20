"""Available LLM models curated for Labs experimentation."""

AVAILABLE_MODELS = [
    {"id": "llama-3.3-70b-versatile", "provider": "groq", "label": "Llama 3.3 70B Versatile"},
    {"id": "llama-3.1-8b-instant", "provider": "groq", "label": "Llama 3.1 8B Instant"},
    {"id": "gemma2-9b-it", "provider": "groq", "label": "Gemma 2 9B"},
    {"id": "qwen-qwq-32b", "provider": "groq", "label": "Qwen QwQ 32B"},
    {"id": "openai/gpt-oss-120b", "provider": "groq", "label": "GPT-OSS 120B"},
    {"id": "qwen/qwen3-coder:free", "provider": "openrouter", "label": "Qwen3 Coder (free)"},
    {"id": "google/gemma-3-27b-it:free", "provider": "openrouter", "label": "Gemma 3 27B (free)"},
    {
        "id": "meta-llama/llama-3.3-70b-instruct:free",
        "provider": "openrouter",
        "label": "Llama 3.3 70B OR (free)",
    },
    {"id": "deepseek/deepseek-r1:free", "provider": "openrouter", "label": "DeepSeek R1 (free)"},
]

_FORBIDDEN_CDN = [
    "jsdelivr",
    "cdnjs",
    "unpkg.com",
    "jquery.min.js",
    "bootstrap.min",
    "googleapis.com/ajax",
    "maxcdn",
]
_SCORM_TOKENS = ["_scormInit", "_scormComplete", "cmi.core.lesson_status"]


def quality_check_html(html: str) -> dict:
    """Return {cdn_ok, scorm_ok, min_length_ok, char_count} for generated HTML."""
    low = (html or "").lower()
    return {
        "cdn_ok": not any(pat in low for pat in _FORBIDDEN_CDN),
        "scorm_ok": all(tok in html for tok in _SCORM_TOKENS),
        "min_length_ok": len(html or "") >= 1000,
        "char_count": len(html or ""),
    }
