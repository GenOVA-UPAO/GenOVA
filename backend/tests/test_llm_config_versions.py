"""Perfiles de modelos, historial con deshacer y endpoints de prueba (admin y
usuario). Sin Postgres ni red: la tabla key/value se sustituye por un dict y la
BD de roles es SQLite en memoria (require_admin corre de verdad).

    uv run pytest tests/test_llm_config_versions.py -v
"""

import os
import uuid

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")

import pytest  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import models  # noqa: E402, F401 — registra los modelos ORM
from auth.dependencies import get_current_user  # noqa: E402
from core.database import get_db  # noqa: E402
from core.rate_limit import limiter  # noqa: E402
from llm.utils import llm_config_store, model_probe  # noqa: E402
from llm.utils import llm_config_versions as versions  # noqa: E402
from users.interface.http.admin_platform_settings_router import router as admin_router  # noqa: E402
from users.interface.http.settings_model_test_router import router as user_router  # noqa: E402

FLASH = {"provider": "openrouter", "model_id": "deepseek/deepseek-v4-flash"}
GROQ_20B = {"provider": "groq", "model_id": "openai/gpt-oss-20b"}
GROQ_120B = {"provider": "groq", "model_id": "openai/gpt-oss-120b"}
LABELS = {
    ("openrouter", "deepseek/deepseek-v4-flash"): "DeepSeek V4 Flash",
    ("groq", "openai/gpt-oss-20b"): "GPT-OSS 20B",
    ("groq", "openai/gpt-oss-120b"): "GPT-OSS 120B",
}

_DDL = """
CREATE TABLE roles (
  id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, permissions TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE user_roles (
  user_id TEXT NOT NULL, role_id TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);
"""


def _cfg(texto=None, fallbacks=None, video=False):
    defaults = {"texto": texto} if texto else {}
    fbs = {"texto": fallbacks} if fallbacks else {}
    return {"defaults": defaults, "fallbacks": fbs, "generation_enabled": {"video": video}}


@pytest.fixture
def kv(monkeypatch):
    """PlatformConfig en memoria (la config, el historial y los perfiles)."""
    box: dict = {}
    monkeypatch.setattr(llm_config_store, "read_platform_json", lambda key: box.get(key))
    monkeypatch.setattr(
        llm_config_store, "write_platform_json", lambda key, value: box.__setitem__(key, value)
    )
    monkeypatch.setattr(
        llm_config_store,
        "stored_cached",
        lambda: box.get(llm_config_store.PLATFORM_KEY) or {},
    )
    monkeypatch.setattr(
        llm_config_store,
        "save_stored",
        lambda clean: box.__setitem__(llm_config_store.PLATFORM_KEY, clean),
    )
    monkeypatch.setattr(versions, "model_labels", lambda: dict(LABELS))
    return box


# ── Diferencias en lenguaje humano ─────────────────────────────────────────────


def test_describe_changes_primary_fallbacks_and_flags():
    before = _cfg(texto=FLASH, fallbacks=[GROQ_20B])
    after = _cfg(texto=GROQ_120B, fallbacks=[], video=True)
    texts = [c["text"] for c in versions.describe_changes(before, after, LABELS)]
    assert texts == [
        "Texto: DeepSeek V4 Flash → GPT-OSS 120B",
        "Texto, respaldos: GPT-OSS 20B → ninguno",
        "Video, generación: desactivada → activada",
    ]


def test_describe_changes_ignores_extra_and_order_of_keys():
    a = _cfg(texto={**FLASH, "extra": {}, "timeout_s": 30})
    b = _cfg(texto=FLASH)
    assert versions.describe_changes(a, b, LABELS) == []


def test_describe_changes_unknown_model_uses_id():
    after = _cfg(texto={"provider": "openrouter", "model_id": "vendor/nuevo"})
    [change] = versions.describe_changes(_cfg(), after, LABELS)
    assert change["text"] == "Texto: sin modelo → vendor/nuevo"


def test_display_name_strips_repeated_vendor():
    assert versions.display_name("DeepSeek: DeepSeek V4.1 Flash", "x") == "DeepSeek V4.1 Flash"
    assert versions.display_name("Meta: Llama 3.3", "x") == "Meta: Llama 3.3"
    assert versions.display_name(None, "vendor/model") == "vendor/model"


# ── Historial ──────────────────────────────────────────────────────────────────


class _User:
    def __init__(self, uid=None, full_name="Ana Quispe", email="ana@upao.edu.pe", keys=None):
        self.id = uid or uuid.uuid4()
        self.full_name = full_name
        self.email = email
        self.user_api_keys = keys or {}


def test_record_change_skips_noop_and_caps_entries(kv, monkeypatch):
    user = _User()
    assert versions.record_change(_cfg(texto=FLASH), _cfg(texto=FLASH), user) is None
    monkeypatch.setattr(versions, "HISTORY_LIMIT", 3)
    for i in range(5):
        a = _cfg(texto=FLASH if i % 2 else GROQ_20B)
        b = _cfg(texto=GROQ_20B if i % 2 else FLASH)
        entry = versions.record_change(a, b, user)
        assert entry is not None and "before" not in entry
    history = versions.load_history()
    assert len(history) == 3
    assert history[0]["actor"] == {"id": str(user.id), "name": "Ana Quispe"}


