"""Los scripts de desarrollo que escriben en la BD no adivinan dueño ni rutas.

create_test_ova_postgresql guardaba el OVA de prueba bajo «el primer usuario» de
la tabla (posiblemente un docente real) y escribía en rutas de /home/jeffryru.
"""

import pytest

import scripts.create_test_ova_postgresql as create_test_ova
import scripts.setup_diagram_database as setup_diagram_db
from core.config import settings


@pytest.fixture()
def no_db(monkeypatch):
    def _forbidden(*a, **k):
        raise AssertionError("no debe abrir una sesión de BD")

    monkeypatch.setattr(create_test_ova, "Session", _forbidden)
    monkeypatch.setattr(create_test_ova, "get_spec", _forbidden)


def test_create_test_ova_exige_user_email(no_db):
    with pytest.raises(SystemExit) as exc:
        create_test_ova.main([])
    assert exc.value.code == 2


def test_create_test_ova_se_niega_en_produccion(no_db, monkeypatch):
    monkeypatch.setattr(settings, "env", "production")
    with pytest.raises(SystemExit) as exc:
        create_test_ova.main(["--user-email", "profe@upao.edu.pe"])
    assert exc.value.code == 2


def test_create_test_ova_sin_rutas_de_un_desarrollador():
    source = create_test_ova.__file__
    with open(source, encoding="utf-8") as f:
        assert "/home/" not in f.read()


def test_setup_diagram_db_exige_env_de_origen(monkeypatch):
    monkeypatch.delenv("DIAGRAM_SOURCE_ENV", raising=False)
    with pytest.raises(SystemExit) as exc:
        setup_diagram_db.setup([])
    assert exc.value.code == 2
