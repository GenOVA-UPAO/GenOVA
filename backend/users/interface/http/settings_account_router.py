"""Account-security endpoints: change password and delete (deactivate) account.

Adaptador HTTP de los casos de uso de seguridad de la cuenta. Incluido en el
router de ajustes de perfil para conservar el prefijo /me sin cambiar el
cableado de usuarios.
"""

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from auth.dependencies import get_current_user
from auth.infrastructure.cookies import clear_auth_cookie
from core.rate_limit import limiter
from users.application.dto import ChangePasswordInput, DeleteAccountInput
from users.container import UsersUseCases, build_users
from users.domain.errors import UserError
from users.interface.http.error_map import to_http_exception

router = APIRouter()


class UserPasswordChange(BaseModel):
    current_password: str = Field(..., description="Contraseña actual")
    new_password: str = Field(..., min_length=8, description="Nueva contraseña alfanumérica")
    confirm_password: str = Field(..., min_length=8, description="Confirmación de nueva contraseña")


@router.post("/me/change-password", summary="Cambiar la contraseña propia")
@limiter.limit("5/minute")
def change_password(
    request: Request,
    payload: UserPasswordChange,
    current_user=Depends(get_current_user),
    users: UsersUseCases = Depends(build_users),
):
    try:
        users.change_password.execute(
            ChangePasswordInput(
                user_id=current_user.id,
                current_password=payload.current_password,
                new_password=payload.new_password,
                confirm_password=payload.confirm_password,
            )
        )
    except UserError as err:
        raise to_http_exception(err) from None

    return {"message": "Contraseña actualizada con éxito."}


class UserDeleteRequest(BaseModel):
    password: str = Field(..., description="Contraseña actual para confirmar")


@router.delete("/me", summary="Eliminar la cuenta propia")
@limiter.limit("5/minute")
def delete_account(
    request: Request,
    payload: UserDeleteRequest,
    current_user=Depends(get_current_user),
    users: UsersUseCases = Depends(build_users),
):
    try:
        users.delete_account.execute(
            DeleteAccountInput(user_id=current_user.id, password=payload.password)
        )
    except UserError as err:
        raise to_http_exception(err) from None

    response = JSONResponse(content={"message": "Cuenta eliminada exitosamente."})
    clear_auth_cookie(response)
    return response
