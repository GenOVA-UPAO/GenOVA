"""Valoración del docente sobre un recurso generado (políticas y vistas puras)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

RATINGS = frozenset({"up", "down"})
REASONS = frozenset(
    {"contenido_incorrecto", "fuera_de_tema", "diseño", "no_funciona", "muy_largo", "muy_corto", "otro"}
)
COMMENT_MAX = 500


@dataclass(frozen=True, slots=True)
class ResourceFeedback:
    phase_id: str
    phase: str
    resource_type: str | None
    template_key: str | None
    params: dict
    rating: str
    reason: str | None
    comment: str | None
    updated_at: datetime | None


@dataclass(frozen=True, slots=True)
class ResourceFeedbackDraft:
    user_id: str
    ova_id: str
    phase_id: str
    phase: str
    resource_type: str | None
    template_key: str | None
    params: dict
    rating: str
    reason: str | None
    comment: str | None
