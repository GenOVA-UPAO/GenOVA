"""Caso de uso: listar los vínculos propios."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.dto import LinkListResult
from users.application.ports import UserLinkRepository


@dataclass(frozen=True, slots=True)
class ListMyLinks:
    repo: UserLinkRepository

    def execute(self, owner_id) -> LinkListResult:
        links, linked_map = self.repo.list_for_owner(owner_id)
        return LinkListResult(links=links, linked_map=linked_map)
