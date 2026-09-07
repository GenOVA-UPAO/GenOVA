"""Caso de uso: eliminar un vínculo propio."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from users.application.ports import UserLinkRepository


@dataclass(frozen=True, slots=True)
class DeleteMyLink:
    repo: UserLinkRepository

    def execute(self, owner_id, link_id: UUID) -> None:
        self.repo.delete_owned(link_id, owner_id)
