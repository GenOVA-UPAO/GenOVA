"""Caso de uso: eliminar cualquier vínculo (administración)."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from users.application.ports import UserLinkRepository


@dataclass(frozen=True, slots=True)
class DeleteAnyLink:
    repo: UserLinkRepository

    def execute(self, link_id: UUID) -> None:
        self.repo.delete_any(link_id)
