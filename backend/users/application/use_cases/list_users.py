"""Caso de uso: listar los usuarios de la plataforma (paginado)."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.dto import AdminUserPage, ListUsersInput
from users.application.ports import AdminUserRepository


@dataclass(frozen=True, slots=True)
class ListUsers:
    repo: AdminUserRepository

    def execute(self, data: ListUsersInput) -> AdminUserPage:
        total = self.repo.count_users()
        users = self.repo.list_page(offset=(data.page - 1) * data.limit, limit=data.limit)
        return AdminUserPage(total_items=total, users=users)
