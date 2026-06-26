"""Unit tests para la redacción de PII/secretos en logs (regla R8)."""

import logging

from core.log_redaction import RedactingFilter, redact


def test_redact_masks_email():
    assert redact("usuario admin@genova.ai inició sesión") == "usuario [email] inició sesión"


def test_redact_masks_bearer_and_jwt():
    out = redact("Authorization: Bearer eyJabc.def-ghi token recibido")
    assert "Bearer [redacted]" in out
    assert "eyJ" not in out


def test_redact_masks_api_key_prefixes():
    assert "[key]" in redact("usando gsk_ABCDEFGHIJKL12345 para Groq")
    assert "[key]" in redact("clave sk-or-abcdef0123456789 de OpenRouter")


def test_redact_preserves_uuid_and_job_ids():
    # Los UUID/ids de job NO deben enmascararse: son útiles para depurar.
    uuid = "550e8400-e29b-41d4-a716-446655440000"
    assert redact(f"job {uuid} terminado") == f"job {uuid} terminado"


def test_filter_redacts_logrecord_message():
    record = logging.LogRecord(
        name="t", level=logging.INFO, pathname=__file__, lineno=1,
        msg="reset enviado a %s", args=("user@example.com",), exc_info=None,
    )
    assert RedactingFilter().filter(record) is True
    assert "[email]" in record.getMessage()
    assert "user@example.com" not in record.getMessage()
