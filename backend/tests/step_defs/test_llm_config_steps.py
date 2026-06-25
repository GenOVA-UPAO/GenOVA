"""BDD de la API admin de config de modelos LLM (EN-014) determinista: SQLite
in-memory + app FastAPI mínima (platform_settings_router) + overrides. Sin backend
vivo ni red.

`require_admin` corre de verdad contra la BD sembrada (roles + user_roles), así que
el 403 del no-admin es real. La persistencia del store (PlatformConfig vía
SessionLocal global) se reemplaza por un dict en proceso por escenario, de modo que
GET/PUT y el merge semilla⊕admin de `effective_llm_config()` se ejercitan sin tocar
Postgres. `sanitize_config` corre real (valida contra el catálogo).
"""

import os
import sys
import uuid

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import pytest  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from pytest_bdd import given, parsers, scenario, then, when  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import models  # noqa: E402, F401 — registra los modelos ORM
from auth.dependencies import get_current_user  # noqa: E402
from core.database import get_db  # noqa: E402
from core.rate_limit import limiter  # noqa: E402
from llm.utils import llm_config_store  # noqa: E402
from users.admin.platform_settings_router import router as admin_router  # noqa: E402

_FEATURES = os.path.join(os.path.dirname(__file__), "..", "..", "..", "tests", "features")
FEATURE = os.path.join(_FEATURES, "admin", "EN-014_llm-config.feature")

# Solo las tablas que require_admin consulta (TEXT en vez de UUID/JSONB de PG).
_DDL = """
CREATE TABLE roles (
  id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, permissions TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE user_roles (
  user_id TEXT NOT NULL, role_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);
"""


def _split_model(spec: str) -> tuple[str, str]:
    """'openrouter/deepseek/deepseek-v4-flash' → ('openrouter', 'deepseek/deepseek-v4-flash')."""
    provider, _, model_id = spec.partition("/")
    return provider, model_id


class _Principal:
    """Sustituto liviano de User: require_admin solo usa `.id`."""

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

    # UUID(as_uuid=True) en sqlite guarda el .hex; sembramos con .hex y pasamos
    # objetos uuid al principal para que los binds (==) coincidan.
    admin_uid, user_uid = uuid.uuid4(), uuid.uuid4()
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

    # Persistencia del store en proceso: evita la SessionLocal global / Postgres.
    # sanitize_config sigue real → valida contra el catálogo.
    box = {"data": {}}
    monkeypatch.setattr(
        llm_config_store, "save_stored", lambda clean: box.__setitem__("data", clean)
    )
    monkeypatch.setattr(llm_config_store, "stored_cached", lambda: box["data"])

    limiter.enabled = False  # SlowAPI tiene estado global → desactivar evita fugas.

    active = {"id": admin_uid}

    app = FastAPI()
    app.state.limiter = limiter
    app.include_router(admin_router, prefix="/api/admin")
    app.dependency_overrides[get_db] = _get_db_override
    app.dependency_overrides[get_current_user] = lambda: _Principal(active["id"])

    return {
        "client": TestClient(app),
        "active": active,
        "admin_uid": admin_uid,
        "user_uid": user_uid,
    }


_URL = "/api/admin/llm-config"


# ── Scenarios ─────────────────────────────────────────────────────────────────


@scenario(FEATURE, "Admin obtiene la configuración efectiva")
def test_admin_get():
    pass


@scenario(FEATURE, "Admin guarda una configuración válida y se refleja")
def test_admin_put_valid():
    pass


@scenario(FEATURE, "Un modelo invalido se descarta y cae a la semilla")
def test_admin_put_invalid():
    pass


@scenario(FEATURE, "Un usuario no admin no puede leer la config")
def test_user_get_forbidden():
    pass


@scenario(FEATURE, "Un usuario no admin no puede guardar la config")
def test_user_put_forbidden():
    pass


# ── Given ─────────────────────────────────────────────────────────────────────


@given("que estoy autenticado como administrador")
def auth_admin(ctx):
    ctx["active"]["id"] = ctx["admin_uid"]


@given("que estoy autenticado como usuario normal")
def auth_user(ctx):
    ctx["active"]["id"] = ctx["user_uid"]  # sin rol administrador → require_admin 403


# ── When ──────────────────────────────────────────────────────────────────────


@when("solicito la configuración de modelos", target_fixture="response")
def get_config(ctx):
    return ctx["client"].get(_URL)


@when(parsers.parse('guardo el modelo de codigo como "{spec}"'), target_fixture="response")
def put_codigo(ctx, spec):
    provider, model_id = _split_model(spec)
    body = {"defaults": {"codigo": {"provider": provider, "model_id": model_id}}, "fallbacks": {}}
    return ctx["client"].put(_URL, json=body)


@when(parsers.parse('intento guardar el modelo de codigo como "{spec}"'), target_fixture="response")
def put_codigo_intento(ctx, spec):
    return put_codigo(ctx, spec)


# ── Then ──────────────────────────────────────────────────────────────────────


@then(parsers.parse("la respuesta es {code:d}"))
def status_is(response, code):
    assert response.status_code == code


@then(parsers.parse('la config incluye las tareas "{t1}", "{t2}", "{t3}", "{t4}"'))
def config_tasks(response, t1, t2, t3, t4):
    defaults = response.json()["config"]["defaults"]
    for t in (t1, t2, t3, t4):
        assert t in defaults, f"falta tarea {t}"


@then("cada tarea tiene un modelo primario por defecto")
def each_task_default(response):
    for tarea, entry in response.json()["config"]["defaults"].items():
        assert entry.get("provider") and entry.get("model_id"), f"{tarea} sin modelo"


@then(parsers.parse('al consultar la config el modelo de codigo es "{spec}"'))
def codigo_is(ctx, spec):
    provider, model_id = _split_model(spec)
    cod = ctx["client"].get(_URL).json()["config"]["defaults"]["codigo"]
    assert (cod["provider"], cod["model_id"]) == (provider, model_id)


@then(parsers.parse('al consultar la config el modelo de codigo no es "{spec}"'))
def codigo_is_not(ctx, spec):
    provider, model_id = _split_model(spec)
    cod = ctx["client"].get(_URL).json()["config"]["defaults"]["codigo"]
    assert (cod["provider"], cod["model_id"]) != (provider, model_id)
