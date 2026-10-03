"""Caso de uso: Confirmar y persistir cambios en una nueva micro-versión de fase."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from editor.application.dto import ConfirmAndApplyInput
from editor.application.ports import EditorPhaseRepositoryPort
from editor.domain.errors import EditorDomainError
from editor.domain.render import render_blocks_to_html


@dataclass(frozen=True, slots=True)
class ConfirmAndApplyUseCase:
    phase_repo: EditorPhaseRepositoryPort

    def execute(self, params: ConfirmAndApplyInput) -> dict[str, Any]:
        if not self.phase_repo.can_edit(params.ova_id, params.actor_id, params.is_admin):
            raise EditorDomainError("No tienes permisos para editar este OVA.")

        html_content = render_blocks_to_html(params.blocks)

        result = self.phase_repo.update_phase_and_create_version(
            ova_id=params.ova_id,
            phase_id=params.phase_id,
            html_content=html_content,
            instruction=params.instruction,
        )
        return {
            "success": True,
            "message": "Fase actualizada y nueva micro-versión registrada.",
            "html": html_content,
            **result,
        }
