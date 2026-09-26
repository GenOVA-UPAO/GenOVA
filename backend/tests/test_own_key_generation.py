"""Los modelos elegidos con clave propia se llaman con esa clave."""

from __future__ import annotations

import pytest

import llm.router as router
from llm.utils import llm_helpers
from llm.utils.llm_helpers import OWNER_FIELD, _resolve_primary, with_owner


@pytest.fixture
def user_keys(monkeypatch):
    keys: dict[str, dict[str, str]] = {"u1": {"groq": "gsk-propia"}}
    monkeypatch.setattr("llm.clients.clients.get_user_keys", lambda uid: keys.get(uid, {}))
    return keys


def test_with_owner_solo_guarda_el_id():
    config = with_owner({"texto": {"provider": "groq"}}, "u1")
    assert config[OWNER_FIELD] == "u1"
    assert "gsk" not in repr(config)


def test_modelo_del_catalogo_propio_se_respeta(user_keys, monkeypatch):
    monkeypatch.setattr(llm_helpers, "is_valid_model", lambda p, m: False)
    config = with_owner({"texto": {"provider": "groq", "model_id": "moonshotai/kimi-k2"}}, "u1")
    (provider, model_id, _), _ = _resolve_primary("texto", config, enabled_models=[])
    assert (provider, model_id) == ("groq", "moonshotai/kimi-k2")


def test_sin_clave_propia_no_se_acepta_un_modelo_fuera_de_la_lista(user_keys, monkeypatch):
    monkeypatch.setattr(llm_helpers, "is_valid_model", lambda p, m: False)
    config = with_owner({"texto": {"provider": "opencode", "model_id": "x/y"}}, "u1")
    (provider, model_id, _), _ = _resolve_primary("texto", config, enabled_models=[])
    assert (provider, model_id) != ("opencode", "x/y")


def test_la_llamada_usa_la_clave_propia(user_keys, monkeypatch):
    seen: list[tuple[str, str | None]] = []

    def fake_chat(provider, model_id, prompt, max_tokens, extra, timeout=None, key=None):
        seen.append((provider, key))
        return "ok"

    monkeypatch.setattr(router, "_chat", fake_chat)
    monkeypatch.setattr(llm_helpers, "is_valid_model", lambda p, m: True)
    config = with_owner({"texto": {"provider": "groq", "model_id": "llama"}}, "u1")
    assert router.generar_texto("hola", "texto", llm_config=config) == "ok"
    assert seen[0] == ("groq", "gsk-propia")


def test_sin_autor_se_usa_la_clave_de_plataforma(user_keys, monkeypatch):
    seen: list[str | None] = []

    def fake_chat(provider, model_id, prompt, max_tokens, extra, timeout=None, key=None):
        seen.append(key)
        return "ok"

    monkeypatch.setattr(router, "_chat", fake_chat)
    router.generar_texto("hola", "texto", llm_config={})
    assert seen == [None]
