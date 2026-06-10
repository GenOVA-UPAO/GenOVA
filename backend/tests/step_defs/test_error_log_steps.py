"""EN-012 — BDD steps for the generation error logger.

These run against an in-memory SQLite session (no live backend, no Supabase):
`log_generation_error()` exposes no HTTP endpoint, so we exercise the
service → model boundary directly. `DATABASE_URL` is set to SQLite *before*
importing `database`/`models` so the app modules bind to the throwaway engine.
"""
import os
import sys
import uuid

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
# Make `backend/` importable (ova, database, users) regardless of pytest rootdir.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import pytest  # noqa: E402
from pytest_bdd import given, parsers, scenario, then, when  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from generation.error_log_model import OvaErrorLog  # noqa: E402
from generation.error_log_service import _sanitize, log_generation_error  # noqa: E402

_FEATURES = os.path.join(os.path.dirname(__file__), "..", "..", "..", "tests", "features")
FEATURE = os.path.join(_FEATURES, "setup", "EN-012_error-log.feature")

# SQLite-compatible DDL (Postgres uses migration 018 + gen_random_uuid()).
_DDL = """
CREATE TABLE ova_error_logs (
    error_id TEXT PRIMARY KEY,
    ova_id TEXT,
    job_id TEXT,
    job_resource_id TEXT,
    user_id TEXT,
    error_category VARCHAR(20) NOT NULL DEFAULT 'other',
    message TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""

_API_KEY = "sk-livesecret0123456789ABCDEFghijklmnop"


@pytest.fixture
def db():
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
    with engine.begin() as conn:
        conn.execute(text(_DDL))
    session = sessionmaker(bind=engine, future=True)()
    try:
        yield session
    finally:
        session.close()


class _BrokenSession:
    """Session whose commit raises — simulates a transient write failure (R7)."""

    def add(self, _obj):
        pass

    def commit(self):
        raise RuntimeError("temporary write unavailability")

    def rollback(self):
        pass


# Scenario 1: Registrar un error con Error ID (R1, R2, R3, R5)
@scenario(FEATURE, "Registrar un error con Error ID")
def test_registrar_error_con_id():
    pass


@given("un recurso cuya generación falla tras agotar reintentos", target_fixture="ctx")
def recurso_falla():
    return {
        "ova_id": uuid.uuid4(),
        "user_id": uuid.uuid4(),
        "job_resource_id": uuid.uuid4(),
        "message": "model returned empty completion after 3 retries",
        "category": "model_error",
    }


@when("el backend registra el error", target_fixture="error_id")
def registra_error(db, ctx):
    return log_generation_error(
        db,
        message=ctx["message"],
        error_category=ctx["category"],
        user_id=ctx.get("user_id"),
        ova_id=ctx.get("ova_id"),
        job_resource_id=ctx.get("job_resource_id"),
    )


@then('se crea una fila en "ova_error_logs" con un Error ID único')
def fila_creada(db, error_id):
    rows = db.query(OvaErrorLog).all()
    assert len(rows) == 1
    assert str(rows[0].error_id) == error_id
    uuid.UUID(error_id)  # opaque, parseable UUID


@then("el registro incluye categoría, ova_id, recurso y timestamp")
def registro_incluye_contexto(db, ctx):
    row = db.query(OvaErrorLog).one()
    assert row.error_category == ctx["category"]
    assert str(row.ova_id) == str(ctx["ova_id"])
    assert str(row.job_resource_id) == str(ctx["job_resource_id"])
    assert str(row.user_id) == str(ctx["user_id"])
    assert row.created_at is not None


@then("el Error ID guardado coincide con el expuesto al usuario")
def error_id_coincide(db, error_id):
    row = db.query(OvaErrorLog).one()
    assert str(row.error_id) == error_id


# Scenario 2: Categoría inválida cae a "other" (R3)
@scenario(FEATURE, 'Categoría inválida cae a "other"')
def test_categoria_invalida():
    pass


@given("un error con una categoría desconocida", target_fixture="ctx")
def error_categoria_desconocida():
    return {"message": "boom", "category": "no-such-category"}


@then(parsers.parse('la categoría almacenada es "{cat}"'))
def categoria_almacenada(db, cat):
    row = db.query(OvaErrorLog).one()
    assert row.error_category == cat


# Scenario 3: El registro no filtra secretos (R4)
@scenario(FEATURE, "El registro no filtra secretos")
def test_no_filtra_secretos():
    pass


@given("un error cuyo mensaje interno contiene una API key", target_fixture="ctx")
def error_con_api_key():
    return {
        "message": (
            f"call failed: api_key={_API_KEY} "
            f"Authorization: Bearer {_API_KEY} GEMINI_API_KEY={_API_KEY}"
        ),
        "category": "model_error",
    }


@when("se registra el error", target_fixture="error_id")
def se_registra_el_error(db, ctx):
    return log_generation_error(db, message=ctx["message"], error_category=ctx["category"])


@then("el registro almacenado no contiene la API key ni tokens")
def registro_sin_secretos(db):
    row = db.query(OvaErrorLog).one()
    assert _API_KEY not in row.message
    assert "Bearer " + _API_KEY not in row.message
    assert "[REDACTED]" in row.message
    # _sanitize is the single source of truth — same guarantee on raw input.
    assert _API_KEY not in _sanitize(f"key={_API_KEY}")


# Scenario 4: Un fallo al registrar no interrumpe la generación (R6, R7)
@scenario(FEATURE, "Un fallo al registrar no interrumpe la generación")
def test_fallo_no_interrumpe():
    pass


@given("una indisponibilidad temporal al escribir el log de error", target_fixture="ctx")
def indisponibilidad_temporal():
    return {"session": _BrokenSession(), "continued": False}


@when("el backend intenta registrar el error", target_fixture="error_id")
def intenta_registrar(ctx):
    # If log_generation_error raised, this assignment never runs (test fails).
    eid = log_generation_error(ctx["session"], message="boom while writing log")
    ctx["continued"] = True  # generation flow reaches the next line
    return eid


@then("la generación del resto de recursos continúa")
def generacion_continua(ctx):
    assert ctx["continued"] is True


@then("el helper devuelve igualmente un Error ID")
def helper_devuelve_error_id(error_id):
    assert error_id
    uuid.UUID(error_id)
