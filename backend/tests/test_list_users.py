"""Listado admin de usuarios: filtros de búsqueda/rol y paginación del total filtrado."""

from __future__ import annotations

from uuid import UUID, uuid4

from users.application.dto import ListUsersInput
from users.application.use_cases.list_users import ListUsers
from users.domain.admin import (
    SEARCH_MAX_LENGTH,
    AdminRoleSummary,
    AdminUserListFilter,
    AdminUserSummary,
    normalize_user_search,
)

ADMIN_ROLE_ID = uuid4()
STUDENT_ROLE_ID = uuid4()
ADMIN_ROLE = AdminRoleSummary(id=str(ADMIN_ROLE_ID), name="administrador")
STUDENT_ROLE = AdminRoleSummary(id=str(STUDENT_ROLE_ID), name="estudiante")


def _summary(
    email: str,
    full_name: str | None,
    role: AdminRoleSummary | None,
) -> AdminUserSummary:
    return AdminUserSummary(
        id=str(uuid4()),
        email=email,
        full_name=full_name,
        university_id=None,
        gender=None,
        phone_number=None,
        is_active=True,
        failed_login_attempts=0,
        locked_until=None,
        role=role,
        created_at="2026-01-01T00:00:00",
    )


class _Row:
    def __init__(
        self,
        email: str,
        full_name: str | None,
        role: AdminRoleSummary | None,
        role_id: UUID | None,
    ) -> None:
        self.email = email
        self.full_name = full_name
        self.role_id = role_id
        self.summary = _summary(email, full_name, role)


class FakeAdminRepo:
    """Filtra en memoria el mismo contrato que el repositorio SQL."""

    def __init__(self, rows: list[_Row]) -> None:
        self.rows = rows
        self.last_filters: AdminUserListFilter | None = None
        self.last_offset: int | None = None
        self.last_limit: int | None = None

    def count_users(self, filters: AdminUserListFilter) -> int:
        return len(self._match(filters))

    def list_page(
        self, filters: AdminUserListFilter, offset: int, limit: int
    ) -> list[AdminUserSummary]:
        self.last_filters = filters
        self.last_offset = offset
        self.last_limit = limit
        return [row.summary for row in self._match(filters)[offset : offset + limit]]

    def _match(self, filters: AdminUserListFilter) -> list[_Row]:
        matched: list[_Row] = []
        for row in self.rows:
            if filters.role_id is not None and row.role_id != filters.role_id:
                continue
            if filters.search:
                email_fold = normalize_user_search(row.email)
                name_fold = normalize_user_search(row.full_name or "")
                if filters.search not in email_fold and filters.search not in name_fold:
                    continue
            matched.append(row)
        return matched


def _numbered_students(count: int) -> list[_Row]:
    return [
        _Row(f"alumno{i:02d}@upao.edu", f"Alumno {i:02d}", STUDENT_ROLE, STUDENT_ROLE_ID)
        for i in range(count)
    ]


def test_normalize_user_search_folds_accents_and_case() -> None:
    assert normalize_user_search("  José  ") == "jose"
    assert normalize_user_search("ADMIN@Genova.AI") == "admin@genova.ai"
    assert normalize_user_search(None) == ""
    assert normalize_user_search("   ") == ""
    assert len(normalize_user_search("x" * 500)) == SEARCH_MAX_LENGTH


def test_search_finds_user_outside_first_page() -> None:
    hidden = _Row("admin@genova.ai", "Admin GenOVA", ADMIN_ROLE, ADMIN_ROLE_ID)
    repo = FakeAdminRepo(_numbered_students(12) + [hidden])
    result = ListUsers(repo).execute(ListUsersInput(page=1, limit=10, search="admin@genova.ai"))

    assert result.total_items == 1
    assert [user.email for user in result.users] == ["admin@genova.ai"]
    assert repo.last_offset == 0
    assert repo.last_limit == 10
    assert repo.last_filters is not None
    assert repo.last_filters.search == "admin@genova.ai"


def test_search_without_results_reports_total_zero() -> None:
    repo = FakeAdminRepo(_numbered_students(15))
    result = ListUsers(repo).execute(ListUsersInput(page=1, limit=10, search="nadie-existe"))

    assert result.total_items == 0
    assert result.users == []


def test_filter_by_role_uses_filtered_total() -> None:
    admins = [_Row(f"admin{i}@genova.ai", f"Admin {i}", ADMIN_ROLE, ADMIN_ROLE_ID) for i in range(3)]
    repo = FakeAdminRepo(_numbered_students(12) + admins)
    result = ListUsers(repo).execute(
        ListUsersInput(page=1, limit=10, role_id=ADMIN_ROLE_ID)
    )

    assert result.total_items == 3
    assert {user.role.name if user.role else "" for user in result.users} == {"administrador"}


def test_search_and_page_paginate_filtered_matches() -> None:
    repo = FakeAdminRepo(_numbered_students(25))
    result = ListUsers(repo).execute(ListUsersInput(page=2, limit=10, search="alumno"))

    assert result.total_items == 25
    assert repo.last_offset == 10
    assert repo.last_limit == 10
    assert len(result.users) == 10
    assert result.users[0].email == "alumno10@upao.edu"


def test_accented_name_matches_unaccented_search() -> None:
    jose = _Row("jose@upao.edu", "José García", STUDENT_ROLE, STUDENT_ROLE_ID)
    repo = FakeAdminRepo(_numbered_students(11) + [jose])
    result = ListUsers(repo).execute(ListUsersInput(page=1, limit=10, search="jose"))

    assert result.total_items == 1
    assert result.users[0].full_name == "José García"
