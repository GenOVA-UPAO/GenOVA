"""Caso de uso: listar todos los vínculos (administración)."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.dto import LinkAdminListResult
from users.application.ports import UserLinkRepository


@dataclass(frozen=True, slots=True)
class ListAllLinks:
    repo: UserLinkRepository

    def execute(self) -> LinkAdminListResult:
        links, participants = self.repo.list_all()
        return LinkAdminListResult(links=links, participants=participants)
