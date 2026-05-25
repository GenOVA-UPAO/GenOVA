import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
try:
    SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
except ValueError:
    SMTP_PORT = 465
SMTP_USER = os.getenv("SMTP_USER", "").strip()
# Google App passwords arrive with spaces — strip them so users can paste freely.
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").replace(" ", "")


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


def send_reset_email(to_email: str, reset_link: str, full_name: str | None = None) -> None:
    """Send a password-reset email. Raises EmailNotConfigured when credentials
    are missing so callers (typically a BackgroundTasks job) can log the failure
    without leaking creds in the response."""
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.error("SMTP credentials missing; cannot send reset email to %s", to_email)
        raise EmailNotConfigured("SMTP_USER and SMTP_PASSWORD must be set")

    greeting = f"Hola {full_name}" if full_name else "Hola"
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Restablece tu contraseña en GenOVA"
    msg["From"] = f"Soporte GenOVA <{SMTP_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(_html_body(reset_link, greeting), "html"))

    try:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
        logger.info("Reset password email sent to %s", to_email)
    except Exception:
        logger.exception("Failed to send reset password email to %s", to_email)
        raise
