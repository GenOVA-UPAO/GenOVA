"""Límites comunes de los endpoints de un recurso (`/api/agents/<fase>/generate`).

Como al crear un job: el concepto pasa el guardarraíl de entrada (moderación y área
temática), el recurso tiene un presupuesto de reloj y las elecciones de modelo con
clave propia del usuario se pagan con esa clave.
"""

from __future__ import annotations

import time

from fastapi import HTTPException

from core.input_guardrail import prompt_refusal
from llm.utils.llm_helpers import with_owner
from llm.utils.user_overrides import honored_overrides
from prometheus.engine.budget import budget_seconds

# Mismo tope que el prompt de POST /api/jobs (JobCreateRequest.prompt).
CONCEPT_MAX_CHARS = 4000


def assert_concept_allowed(concept: str, user) -> None:
    """400 con el mensaje del guardarraíl si el concepto se rechaza."""
    refusal = prompt_refusal(concept, user.id)
    if refusal is not None:
        raise HTTPException(status_code=400, detail=refusal[1])


def generation_limits(user) -> dict:
    """`llm_config` y `deadline` para `generate_resource`."""
    overrides = honored_overrides(
        getattr(user, "llm_settings", None),
        getattr(user, "user_api_keys", None),
        is_admin=bool(getattr(user, "admin_flag_cached", False)),
    )
    return {
        "llm_config": with_owner(overrides, user.id),
        "deadline": time.monotonic() + budget_seconds(),
    }
