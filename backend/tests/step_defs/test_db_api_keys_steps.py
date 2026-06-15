"""EN-018 — BDD steps for DB-first LLM API key resolution.

Patches database.SessionLocal to return a SQLite in-memory session
and resets _key_cache between tests so TTL doesn't bleed across scenarios.
"""

import os
import sys

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("GROQ_API_KEY", "")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-long-enough-for-validation")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from unittest.mock import patch  # noqa: E402

from pytest_bdd import given, scenario, then, when  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

_FEATURES = os.path.join(os.path.dirname(__file__), "..", "..", "..", "tests", "features")
FEATURE = os.path.join(_FEATURES, "setup", "EN-018_db-api-keys.feature")


def _make_sqlite_session(config_rows: dict) -> Session:
    """Return an in-memory SQLite session with PlatformConfig rows."""
    from models import PlatformConfig

    engine = create_engine("sqlite+pysqlite:///:memory:")
    PlatformConfig.__table__.create(engine)
    session = Session(engine)
    for k, v in config_rows.items():
        session.add(PlatformConfig(key=k, value=v))
    session.commit()
    return session


def _reset_key_cache():
    import llm.router as router

    with router._key_lock:
        router._key_cache.clear()


# ── Scenario 1: key from PlatformConfig ──────────────────────────────────────

@scenario(FEATURE, "resolve key from PlatformConfig when DB row exists")
def test_resolve_from_db():
    pass


@given('PlatformConfig has "groq_api_key" = "gsk_test123"')
def db_with_groq_key(request):
    _reset_key_cache()
    session = _make_sqlite_session({"groq_api_key": "gsk_test123"})
    request.node._db_session = session


@when('_get_provider_key is called for "groq"')
def call_get_provider_key(request):
    import llm.router as router

    session = request.node._db_session
    with patch("database.SessionLocal", return_value=session):
        request.node._result = router._get_provider_key("groq")


@then('the returned key is "gsk_test123"')
def assert_key_is_gsk(request):
    assert request.node._result == "gsk_test123"


# ── Scenario 2: no DB row + no env var → None ────────────────────────────────

@scenario(FEATURE, "resolve key returns None when no DB row and no env var")
def test_resolve_none():
    pass


@given('PlatformConfig has no "groq_api_key" row')
def db_without_groq_key(request):
    _reset_key_cache()
    session = _make_sqlite_session({})
    request.node._db_session = session


@given('env var "GROQ_API_KEY" is not set')
def env_no_groq_key():
    pass  # already set to "" in module header


@when('_get_provider_key is called for "groq"')  # noqa: F811 — duplicate step reuse
def call_get_provider_key_no_row(request):
    import llm.router as router

    session = request.node._db_session
    with patch("database.SessionLocal", return_value=session):
        request.node._result = router._get_provider_key("groq")


@then("the returned key is None")
def assert_key_is_none(request):
    assert request.node._result is None


# ── Scenario 3: cache TTL ─────────────────────────────────────────────────────

@scenario(FEATURE, "cache TTL — second call within 30s skips DB query")
def test_cache_ttl():
    pass


@given('PlatformConfig has "groq_api_key" = "gsk_cached"')
def db_with_cached_key(request):
    _reset_key_cache()
    session = _make_sqlite_session({"groq_api_key": "gsk_cached"})
    request.node._db_session = session
    request.node._db_call_count = 0


@when('_get_provider_key is called for "groq" twice within 30s')
def call_twice(request):
    import llm.router as router

    session = request.node._db_session
    counter = {"n": 0}

    def counting_session():
        counter["n"] += 1
        return session

    with patch("database.SessionLocal", side_effect=counting_session):
        router._get_provider_key("groq")
        router._get_provider_key("groq")

    request.node._db_call_count = counter["n"]


@then("the DB is queried only once")
def assert_db_queried_once(request):
    assert request.node._db_call_count == 1
