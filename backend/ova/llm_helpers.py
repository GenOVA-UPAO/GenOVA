"""LLM catalog and OVA output-directory helpers shared by the OVA routers.

`LLM_CATALOG` exposes the actual generation engines (Groq + OpenRouter) the
backend uses today. Frontend can read `/api/ova/llm-options` to render a
picker; `OVA_ENABLED_LLMS` filters which entries are surfaced (by `id`).
"""
import os

LLM_CATALOG = [
    {
        "id": "groq-llama-3.3-70b",
        "label": "Llama 3.3 70B (Groq)",
        "provider": "Groq",
        "task": "texto",
        "quality_tier": "high",
        "cost_tier": "low",
        "notes": "Generación de texto general (ENGAGE/EXPLORE step 1).",
    },
    {
        "id": "groq-gpt-oss-120b",
        "label": "GPT-OSS 120B (Groq)",
        "provider": "Groq",
        "task": "orquestador",
        "quality_tier": "high",
        "cost_tier": "medium",
        "notes": "Razonamiento + orquestación multi-paso.",
    },
    {
        "id": "groq-qwen3-32b",
        "label": "Qwen3 32B (Groq)",
        "provider": "Groq",
        "task": "razonamiento",
        "quality_tier": "high",
        "cost_tier": "low",
    },
    {
        "id": "openrouter-deepseek-v4-flash",
        "label": "DeepSeek V4 Flash (OpenRouter)",
        "provider": "OpenRouter",
        "task": "codigo",
        "quality_tier": "high",
        "cost_tier": "low",
        "notes": "Generación de HTML/JS interactivo (step 2). LiveCodeBench 91.6 / SWE-bench 79.0. Mejor seguimiento de reglas anidadas.",
    },
]


def _enabled_llm_ids() -> set[str]:
    """Parse OVA_ENABLED_LLMS into a set of catalog IDs. Empty/unset means
    enable everything in the catalog."""
    raw = os.getenv("OVA_ENABLED_LLMS", "").strip()
    if not raw:
        return {item["id"] for item in LLM_CATALOG}
    return {item.strip().lower() for item in raw.split(",") if item.strip()}


def _enabled_llm_options() -> list[dict]:
    allowed = _enabled_llm_ids()
    return [item for item in LLM_CATALOG if item["id"] in allowed]


def _ova_output_dir() -> str:
    default = os.path.join(os.path.dirname(__file__), "..", "scorm_output")
    return os.getenv("OVA_OUTPUT_DIR", default)
