"""Single source of truth for LLM/image provider identifiers.

Subsets are derived from one canonical list so the text-config validators,
the API-key slots and the env-var lookup never drift apart again.
"""

# Every provider that can hold an API key (text + image generation).
ALL_PROVIDERS = (
    "groq",
    "openrouter",
    "opencode",
    "siliconflow",
    "runware",
    "falai",
    "huggingface",
)

# Providers usable for text generation / per-task LLM config.
TEXT_PROVIDERS = ("groq", "openrouter", "opencode", "huggingface")

# provider -> environment variable holding its API key.
ENV_VARS: dict[str, str] = {
    "groq": "GROQ_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
    "opencode": "OPENCODE_API_KEY",
    "siliconflow": "SILICONFLOW_API_KEY",
    "runware": "RUNWARE_API_KEY",
    "falai": "FALAI_API_KEY",
    "huggingface": "HF_TOKEN",
}
