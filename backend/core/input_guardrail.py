"""Guardarraíl de entrada (moderación y área temática) sin importar `generation`.

`generation` sabe aplicar el guardarraíl configurado; `llm` (las vistas previas de
fase) no puede importarlo (import-linter). `main.py` registra aquí el comprobador
al arrancar y quien necesite filtrar un prompt llama a `prompt_refusal()`.
Sin comprobador no se bloquea nada (tests y scripts).
"""

from __future__ import annotations

from collections.abc import Callable

# (prompt, user_id) → None si se permite, o (código, mensaje público) si se rechaza.
Checker = Callable[[str, object], tuple[str, str] | None]

_checker: Checker | None = None


def set_input_guardrail(checker: Checker | None) -> None:
    global _checker
    _checker = checker


def prompt_refusal(prompt: str, user_id: object) -> tuple[str, str] | None:
    """Motivo del rechazo de `prompt`, o None si se permite (o no hay comprobador)."""
    if _checker is None:
        return None
    return _checker(prompt, user_id)
