"""Admin endpoints: account status (activate, lock) + password-reset trigger.

Adaptador HTTP de los casos de uso de administración de cuentas. Security
note: the reset endpoint uses a long random token issued by the use case and
queues the email in the background. The token itself never crosses the HTTP
boundary back to the admin so that an admin cannot reset another user's
password by reading the API response.
"""

import os

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from pydantic import BaseModel

from auth.dependencies import require_permission
from auth.infrastructure.smtp_email import send_reset_email
from core.rate_limit import limiter
from models import User
from users.application.dto import (
    AdminSendResetEmailInput,
    AdminUnlockAccountInput,
    AdminUpdateStatusInput,
)
from users.container import UsersUseCases, build_users
from users.domain.errors import UserError
from users.interface.http.error_map import to_http_exception

router = APIRouter()

APP_URL = os.getenv("APP_URL", "http://localhost:4200")


class UserStatusUpdate(BaseModel):
    is_active: bool


@router.patch("/{user_id}/status", summary="Activar o desactivar un usuario")
@limiter.limit("20/minute")
def update_user_status(
    request: Request,
    user_id: str,
    payload: UserStatusUpdate,
    current_user: User = Depends(require_permission("manage_users")),
    users: UsersUseCases = Depends(build_users),
):
    try:
        result = users.admin_update_status.execute(
            AdminUpdateStatusInput(
                caller_id=current_user.id, user_id=user_id, is_active=payload.is_active
            )
        )
    except UserError as err:
        raise to_http_exception(err) from None

    return {"id": result.id, "is_active": result.is_active}


@router.post("/{user_id}/unlock", summary="Desbloquear un usuario")
@limiter.limit("20/minute")
def unlock_user(
    request: Request,
    user_id: str,
    current_user: User = Depends(require_permission("manage_users")),
    users: UsersUseCases = Depends(build_users),
):
    try:
        account_id = users.admin_unlock_account.execute(
            AdminUnlockAccountInput(caller_id=current_user.id, user_id=user_id)
        )
    except UserError as err:
        raise to_http_exception(err) from None

    return {"id": account_id, "message": "Cuenta desbloqueada con éxito."}


@router.post(
    "/{user_id}/reset-password-email", summary="Enviar correo de restablecimiento a un usuario"
)
@limiter.limit("5/minute")
def trigger_reset_email(
    request: Request,
    user_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_permission("manage_users")),
    users: UsersUseCases = Depends(build_users),
):
    try:
        info = users.admin_send_reset_email.execute(
            AdminSendResetEmailInput(caller_id=current_user.id, user_id=user_id)
        )
    except UserError as err:
        raise to_http_exception(err) from None

    reset_link = f"{APP_URL}/reset-password?token={info.token}"
    background_tasks.add_task(send_reset_email, info.email, reset_link, info.full_name)
    return {"message": "Correo de restablecimiento encolado para su envío."}
