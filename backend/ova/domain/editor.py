"""Políticas y vistas puras del editor de OVAs."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

MAX_PHASES_PER_TYPE = 4
SUBELEMENT_SUPPORTED_TYPES: frozenset[str] = frozenset()
PLACEHOLDER_CONTENT = (
    "Este recurso fue creado mediante prompt y está pendiente de regeneración.\n"
    "Usa 'Regenerar' con tu prompt para generar el contenido real."
)


@dataclass(frozen=True, slots=True)
class EditorOva:
    id: str
    owner_id: str
    title: str
    description: str | None
    status: str


@dataclass(frozen=True, slots=True)
class EditorPhase:
    id: str
    phase_type: str
    phase_order: int
    content: str
    regenerated: bool
    resource_type_id: int | None
    title: str | None


@dataclass(frozen=True, slots=True)
class EditorVersion:
    id: str
    version_number: int
    prompt: str
    is_active: bool
    created_at: datetime | None
    phases: tuple[EditorPhase, ...] = ()


def phase_to_dict(phase: EditorPhase) -> dict:
    return {
        "id": phase.id,
        "phase_type": phase.phase_type,
        "phase_order": phase.phase_order,
        "content": phase.content,
        "regenerated": phase.regenerated,
        "resource_type_id": phase.resource_type_id,
        "title": phase.title,
    }


def version_to_dict(version: EditorVersion, include_phases: bool = False) -> dict:
    data = {
        "id": version.id,
        "version_number": version.version_number,
        "prompt": version.prompt,
        "is_active": version.is_active,
        "created_at": version.created_at.isoformat() if version.created_at else None,
    }
    if include_phases:
        data["phases"] = [phase_to_dict(phase) for phase in version.phases]
    return data


def placeholder_content(prompt: str) -> str:
    return f"[Generado con prompt: {prompt.strip()}]\n\n{PLACEHOLDER_CONTENT}"
