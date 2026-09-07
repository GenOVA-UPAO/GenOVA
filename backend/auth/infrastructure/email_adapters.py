"""Adaptadores de entrega de correos de autenticación."""

from __future__ import annotations

import structlog
from fastapi import BackgroundTasks

from auth.domain.user import EmailRecipient, PasswordResetUser
from auth.infrastructure.smtp_email import (
    dispatch_or_log,
    send_reset_email,
    send_verification_email,
)
from core.config import settings

logger = structlog.get_logger(__name__)

if settings.env == "production" and "localhost" in settings.frontend_url:
    logger.warning(
        "FRONTEND_URL apunta a localhost en producción — los enlaces de verificación "
        "no funcionarán. Define FRONTEND_URL con el origen del frontend desplegado."
    )


class SmtpAuthEmailSender:
    def __init__(self, background_tasks: BackgroundTasks, frontend_url: str) -> None:
        self._background_tasks = background_tasks
        self._frontend_url = frontend_url.rstrip("/")

    def send_verification(self, user: EmailRecipient, token: str) -> None:
        verify_link = f"{self._frontend_url}/verificar-correo?token={token}"
        dispatch_or_log(
            self._background_tasks,
            send_verification_email,
            user.email,
            verify_link,
            user.full_name,
            "enlace de verificación",
        )

    def send_password_reset(self, user: PasswordResetUser, token: str) -> None:
        reset_link = f"{self._frontend_url}/reset-password?token={token}"
        dispatch_or_log(
            self._background_tasks,
            send_reset_email,
            user.email,
            reset_link,
            user.full_name,
            "enlace de restablecimiento",
        )
