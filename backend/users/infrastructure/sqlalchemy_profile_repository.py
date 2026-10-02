"""Persistencia SQLAlchemy del perfil propio (ajustes de perfil y tema)."""

from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from html import escape
from uuid import UUID

import pyotp
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.domain.email import normalize_email
from core.database import commit_or_500
from models import PasswordResetToken, User
from users.domain.errors import EmailAlreadyInUse, IncorrectCurrentPassword
from users.domain.profile import UserProfile


def send_email_change(email: str, token: str) -> None:
    from auth.infrastructure.smtp_email import _send_html

    _send_html(email, "Confirma el cambio de correo en GenOVA",
               "<p>Introduce este código en tu perfil para confirmar el nuevo correo. "
               f"Expira en 30 minutos y solo se puede usar una vez.</p><code>{escape(token)}</code>",
               "email change")


def _to_profile(user: User) -> UserProfile:
    return UserProfile(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        university_id=user.university_id,
        gender=user.gender,
        phone_number=user.phone_number,
        theme_settings=user.theme_settings,
        created_at=user.created_at.isoformat() if user.created_at else None,
        updated_at=user.updated_at.isoformat() if user.updated_at else None,
    )


class SqlAlchemyUserProfileRepository:
    """Implementa `UserProfileRepository` estructuralmente (sin importarlo)."""

    def __init__(self, db: Session) -> None:
        self._db = db

    def request_email_change(self, user_id: UUID, email: str, totp_code: str | None) -> None:
        user = self._db.execute(select(User).where(User.id == user_id).with_for_update()).scalar_one()
        if user.totp_enabled and not (
            user.totp_secret and totp_code
            and pyotp.TOTP(user.totp_secret).verify(totp_code, valid_window=1)
        ):
            raise IncorrectCurrentPassword("Código TOTP inválido o ausente.")
        token = secrets.token_urlsafe(32)
        # Enviar antes de persistir: si SMTP falla, el correo actual sigue intacto.
        send_email_change(email, token)
        user.pending_email = email
        user.pending_email_token_hash = hashlib.sha256(token.encode()).hexdigest()
        user.pending_email_expires_at = datetime.now(UTC) + timedelta(minutes=30)
        self._db.flush()

    def confirm_email_change(self, user_id: UUID, token: str) -> UserProfile:
        user = self._db.execute(select(User).where(User.id == user_id).with_for_update()
                                .execution_options(populate_existing=True)).scalar_one()
        expires = user.pending_email_expires_at
        if not (user.pending_email and user.pending_email_token_hash and expires
                and expires.replace(tzinfo=UTC) > datetime.now(UTC)
                and secrets.compare_digest(user.pending_email_token_hash,
                                           hashlib.sha256(token.encode()).hexdigest())):
            raise IncorrectCurrentPassword("Código inválido o expirado.")
        if self.email_in_use(user.pending_email, user_id):
            raise EmailAlreadyInUse()
        user.email = user.pending_email
        user.email_normalized = normalize_email(user.email)
        user.email_verified = True
        user.pending_email = user.pending_email_token_hash = user.pending_email_expires_at = None
        self._db.execute(PasswordResetToken.__table__.delete().where(PasswordResetToken.user_id == user_id))
        commit_or_500(self._db, "confirm_email_change")
        return _to_profile(user)

    def email_in_use(self, email: str, excluding_user_id: UUID) -> bool:
        found = self._db.execute(
            select(User).where(User.email_normalized == normalize_email(email), User.id != excluding_user_id)
        ).scalar_one_or_none()
        return found is not None

    def phone_number_in_use(self, phone_number: str, excluding_user_id: UUID) -> bool:
        found = self._db.execute(
            select(User).where(User.phone_number == phone_number, User.id != excluding_user_id)
        ).scalar_one_or_none()
        return found is not None

    def university_id_in_use(self, university_id: int, excluding_user_id: UUID) -> bool:
        found = self._db.execute(
            select(User).where(User.university_id == university_id, User.id != excluding_user_id)
        ).scalar_one_or_none()
        return found is not None

    def save_profile(
        self,
        user_id: UUID,
        *,
        full_name: str,
        email: str,
        university_id: int | None,
        gender: str | None,
        phone_number: str | None,
    ) -> UserProfile:
        # Misma instancia que `get_current_user` (identity map de la sesión):
        # la mutación en sitio y el refresh reproducen el flujo del router.
        user = self._db.get(User, user_id)
        user.full_name = full_name
        if user.email_normalized != normalize_email(email):
            # Un reset emitido para el correo anterior no debe sobrevivir al cambio.
            self._db.execute(
                PasswordResetToken.__table__.delete().where(PasswordResetToken.user_id == user_id)
            )
        user.email = email
        user.email_normalized = normalize_email(email)
        user.university_id = university_id
        user.gender = gender
        user.phone_number = phone_number

        commit_or_500(self._db, "update_profile")
        self._db.refresh(user)
        return _to_profile(user)

    def save_theme(
        self, user_id: UUID, *, color_mode: str, design_mode: str, palette: dict | None
    ) -> dict:
        user = self._db.get(User, user_id)
        user.theme_settings = {
            "colorMode": color_mode,
            "designMode": design_mode,
            "palette": palette,
        }
        commit_or_500(self._db, "update_theme")
        self._db.refresh(user)
        return user.theme_settings
