"""Shared scaffolding for the 5E prompt builders.

Every ``prompt_*`` selects a phase-specific template body and appends the
formatted per-user context. ``with_user_context`` centralizes that tail so the
context-append behaviour lives in one place.
"""

from llm.utils.utils import format_contexto_usuario


def with_user_context(base: str, contexto_usuario: str) -> str:
    """Append the formatted user context to a non-empty prompt body.

    Returns ``""`` for an empty/unknown template so callers stay one-liners.
    """
    if not base:
        return ""
    return base + format_contexto_usuario(contexto_usuario)
