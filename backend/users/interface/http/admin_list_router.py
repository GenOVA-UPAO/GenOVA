"""Admin endpoint: paginated user listing."""

from fastapi import APIRouter, Depends

from auth.dependencies import require_permission
from core.pagination import page_meta
from models import User
from users.application.dto import ListUsersInput
from users.container import UsersUseCases, build_users
from users.domain.admin import AdminUserSummary

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
    page: int = 1,
    limit: int = 10,
    _: User = Depends(require_permission("manage_users")),
    users: UsersUseCases = Depends(build_users),
):
    if page < 1:
        page = 1
    if limit < 1 or limit > 100:
        limit = 10

    result = users.list_users.execute(ListUsersInput(page=page, limit=limit))

    return {
        **page_meta(result.total_items, page, limit),
        "users": [_serialize_user(u) for u in result.users],
    }
