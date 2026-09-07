"""Adaptadores de entrega de correos de autenticación."""

from __future__ import annotations

from fastapi import BackgroundTasks

from auth.domain.user import PasswordResetUser, RegisteredUser
from auth.infrastructure.smtp_email import (
    dispatch_or_log,
    send_reset_email,
    send_verification_email,
)


class SmtpAuthEmailSender:
    def __init__(self, background_tasks: BackgroundTasks, frontend_url: str) -> None:
        self._background_tasks = background_tasks
        self._frontend_url = frontend_url.rstrip("/")

    def send_verification(self, user: RegisteredUser, token: str) -> None:
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
