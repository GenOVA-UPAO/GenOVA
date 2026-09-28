"""Caso de uso: listar los usuarios de la plataforma (paginado)."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.dto import AdminUserPage, ListUsersInput
from users.application.ports import AdminUserRepository
from users.domain.admin import AdminUserListFilter, normalize_user_search


@dataclass(frozen=True, slots=True)
class ListUsers:
    repo: AdminUserRepository

    def execute(self, data: ListUsersInput) -> AdminUserPage:
        filters = AdminUserListFilter(
            search=normalize_user_search(data.search),
            role_id=data.role_id,
        )
        total = self.repo.count_users(filters)
        offset = (data.page - 1) * data.limit
        users = self.repo.list_page(filters, offset, data.limit)
        return AdminUserPage(total_items=total, users=users)
