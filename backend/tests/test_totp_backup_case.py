"""Los códigos de respaldo TOTP no distinguen mayúsculas ni espacios.

Regresión: se generan como hexadecimal en mayúsculas y la entrada no se
normalizaba, así que «a1b2c3d4» se rechazaba siempre con «Código incorrecto».
"""

import os
import sys

os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402

from auth.infrastructure.totp_adapters import PyotpTotpAuthenticator  # noqa: E402
from auth.infrastructure.totp_tickets import _hash_backup  # noqa: E402


@pytest.fixture(scope="module")
def hashed() -> str:
    return _hash_backup("A1B2C3D4")


@pytest.mark.parametrize("code", ["A1B2C3D4", "a1b2c3d4", "a1b2 c3d4", " A1B2C3D4 "])
def test_codigo_de_respaldo_acepta_minusculas_y_espacios(hashed, code):
    assert PyotpTotpAuthenticator().verify_backup(code, hashed) is True


def test_codigo_de_respaldo_distinto_se_rechaza(hashed):
    assert PyotpTotpAuthenticator().verify_backup("A1B2C3D5", hashed) is False
