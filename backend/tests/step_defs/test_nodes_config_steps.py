"""EN-017 — BDD steps for Panel de Nodos/Agentes Prometheus.

Tests the admin /nodes-config endpoints + get_nodes_config() helper.
Uses SQLite in-memory + TestClient (same pattern as test_llm_config_steps.py).
PlatformConfig table is created in DDL so endpoint DB operations work.
nodes_config store (stored_cached/load_stored/save_stored) is monkeypatched
to an in-process dict so SQLite-vs-SessionLocal session divergence is avoided.
"""

import os
import sys
import uuid

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
os.environ.setdefault("GROQ_API_KEY", "sk-test-dummy-key-for-unit-tests")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import pytest  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from pytest_bdd import given, parsers, scenario, then, when  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import prometheus.nodes_config as nc_mod  # noqa: E402
from auth.dependencies import get_current_user  # noqa: E402
from core.database import get_db  # noqa: E402
from core.rate_limit import limiter  # noqa: E402
from users.admin.platform_settings_router import router as admin_router  # noqa: E402

_FEATURES = os.path.join(os.path.dirname(__file__), "..", "..", "..", "tests", "features")
FEATURE = os.path.join(_FEATURES, "setup", "EN-017_nodes-config.feature")

_DDL = """
CREATE TABLE roles (
  id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, permissions TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE user_roles (
  user_id TEXT NOT NULL, role_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);
CREATE TABLE platform_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""


class _Principal:
    def __init__(self, uid):
        self.id = uid


@pytest.fixture
def ctx(monkeypatch):
    eng = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    with eng.begin() as conn:
        for stmt in _DDL.strip().split(";"):
            if stmt.strip():
                conn.execute(text(stmt))

    admin_uid = uuid.uuid4()
    admin_role_id = uuid.uuid4()
    with eng.begin() as conn:
        conn.execute(
            text("INSERT INTO roles (id, name) VALUES (:i, 'administrador')"),
            {"i": admin_role_id.hex},
        )
        conn.execute(
            text("INSERT INTO user_roles (user_id, role_id) VALUES (:u, :r)"),
            {"u": admin_uid.hex, "r": admin_role_id.hex},
        )

    Session = sessionmaker(bind=eng, autoflush=False, autocommit=False, future=True)

    def _get_db_override():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    # Replace the global SessionLocal-based store with an in-process dict so
    # PUT/GET operate on the same data without touching PostgreSQL.
    box: dict = {"data": {}}
    monkeypatch.setattr(nc_mod, "stored_cached", lambda: box["data"].copy())
    monkeypatch.setattr(nc_mod, "load_stored", lambda: box["data"].copy())

    def _save_stored_box(payload, _db):
        box["data"].update(payload)
        nc_mod.invalidate()
        return nc_mod.get_nodes_config()

    monkeypatch.setattr(nc_mod, "save_nodes_config", _save_stored_box)

    limiter.enabled = False

    app = FastAPI()
    app.state.limiter = limiter
    app.include_router(admin_router, prefix="/api/admin")
    app.dependency_overrides[get_db] = _get_db_override
    app.dependency_overrides[get_current_user] = lambda: _Principal(admin_uid)

    return {"client": TestClient(app), "box": box, "monkeypatch": monkeypatch}


_URL = "/api/admin/nodes-config"


# ── Scenarios ──────────────────────────────────────────────────────────────────


@scenario(FEATURE, "GET retorna nodos y config con defaults cuando no hay DB config")
def test_get_defaults():
    pass


@scenario(FEATURE, "PUT guarda flags y GET refleja el cambio")
def test_put_and_get():
    pass


@scenario(FEATURE, "PUT con flag inválido retorna 400")
def test_put_invalid_flag():
    pass


@scenario(FEATURE, "Toggle imágenes desactiva la generación")
def test_toggle_images_off():
    pass


# ── Given ──────────────────────────────────────────────────────────────────────


@given(parsers.parse('la tabla PlatformConfig no tiene entrada "{key}"'))
def no_db_entry(ctx, key):
    ctx["box"]["data"] = {}


@given("la tabla PlatformConfig está vacía")
def db_empty(ctx):
    ctx["box"]["data"] = {}


@given('ova_images está en "0" vía nodes_config store')
def images_off_in_store(ctx):
    ctx["box"]["data"] = {"ova_images": "0"}


# ── When ───────────────────────────────────────────────────────────────────────


@when("el admin llama GET /api/admin/nodes-config", target_fixture="response")
def get_nodes(ctx):
    return ctx["client"].get(_URL)


@when(
    parsers.parse(
        'el admin llama PUT /api/admin/nodes-config con ova_critic "{critic}" y ova_reflection_rounds {rounds:d}'
    ),
    target_fixture="response",
)
def put_nodes_critic_rounds(ctx, critic, rounds):
    return ctx["client"].put(_URL, json={"ova_critic": critic, "ova_reflection_rounds": rounds})


@when(
    parsers.parse('el admin llama PUT /api/admin/nodes-config con ova_critic "{flag}"'),
    target_fixture="response",
)
def put_nodes_invalid(ctx, flag):
    return ctx["client"].put(_URL, json={"ova_critic": flag})


@when("se llama get_nodes_config", target_fixture="nc_result")
def call_get_nodes_config(ctx):
    return nc_mod.get_nodes_config()


# ── Then ───────────────────────────────────────────────────────────────────────


@then(parsers.parse("la respuesta incluye nodes con al menos {n:d} nodos"))
def nodes_count(response, n):
    assert response.status_code == 200, response.text
    body = response.json()
    assert len(body["nodes"]) >= n, f"expected >= {n} nodes, got {len(body['nodes'])}"


@then(parsers.parse('config.ova_images es "{val}"'))
def config_images(response, val):
    assert response.json()["config"]["ova_images"] == val


@then(parsers.parse('config.ova_critic es "{val}"'))
def config_critic(response, val):
    assert response.json()["config"]["ova_critic"] == val


@then(parsers.parse('la respuesta incluye config.ova_critic igual a "{val}"'))
def put_critic_is(response, val):
    assert response.status_code == 200, response.text
    assert response.json()["config"]["ova_critic"] == val


@then(parsers.parse("config.ova_reflection_rounds igual a {val:d}"))
def put_rounds_is(response, val):
    assert response.json()["config"]["ova_reflection_rounds"] == val


@then(parsers.parse("la respuesta tiene status {code:d}"))
def status_is(response, code):
    assert response.status_code == code, response.text


@then(parsers.parse('ova_images es "{val}"'))
def nc_images_val(nc_result, val):
    assert nc_result["ova_images"] == val
