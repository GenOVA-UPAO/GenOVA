"""Filtros SQL del listado administrativo. El término llega ya normalizado."""

from __future__ import annotations

from sqlalchemy import exists, func, or_, select
from sqlalchemy.sql import ColumnElement, Select

from models import User, UserRole
from users.domain.admin import ACCENT_FROM, ACCENT_TO, AdminUserListFilter

_LIKE_ESCAPE = "\\"


def like_contains(term: str) -> str:
    """Patrón LIKE con wildcards del usuario escapados (valor ligado, no SQL)."""
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def folded_column(column: ColumnElement) -> ColumnElement:
    return func.lower(func.translate(func.coalesce(column, ""), ACCENT_FROM, ACCENT_TO))


def apply_admin_user_filters(query: Select, filters: AdminUserListFilter) -> Select:
    if filters.search:
        pattern = like_contains(filters.search)
        query = query.where(
            or_(
                folded_column(User.email).like(pattern, escape=_LIKE_ESCAPE),
                folded_column(User.full_name).like(pattern, escape=_LIKE_ESCAPE),
            )
        )
    if filters.role_id is not None:
        query = query.where(
            exists(
                select(UserRole.user_id).where(
                    UserRole.user_id == User.id,
                    UserRole.role_id == filters.role_id,
                )
            )
        )
    return query
