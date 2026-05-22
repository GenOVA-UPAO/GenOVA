"""LLM catalog and OVA output-directory helpers shared by the OVA routers."""
import os

LLM_CATALOG = [
    {
        "id": "openai",
        "label": "OpenAI",
        "provider": "OpenAI",
        "quality_tier": "high",
        "cost_tier": "medium",
    },
    {
        "id": "gemini",
        "label": "Gemini",
        "provider": "Google",
        "quality_tier": "high",
        "cost_tier": "medium",
    },
    {
        "id": "claude",
        "label": "Claude",
        "provider": "Anthropic",
        "quality_tier": "high",
        "cost_tier": "high",
    },
]


def _enabled_llm_ids() -> set[str]:
    raw_ids = os.getenv("OVA_ENABLED_LLMS", "openai,gemini")
    return {item.strip().lower() for item in raw_ids.split(",") if item.strip()}


def _enabled_llm_options() -> list[dict]:
    allowed_ids = _enabled_llm_ids()
    return [item for item in LLM_CATALOG if item["id"] in allowed_ids]


def _ova_output_dir() -> str:
    default = os.path.join(os.path.dirname(__file__), "..", "scorm_output")
    return os.getenv("OVA_OUTPUT_DIR", default)
