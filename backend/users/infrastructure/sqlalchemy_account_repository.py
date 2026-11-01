"""Persistencia SQLAlchemy de la seguridad de la cuenta propia.

Incluye la protección de único administrador y la anonimización de PII que
antes vivían en `users/application/account_service.py` (mismas consultas y
mismo orden, ahora señalando errores de dominio en vez de HTTP).
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from auth.domain.email import normalize_email
from core.database import commit_or_500
from models import EmailVerificationToken, PasswordResetToken, Role, User, UserLink, UserRole
from users.domain.account import UserAccount
from users.domain.errors import SoleAdminRemoval


class SqlAlchemyUserAccountRepository:
    """Implementa `UserAccountRepository` estructuralmente (sin importarlo)."""

    def __init__(self, db: Session) -> None:
        self._db = db

    def get(self, user_id: UUID) -> UserAccount | None:
        # Read the password under the same lock held until update_password commits.
        user = self._db.execute(
            select(User).where(User.id == user_id).with_for_update()
            .execution_options(populate_existing=True)
        ).scalar_one_or_none()
        if user is None:
            return None
        return UserAccount(
            id=str(user.id), password_hash=user.password_hash, email=user.email or ""
        )

    def update_password(self, user_id: UUID, password_hash: str) -> None:
        user = self._db.execute(
            select(User).where(User.id == user_id).with_for_update()
            .execution_options(populate_existing=True)
        ).scalar_one()
        user.password_hash = password_hash
        user.password_changed_at = datetime.now(UTC)
        # Un reset pendiente emitido antes del cambio no debe poder pisar la clave nueva.
        self._db.execute(
            PasswordResetToken.__table__.delete().where(PasswordResetToken.user_id == user_id)
        )
        commit_or_500(self._db, "change_password")

    def assert_not_sole_admin(self, user_id: UUID) -> None:
        user_roles = (
            self._db.execute(
                select(Role.name)
                .join(UserRole, UserRole.role_id == Role.id)
                .where(UserRole.user_id == user_id)
            )
            .scalars()
            .all()
        )
        if "administrador" not in user_roles:
            return

        total_admins = self._db.execute(
            select(func.count(UserRole.user_id))
            .join(Role, Role.id == UserRole.role_id)
            .join(User, User.id == UserRole.user_id)
            .where(Role.name == "administrador", User.is_active)
        ).scalar()
        if total_admins and total_admins <= 1:
            raise SoleAdminRemoval()

    def deactivate_and_anonymize(self, user_id: UUID) -> None:
        """Soft-delete del usuario: bloquea la baja de único admin y limpia el PII."""
        user = self._db.get(User, user_id)

        uid_suffix = str(uuid.uuid4())[:8]
        user.is_active = False
        user.email = f"deleted_{user.id}@{uid_suffix}.removed.local"
        # La llave canónica también debe soltar el correo original: si no, queda el PII
        # en BD y nadie (ni el mismo dueño) puede volver a registrarse con él.
        user.email_normalized = normalize_email(user.email)
        user.full_name = "[eliminado]"
        user.phone_number = None
        user.university_id = None
        # Secretos y configuración: una cuenta eliminada no debe conservar claves
        # de proveedores (las heredaban sus vinculados), TOTP ni el correo pendiente.
        user.user_api_keys = {}
        user.llm_settings = {}
        user.enabled_models = []
        user.totp_secret = None
        user.totp_enabled = False
        user.totp_backup_codes = []
        user.pending_email = user.pending_email_token_hash = user.pending_email_expires_at = None
        self._db.execute(
            delete(UserLink).where(
                or_(UserLink.owner_user_id == user.id, UserLink.linked_user_id == user.id)
            )
        )
        self._db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == user.id))
        self._db.execute(
            delete(EmailVerificationToken).where(EmailVerificationToken.user_id == user.id)
        )

        commit_or_500(self._db, "delete_account")
