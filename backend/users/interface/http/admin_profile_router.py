"""Admin endpoints: edit profile + change role."""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, EmailStr, Field

from auth.dependencies import require_permission
from core.rate_limit import limiter
from models import User
from users.application.dto import AdminUpdateProfileInput, AdminUpdateRoleInput
from users.container import UsersUseCases, build_users
from users.domain.errors import UserError
from users.interface.http.error_map import to_http_exception

router = APIRouter()


class UserRoleUpdate(BaseModel):
    role_id: str = Field(..., description="UUID del rol a asignar")


class UserProfileAdminUpdate(BaseModel):
    full_name: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    university_id: int | None = Field(default=None, ge=1)
    gender: str | None = Field(default=None, max_length=20)
    phone_number: str | None = Field(default=None, max_length=20)


@router.patch("/{user_id}", summary="Actualizar el perfil de un usuario")
@limiter.limit("20/minute")
def update_user_profile(
    request: Request,
    user_id: str,
    payload: UserProfileAdminUpdate,
    current_user: User = Depends(require_permission("manage_users")),
    users: UsersUseCases = Depends(build_users),
):
    try:
        users.admin_update_profile.execute(
            AdminUpdateProfileInput(
                caller_id=current_user.id,
                user_id=user_id,
                full_name=payload.full_name,
                email=str(payload.email),
                university_id=payload.university_id,
                gender=payload.gender,
                phone_number=payload.phone_number,
            )
        )
    except UserError as err:
        raise to_http_exception(err) from None

    return {"message": "Perfil actualizado exitosamente."}


@router.patch("/{user_id}/role", summary="Cambiar el rol de un usuario")
@limiter.limit("20/minute")
def update_user_role(
    request: Request,
    user_id: str,
    payload: UserRoleUpdate,
    current_user: User = Depends(require_permission("manage_users")),
    users: UsersUseCases = Depends(build_users),
):
    try:
        result = users.admin_update_role.execute(
            AdminUpdateRoleInput(
                caller_id=current_user.id,
                user_id=user_id,
                role_id=payload.role_id,
            )
        )
    except UserError as err:
        raise to_http_exception(err) from None

    return {
        "id": result.id,
        "email": result.email,
        "full_name": result.full_name or "",
        "role": {"id": result.role.id, "name": result.role.name},
        "updated_at": result.updated_at,
    }
