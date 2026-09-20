"""Admin endpoint: paginated user listing."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query

from auth.dependencies import require_permission
from core.pagination import page_meta
from models import User
from users.application.dto import ListUsersInput
from users.container import UsersUseCases, build_users
from users.domain.admin import SEARCH_MAX_LENGTH, AdminUserSummary

router = APIRouter(tags=["Admin · Usuarios"])


def _serialize_user(u: AdminUserSummary) -> dict:
    return {
        "id": u.id,
        "email": u.email,
        "full_name": u.full_name or "",
        "university_id": u.university_id,
        "gender": u.gender or "",
        "phone_number": u.phone_number or "",
        "is_active": u.is_active,
        "failed_login_attempts": u.failed_login_attempts,
        "locked_until": u.locked_until,
        "role": {"id": u.role.id, "name": u.role.name} if u.role else None,
        "created_at": u.created_at,
    }


@router.get("", summary="Listar los usuarios de la plataforma")
def get_users(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    search: str = Query(default="", max_length=SEARCH_MAX_LENGTH),
    role_id: UUID | None = Query(default=None),
    _: User = Depends(require_permission("manage_users")),
    users: UsersUseCases = Depends(build_users),
):
    result = users.list_users.execute(
        ListUsersInput(page=page, limit=limit, search=search, role_id=role_id)
    )

    return {
        **page_meta(result.total_items, page, limit),
        "users": [_serialize_user(u) for u in result.users],
    }
