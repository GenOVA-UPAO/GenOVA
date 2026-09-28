"""Unit puros (sin backend vivo) de las reglas de validación de auth (HU-001/HU-008).

Cubren la política de contraseñas compartida por registro/reset
(core.security.password_complexity_ok) y la normalización canónica de correos
(auth.email_normalize.normalize_email). El contrato HTTP completo del registro
se ejercita en step_defs/test_auth_steps.py y en la suite e2e.

Uso:  pytest tests/test_auth_validation.py -v
"""

import os
import sys

os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402

from auth.domain.email import normalize_email  # noqa: E402
from core.security import password_complexity_ok  # noqa: E402


@pytest.mark.parametrize(
    "password",
    [
        "clave1234",  # alfanumérica mínima
        "A1b2C3d4e5",  # mezcla mayúsculas/dígitos
        "12345678a",  # una sola letra basta
    ],
)
def test_password_valida(password):
    assert password_complexity_ok(password) is True


@pytest.mark.parametrize(
    "password",
    [
        "",  # vacía
        "corta1a",  # < 8 chars
        "solopalabras",  # sin dígitos
        "12345678",  # sin letras
        "........",  # solo puntos
        "        ",  # solo espacios
    ],
)
def test_password_invalida(password):
    assert password_complexity_ok(password) is False


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("  Estudiante@UPAO.edu ", "estudiante@upao.edu"),  # trim + minúsculas
        ("user+tag@upao.edu", "user@upao.edu"),  # subaddressing RFC 5233
        ("j.o.h.n@gmail.com", "john@gmail.com"),  # puntos de Gmail ignorados
        ("j.o.h.n@upao.edu", "j.o.h.n@upao.edu"),  # puntos NO-Gmail se respetan
        ("user+tag@googlemail.com", "user@googlemail.com"),
        ("sin-arroba", "sin-arroba"),  # entrada malformada, sin crash
    ],
)
def test_normalize_email(raw, expected):
    assert normalize_email(raw) == expected


def test_normalize_email_evita_duplicados():
    """La razón de ser: dos formas del mismo correo colisionan en la misma clave."""
    assert normalize_email("Ana.Perez+genova@gmail.com") == normalize_email("anaperez@gmail.com")
