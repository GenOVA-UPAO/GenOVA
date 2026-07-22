"""Identificadores mal formados en la URL → 4xx, nunca 500 (BU de la auditoría 2026-07-22).

Comparar una columna UUID de PostgreSQL con un texto que no lo es aborta la
consulta con `InvalidTextRepresentation`; antes salía como 500. Se cubren las
dos defensas: la comprobación previa en los resolvers de OVA/versión (que
responden 404 sin tocar la base) y el manejador global de `DataError` para el
resto de endpoints.

Uso:  pytest tests/test_uuid_guards.py -v
"""

import os
import sys

os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.exc import DataError  # noqa: E402

from core.http_errors import data_error_handler  # noqa: E402
from core.ids import is_uuid  # noqa: E402
from ova.crud.edit_helpers import _load_version_with_phases, _resolve_ova  # noqa: E402

UUID_VALIDO = "4cfbca92-0415-4f2c-8ddc-b4b6df1e8837"


class _SesionQueFalla:
    """Sustituto de la sesión: si el resolver la usa, la comprobación previa falló."""

    def execute(self, *_args, **_kwargs):
        raise AssertionError("no debe consultarse la base con un id mal formado")


@pytest.mark.parametrize("valor", [UUID_VALIDO, UUID_VALIDO.upper()])
def test_is_uuid_acepta_uuid(valor):
    assert is_uuid(valor) is True


@pytest.mark.parametrize("valor", ["", "1", "no-es-uuid", None, 42, UUID_VALIDO + "x"])
def test_is_uuid_rechaza_lo_demas(valor):
    assert is_uuid(valor) is False


@pytest.mark.parametrize("ova_id", ["1", "no-es-uuid", ""])
def test_resolve_ova_devuelve_404_sin_tocar_la_base(ova_id):
    ova, err = _resolve_ova(ova_id, current_user=object(), db=_SesionQueFalla())
    assert ova is None
    assert err is not None
    assert err.status_code == 404


@pytest.mark.parametrize(
    ("version_id", "ova_id"),
    [("1", UUID_VALIDO), (UUID_VALIDO, "no-es-uuid"), ("2", "1")],
)
def test_load_version_con_id_invalido_es_none(version_id, ova_id):
    assert _load_version_with_phases(version_id, ova_id, db=_SesionQueFalla()) is None


def test_data_error_se_traduce_a_400_sin_filtrar_el_detalle():
    app = FastAPI()
    app.add_exception_handler(DataError, data_error_handler)

    @app.get("/boom")
    def boom():
        raise DataError("SELECT ...", {}, Exception('invalid input syntax for type uuid: "1"'))

    with TestClient(app, raise_server_exceptions=False) as client:
        res = client.get("/boom")

    assert res.status_code == 400
    assert res.json() == {
        "error": "invalid_value",
        "message": "Alguno de los valores enviados tiene un formato inválido.",
    }
    assert "uuid" not in res.text.lower()
