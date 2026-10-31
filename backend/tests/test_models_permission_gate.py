"""Los endpoints que cambian o prueban modelos/claves propios exigen permiso.

Regresión: `ai:models:self` solo se comprobaba en el frontend; un usuario sin él
(p. ej. `usuarios_prueba`, el rol de la tesis) podía llamar directamente a
PUT /me/api-keys o PUT /me/llm-settings y elegir sus modelos.
"""

import os
import sys
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402
from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.dialects import postgresql  # noqa: E402

from auth.dependencies import get_current_user  # noqa: E402
from core.database import get_db  # noqa: E402
from core.rate_limit import limiter  # noqa: E402
from users.interface.http import (  # noqa: E402
    settings_api_keys_router,
    settings_enabled_models_router,
    settings_llm_settings_router,
    settings_model_test_router,
)
from users.interface.http.models_access import require_models_access  # noqa: E402

GATED = {
    ("PUT", "/me/llm-settings"),
    ("POST", "/me/llm-settings/refresh-catalog"),
    ("PUT", "/me/enabled-models"),
    ("PUT", "/me/api-keys"),
    ("POST", "/me/llm-settings/test-model"),
    ("POST", "/me/api-keys/{provider}/check"),
}
OPEN = {("GET", "/me/llm-settings"), ("GET", "/me/api-keys"), ("GET", "/me/enabled-models")}
ROUTERS = (
    settings_llm_settings_router.router,
    settings_api_keys_router.router,
    settings_enabled_models_router.router,
    settings_model_test_router.router,
)


def _routes():
    for router in ROUTERS:
        for route in router.routes:
            for method in route.methods:
                deps = {d.call for d in route.dependant.dependencies}
                yield (method, route.path), deps


def test_rutas_que_cambian_modelos_exigen_el_permiso():
    routes = dict(_routes())
    for key in GATED:
        assert require_models_access in routes[key], key
    for key in OPEN:
        assert require_models_access not in routes[key], key
        assert get_current_user in routes[key], key


def _db(allowed: bool) -> MagicMock:
    db = MagicMock()
    db.execute.return_value.scalar.return_value = allowed
    return db


def test_gate_rechaza_sin_permiso_y_acepta_con_el():
    user = SimpleNamespace(id=uuid4())
    with pytest.raises(HTTPException) as err:
        require_models_access(current_user=user, db=_db(False))
    assert err.value.status_code == 403
    assert require_models_access(current_user=user, db=_db(True)) is user


def test_gate_consulta_ambos_permisos_y_el_rol_admin():
    db = _db(True)
    require_models_access(current_user=SimpleNamespace(id=uuid4()), db=db)
    sql = str(db.execute.call_args.args[0].compile(dialect=postgresql.dialect()))
    assert "roles.permissions @>" in sql
    assert sql.count("@>") == 2
    assert "roles.name =" in sql


def test_put_api_keys_sin_permiso_responde_403():
    limiter.enabled = False
    app = FastAPI()
    app.state.limiter = limiter
    app.include_router(settings_api_keys_router.router, prefix="/api/users")
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=uuid4())
    app.dependency_overrides[get_db] = lambda: _db(False)
    client = TestClient(app)
    r = client.put("/api/users/me/api-keys", json={"groq": "gsk_" + "x" * 40})
    assert r.status_code == 403
