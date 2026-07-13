"""LangGraph tool wrapping the existing generar_texto() LLM router call."""

import structlog

from llm.router import generar_texto

logger = structlog.get_logger(__name__)


def llm_generate(
    prompt: str,
    task: str = "codigo",
    max_tokens: int = 12000,
    llm_config: dict | None = None,
    enabled_models: list | None = None,
) -> str:
    return generar_texto(prompt, task, max_tokens, llm_config, enabled_models)
