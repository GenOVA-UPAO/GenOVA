import logging
import smtplib
from collections.abc import Callable
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import structlog
from fastapi import BackgroundTasks

from core.config import settings

logger = structlog.get_logger(__name__)

SMTP_HOST = settings.smtp_host or "smtp.gmail.com"
SMTP_PORT = settings.smtp_port or 465
SMTP_USER = (settings.smtp_user or "").strip()
SMTP_PASSWORD = (settings.smtp_password or "").replace(" ", "")


class EmailNotConfigured(RuntimeError):
    pass


def _html_body(reset_link: str, greeting: str) -> str:
    return f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #334155; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <h2 style="color: #4f46e5; margin-top: 0; margin-bottom: 24px; font-size: 24px;">Restablecer contraseña - GenOVA</h2>
          <p style="font-size: 16px; line-height: 1.5; margin-bottom: 16px;">{greeting},</p>
          <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">Has recibido este correo porque se ha solicitado un restablecimiento de contraseña para tu cuenta en la plataforma <strong>GenOVA</strong>.</p>
          <div style="margin: 32px 0; text-align: center;">
            <a href="{reset_link}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">Restablecer Contraseña</a>
          </div>
          <p style="font-size: 14px; line-height: 1.5; color: #64748b; margin-bottom: 24px;">Este enlace expirará en 24 horas. Si no solicitaste este restablecimiento, puedes ignorar este correo de forma segura; tu contraseña seguirá siendo la misma.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">Soporte GenOVA - UPAO</p>
        </div>
      </body>
    </html>
    """


def _verify_html_body(verify_link: str, greeting: str) -> str:
    return f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #334155; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <h2 style="color: #0A3D91; margin-top: 0; margin-bottom: 24px; font-size: 24px;">Verifica tu correo - GenOVA</h2>
          <p style="font-size: 16px; line-height: 1.5; margin-bottom: 16px;">{greeting},</p>
          <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">Gracias por registrarte en <strong>GenOVA</strong>. Confirma tu correo para activar tu cuenta y empezar a crear OVAs.</p>
          <div style="margin: 32px 0; text-align: center;">
            <a href="{verify_link}" style="background-color: #0A3D91; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">Verificar mi correo</a>
          </div>
          <p style="font-size: 14px; line-height: 1.5; color: #64748b; margin-bottom: 24px;">Este enlace expira en 24 horas. Si no creaste esta cuenta, puedes ignorar este correo.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">Soporte GenOVA - UPAO</p>
        </div>
      </body>
    </html>
    """


def _send_html(to_email: str, subject: str, html: str, log_label: str) -> None:
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.error("SMTP credentials faltantes", log_label=log_label, to_email=to_email)
        raise EmailNotConfigured("SMTP_USER and SMTP_PASSWORD must be set")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Soporte GenOVA <{SMTP_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
        logger.info("Correo enviado", log_label=log_label, to_email=to_email)
    except Exception:
        logger.exception("Fallo al enviar correo", log_label=log_label, to_email=to_email)
        raise


def send_reset_email(to_email: str, reset_link: str, full_name: str | None = None) -> None:
    """Send a password-reset email. Raises EmailNotConfigured when credentials
    are missing so callers (typically a BackgroundTasks job) can log the failure
    without leaking creds in the response."""
    greeting = f"Hola {full_name}" if full_name else "Hola"
    _send_html(
        to_email,
        "Restablece tu contraseña en GenOVA",
        _html_body(reset_link, greeting),
        "reset password email",
    )


def send_verification_email(to_email: str, verify_link: str, full_name: str | None = None) -> None:
    """Send an email-verification link. Same failure semantics as reset."""
    greeting = f"Hola {full_name}" if full_name else "Hola"
    _send_html(
        to_email,
        "Verifica tu correo en GenOVA",
        _verify_html_body(verify_link, greeting),
        "verification email",
    )


def is_smtp_configured() -> bool:
    return bool(SMTP_USER and SMTP_PASSWORD)


def dispatch_or_log(
    background_tasks: BackgroundTasks,
    send_fn: Callable[[str, str, str | None], None],
    to_email: str,
    link: str,
    full_name: str | None,
    log_label: str,
) -> None:
    """Queue `send_fn` (send_reset_email/send_verification_email) as a
    background task when SMTP is configured; otherwise log that delivery
    failed (never the link itself — it embeds a single-use token, and logging
    it would violate the hard rule against logging tokens/secrets).
    Escalates to ERROR in production since it means the account has no
    working delivery path. Shared by reset_router and verify_router — do not
    duplicate this check inline in either."""
    if is_smtp_configured():
        background_tasks.add_task(send_fn, to_email, link, full_name)
        return
    level = logging.ERROR if settings.env == "production" else logging.WARNING
    logger.log(
        level,
        "SMTP no configurado — enlace no enviado. Verificar configuración SMTP; "
        "el enlace no se registra en logs por contener un token de un solo uso.",
        log_label=log_label,
        to_email=to_email,
    )
