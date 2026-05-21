"""Prompt helpers: base prompts, active-version lookup, AI improvement builder."""
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import PromptVersion

CONCEPT_PH = "{concept}"

# Resource type classification (matches engage/explore router logic)
ENGAGE_CODE    = {10}
ENGAGE_PODCAST = {3}
EXPLORE_CODE   = {1, 6, 10}


def get_base_prompt(phase: str, resource_type: int) -> str:
    """Return hardcoded prompt template with {concept} placeholder."""
    if phase == "engage":
        from agents.engage_prompts import prompt_texto, prompt_simulador
        if resource_type in ENGAGE_CODE:
            return prompt_simulador(CONCEPT_PH)
        return prompt_texto(resource_type, CONCEPT_PH)
    # explore
    from agents.explore_prompts import prompt_texto, prompt_codigo, CODE_ONLY
    if resource_type in CODE_ONLY:
        return prompt_codigo(resource_type, CONCEPT_PH)
    return prompt_texto(resource_type, CONCEPT_PH)


def get_active_prompt(phase: str, resource_type: int, db: Session) -> Optional[str]:
    """Return is_active prompt_text from DB or None (caller falls back to hardcoded)."""
    return db.execute(
        select(PromptVersion.prompt_text)
        .where(PromptVersion.phase == phase)
        .where(PromptVersion.resource_type == resource_type)
        .where(PromptVersion.is_active.is_(True))
    ).scalar_one_or_none()


def build_improve_prompt(
    current_prompt: str, winner_html: str,
    concept: str, phase: str, resource_type: int,
) -> str:
    """Build the meta-prompt sent to the orchestrator LLM for prompt improvement."""
    truncated = winner_html[:3000] + ("...[truncado]" if len(winner_html) > 3000 else "")
    return (
        f"Eres un experto en prompt engineering para recursos educativos HTML5.\n\n"
        f"FASE: {phase.upper()} — Recurso tipo {resource_type}\n"
        f"CONCEPTO: {concept}\n\n"
        f"PROMPT ACTUAL (usa {{concept}} como marcador):\n---\n{current_prompt}\n---\n\n"
        f"HTML GENERADO (seleccionado como mejor resultado):\n---\n{truncated}\n---\n\n"
        "Analiza qué hace bien este HTML y sugiere una versión mejorada del prompt que:\n"
        "1. Conserve {concept} como marcador\n"
        "2. Genere HTML más interactivo y pedagógicamente rico\n"
        "3. Sea más específico en estructura HTML/JS\n"
        "4. Minimice CDN externos o HTML roto\n"
        "5. Incluya siempre _scormInit y _scormComplete\n\n"
        'Responde SOLO con JSON: {"improved_prompt": "...", "explanation": "..."}'
    )