def test_record_change_never_raises(monkeypatch):
    def broken(*_a):
        raise RuntimeError("db down")

    monkeypatch.setattr(llm_config_store, "read_platform_json", broken)
    monkeypatch.setattr(llm_config_store, "write_platform_json", broken)
    monkeypatch.setattr(versions, "model_labels", lambda: {})
    assert versions.record_change(_cfg(texto=FLASH), _cfg(texto=GROQ_20B), _User()) is None


# ── Perfiles (dominio) ─────────────────────────────────────────────────────────


def test_profiles_crud_and_validation(kv, monkeypatch):
    user = _User()
    p = versions.create_profile("  Económico  ", _cfg(texto=GROQ_20B), user)
    assert p["name"] == "Económico"
    with pytest.raises(versions.ProfileError) as dup:
        versions.create_profile("económico", _cfg(), user)
    assert dup.value.code == "duplicate_name"
    with pytest.raises(versions.ProfileError) as empty:
        versions.create_profile("   ", _cfg(), user)
    assert empty.value.code == "invalid_name"
    with pytest.raises(versions.ProfileError):
        versions.create_profile("x" * (versions.NAME_MAX + 1), _cfg(), user)

    renamed = versions.rename_profile(p["id"], "Barato")
    assert renamed["name"] == "Barato"
    versions.delete_profile(p["id"])
    assert versions.load_profiles() == []
    with pytest.raises(versions.ProfileError) as missing:
        versions.delete_profile(p["id"])
    assert missing.value.code == "not_found"

    monkeypatch.setattr(versions, "PROFILES_LIMIT", 1)
    versions.create_profile("Uno", _cfg(), user)
    with pytest.raises(versions.ProfileError) as full:
        versions.create_profile("Dos", _cfg(), user)
    assert full.value.code == "limit_reached"


# ── API ────────────────────────────────────────────────────────────────────────


class _Principal:
    def __init__(self, uid, keys=None):
        self.id = uid
        self.full_name = "Admin GenOVA"
        self.email = "admin@genova.ai"
        self.user_api_keys = keys or {}


@pytest.fixture
def api(kv, monkeypatch):
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
    admin_uid, user_uid, role_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    with eng.begin() as conn:
        conn.execute(
            text("INSERT INTO roles (id, name) VALUES (:i, 'administrador')"), {"i": role_id.hex}
        )
        conn.execute(
            text("INSERT INTO user_roles (user_id, role_id) VALUES (:u, :r)"),
            {"u": admin_uid.hex, "r": role_id.hex},
        )
    Session = sessionmaker(bind=eng, autoflush=False, autocommit=False, future=True)

    def _db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    limiter.enabled = False
    model_probe.probe_throttle.reset()
    monkeypatch.setattr(model_probe.settings, "llm_fake", True)
    principal = {"p": _Principal(admin_uid)}

    app = FastAPI()
    app.state.limiter = limiter
    app.include_router(admin_router, prefix="/api/admin")
    app.include_router(user_router, prefix="/api/users")
    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_current_user] = lambda: principal["p"]

    def as_user(keys=None):
        principal["p"] = _Principal(user_uid, keys)

    return {"client": TestClient(app), "as_user": as_user, "kv": kv}


def _put(client, texto, fallbacks=None):
    body = {"defaults": {"texto": texto}, "fallbacks": {"texto": fallbacks or []}}
    return client.put("/api/admin/llm-config", json=body)


def test_put_records_history_and_undo_restores(api):
    c = api["client"]
    first = _put(c, FLASH)
    assert first.status_code == 200
    r = _put(c, GROQ_120B)
    entry = r.json()["history_entry"]
    assert entry is not None
    assert any(ch["text"] == "Texto: DeepSeek V4 Flash → GPT-OSS 120B" for ch in entry["changes"])
    assert entry["source"] == "manual"

    same = _put(c, GROQ_120B)
    assert same.json()["history_entry"] is None  # nada cambió, nada se anota

    undo = c.post(f"/api/admin/llm-config/history/{entry['id']}/restore", json={"target": "before"})
    assert undo.status_code == 200
    assert undo.json()["config"]["defaults"]["texto"]["model_id"] == FLASH["model_id"]
    assert undo.json()["history_entry"]["source"] == "undo"

    hist = c.get("/api/admin/llm-config/history").json()
    assert [e["source"] for e in hist["entries"]][:2] == ["undo", "manual"]
    assert "before" not in hist["entries"][0]

    redo = c.post(f"/api/admin/llm-config/history/{entry['id']}/restore")
    assert redo.json()["config"]["defaults"]["texto"]["model_id"] == GROQ_120B["model_id"]


def test_restore_unknown_entry_and_bad_target(api):
    c = api["client"]
    assert c.post("/api/admin/llm-config/history/nope/restore").status_code == 404
    _put(c, FLASH)
    entry = _put(c, GROQ_120B).json()["history_entry"]
    bad = c.post(f"/api/admin/llm-config/history/{entry['id']}/restore", json={"target": "x"})
    assert bad.status_code == 422


