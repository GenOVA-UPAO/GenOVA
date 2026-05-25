"""Admin endpoints: account status (activate, lock) + password-reset triggers.

Security note: both reset endpoints generate a long random token via
`secrets.token_urlsafe` and return ONLY a delivery URL (email queued in the
background, WhatsApp share URL) to the caller. The token itself never crosses
the HTTP boundary back to the admin so that an admin cannot reset another
user's password by reading the API response.
"""
import logging
import secrets
import urllib.parse
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import delete
from sqlalchemy.orm import Session

from auth.dependencies import require_permission
from auth.email import send_reset_email
from database import get_db
from models import PasswordResetToken, User
from users.admin_helpers import (
    APP_URL,
    assert_can_touch_target,
    commit_or_500,
    get_target_user,
    parse_uuid,
)

router = APIRouter()
logger = logging.getLogger(__name__)


class UserStatusUpdate(BaseModel):
    is_active: bool


def _issue_reset_token(db: Session, user_id) -> str:
    """Replace any existing reset tokens for the user with a fresh long token."""
    db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == user_id))
    db.flush()
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    db.add(PasswordResetToken(user_id=user_id, token=token, expires_at=expires_at))
    return token


@router.patch("/{user_id}/status")
def update_user_status(
    user_id: str,
    payload: UserStatusUpdate,
    current_user: User = Depends(require_permission("manage_users")),
    db: Session = Depends(get_db),
):
    target_uuid = parse_uuid(user_id)
    if target_uuid == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="No puedes desactivar tu propia cuenta.")
    assert_can_touch_target(caller=current_user, target_id=target_uuid, db=db)

    target_user = get_target_user(target_uuid, db)
    target_user.is_active = payload.is_active
    commit_or_500(db, op="update_user_status")
    return {"id": str(target_uuid), "is_active": target_user.is_active}


@router.post("/{user_id}/unlock")
def unlock_user(
    user_id: str,
    current_user: User = Depends(require_permission("manage_users")),
    db: Session = Depends(get_db),
):
    target_uuid = parse_uuid(user_id)
    assert_can_touch_target(caller=current_user, target_id=target_uuid, db=db)
    target_user = get_target_user(target_uuid, db)
    target_user.failed_login_attempts = 0
    target_user.locked_until = None
    commit_or_500(db, op="unlock_user")
    return {"id": str(target_uuid), "message": "Cuenta desbloqueada con éxito."}


@router.post("/{user_id}/reset-password-email")
def trigger_reset_email(
    user_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_permission("manage_users")),
    db: Session = Depends(get_db),
):
    target_uuid = parse_uuid(user_id)
    assert_can_touch_target(caller=current_user, target_id=target_uuid, db=db)
    target_user = get_target_user(target_uuid, db)

    token = _issue_reset_token(db, target_uuid)
    commit_or_500(db, op="reset_password_email_token")

    reset_link = f"{APP_URL}/reset-password?token={token}"
    background_tasks.add_task(
        send_reset_email, target_user.email, reset_link, target_user.full_name
    )
    return {"message": "Correo de restablecimiento encolado para su envío."}


@router.post("/{user_id}/reset-password-whatsapp")
def trigger_reset_whatsapp(
    user_id: str,
    current_user: User = Depends(require_permission("manage_users")),
    db: Session = Depends(get_db),
):
    target_uuid = parse_uuid(user_id)
    assert_can_touch_target(caller=current_user, target_id=target_uuid, db=db)
    target_user = get_target_user(target_uuid, db)

    if not target_user.phone_number:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="El usuario no tiene un número de teléfono registrado.")

    token = _issue_reset_token(db, target_uuid)
    commit_or_500(db, op="reset_password_whatsapp_token")

    reset_link = f"{APP_URL}/reset-password?token={token}"
    text_msg = (
        f"Hola {target_user.full_name or ''}, "
        "tu enlace para restablecer la contraseña en GenOVA: "
        f"{reset_link} (expira en 24 h)."
    )
    digits = "".join(ch for ch in target_user.phone_number if ch.isdigit())
    if len(digits) == 9:  # Peruvian mobile without country code → autoprefix
        digits = "51" + digits
    wa_url = f"https://api.whatsapp.com/send?phone={digits}&text={urllib.parse.quote(text_msg)}"

    return {
        "phone_number": target_user.phone_number,
        "whatsapp_url": wa_url,
    }
