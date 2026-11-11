"""El correo de reset indica la vigencia real del enlace.

Regresión: la plantilla decía siempre «24 horas», pero el reset que pide el
propio usuario expira en 1 hora (el de administrador sí dura 24 h).
"""

import asyncio
import os
import sys
from types import SimpleNamespace

os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import BackgroundTasks  # noqa: E402

from auth.infrastructure import smtp_email  # noqa: E402
from auth.infrastructure.email_adapters import SmtpAuthEmailSender  # noqa: E402


def test_plantilla_indica_la_vigencia_recibida():
    one = smtp_email._html_body("https://x/reset?token=t", "Hola", 1)
    assert "expirará en 1 hora." in one
    assert "24 horas" not in one
    assert "expirará en 24 horas." in smtp_email._html_body("https://x", "Hola", 24)


def _capturar(monkeypatch) -> list[str]:
    sent: list[str] = []
    monkeypatch.setattr(smtp_email, "SMTP_USER", "u@x.pe")
    monkeypatch.setattr(smtp_email, "SMTP_PASSWORD", "p")
    monkeypatch.setattr(smtp_email, "_send_html", lambda _to, _s, html, _l: sent.append(html))
    return sent


def test_reset_propio_dice_una_hora(monkeypatch):
    sent = _capturar(monkeypatch)
    tasks = BackgroundTasks()
    user = SimpleNamespace(id="1", email="ana@x.pe", full_name="Ana")
    SmtpAuthEmailSender(tasks, "https://app").send_password_reset(user, "t")
    asyncio.run(tasks())
    assert len(sent) == 1
    assert "expirará en 1 hora." in sent[0]


def test_reset_de_admin_dice_24_horas(monkeypatch):
    sent = _capturar(monkeypatch)
    smtp_email.send_reset_email("ana@x.pe", "https://app/reset-password?token=t", "Ana")
    assert "expirará en 24 horas." in sent[0]