def test_profiles_api_flow(api):
    c = api["client"]
    _put(c, FLASH, [GROQ_20B])
    created = c.post("/api/admin/llm-profiles", json={"name": "Calidad"})
    assert created.status_code == 201
    profile = created.json()["profile"]
    assert profile["changes"] == []  # es la config actual
    assert profile["config"]["defaults"]["texto"] == FLASH

    assert c.post("/api/admin/llm-profiles", json={"name": "calidad"}).status_code == 409
    assert c.post("/api/admin/llm-profiles", json={"name": ""}).status_code == 422

    _put(c, GROQ_120B)
    listed = c.get("/api/admin/llm-profiles").json()["profiles"]
    texts = [ch["text"] for ch in listed[0]["changes"]]
    assert "Texto: GPT-OSS 120B → DeepSeek V4 Flash" in texts

    applied = c.post(f"/api/admin/llm-profiles/{profile['id']}/apply")
    assert applied.status_code == 200
    body = applied.json()
    assert body["config"]["defaults"]["texto"] == {**FLASH, "extra": {}}
    assert body["history_entry"]["source"] == "profile"
    assert body["history_entry"]["detail"] == "Calidad"
    assert body["incomplete"] is False

    renamed = c.patch(f"/api/admin/llm-profiles/{profile['id']}", json={"name": "Calidad alta"})
    assert renamed.json()["profile"]["name"] == "Calidad alta"
    deleted = c.delete(f"/api/admin/llm-profiles/{profile['id']}")
    assert deleted.status_code == 204
    gone = c.post(f"/api/admin/llm-profiles/{profile['id']}/apply")
    assert gone.status_code == 404


def test_apply_profile_flags_dropped_models(api):
    c = api["client"]
    api["kv"][versions.PROFILES_KEY] = [
        {
            "id": "abc",
            "name": "Viejo",
            "config": _cfg(texto={"provider": "openrouter", "model_id": "ya/no-existe"}),
        }
    ]
    body = c.post("/api/admin/llm-profiles/abc/apply").json()
    assert body["incomplete"] is True


def test_admin_endpoints_forbidden_for_users(api):
    api["as_user"]()
    c = api["client"]
    assert c.get("/api/admin/llm-profiles").status_code == 403
    assert c.post("/api/admin/llm-profiles", json={"name": "x"}).status_code == 403
    assert c.get("/api/admin/llm-config/history").status_code == 403
    assert c.post("/api/admin/llm-config/history/x/restore").status_code == 403
    body = {"provider": "groq", "model_id": "openai/gpt-oss-20b"}
    assert c.post("/api/admin/llm-config/test-model", json=body).status_code == 403
    assert c.post("/api/admin/platform-config/groq/check").status_code == 403


def test_admin_test_model_fake_and_validation(api, monkeypatch):
    c = api["client"]
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-servidor-1234")
    r = c.post(
        "/api/admin/llm-config/test-model",
        json={"provider": "openrouter", "model_id": "deepseek/deepseek-v4-flash"},
    )
    assert r.status_code == 200
    out = r.json()
    assert out["ok"] is True and out["simulated"] is True and out["key_source"] == "server"
    assert "sk-or-servidor" not in r.text

    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    no_key = c.post(
        "/api/admin/llm-config/test-model",
        json={"provider": "groq", "model_id": "openai/gpt-oss-20b"},
    ).json()
    assert no_key["code"] == "no_key"

    img = c.post("/api/admin/llm-config/test-model", json={"provider": "runware", "model_id": "x"})
    assert img.status_code == 422


def test_test_model_is_throttled_per_person(api, monkeypatch):
    c = api["client"]
    monkeypatch.setattr(model_probe.probe_throttle, "limit", 2)
    body = {"provider": "openrouter", "model_id": "deepseek/deepseek-v4-flash"}
    assert c.post("/api/admin/llm-config/test-model", json=body).status_code == 200
    assert c.post("/api/admin/llm-config/test-model", json=body).status_code == 200
    third = c.post("/api/admin/llm-config/test-model", json=body)
    assert third.status_code == 429
    assert int(third.headers["Retry-After"]) > 0


def test_user_test_model_requires_own_key(api):
    c = api["client"]
    body = {"provider": "groq", "model_id": "openai/gpt-oss-20b"}
    api["as_user"]()
    assert c.post("/api/users/me/llm-settings/test-model", json=body).status_code == 403
    api["as_user"]({"groq": "fake-ok-12345678"})
    r = c.post("/api/users/me/llm-settings/test-model", json=body)
    assert r.status_code == 200
    assert r.json()["key_source"] == "own" and r.json()["ok"] is True
    assert "fake-ok-12345678" not in r.text


def test_user_and_admin_provider_check(api):
    c = api["client"]
    api["as_user"]({"groq": "fake-invalid-1"})
    r = c.post("/api/users/me/api-keys/groq/check")
    assert r.json()["code"] == "invalid_key"
    assert c.post("/api/users/me/api-keys/nope/check").status_code == 404
