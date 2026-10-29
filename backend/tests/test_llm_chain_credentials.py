"""La cadena de modelos salta los proveedores sin clave (sin red ni BD).

Bug observado: con solo la clave de plataforma de OpenRouter, la cadena de
`codigo` probaba OpenCode (401) → OpenRouter `:free` (429) → Groq (401 «Invalid
API Key») y el recurso fallaba. Ahora los eslabones sin clave no se llaman.
"""

import pytest

import llm.router as router

LLMNoCredentialsError = router.LLMNoCredentialsError
generar_texto = router.generar_texto
from llm.utils import llm_config_store
from llm.utils.llm_helpers import OWNER_FIELD


@pytest.fixture
def cadena(monkeypatch):
    """codigo: opencode (primario) → openrouter → groq."""
    monkeypatch.setattr(
        llm_config_store,
        "stored_cached",
        lambda: {
            "defaults": {"codigo": {"provider": "opencode", "model_id": "oc-1", "extra": {}}},
            "fallbacks": {
                "codigo": [
                    {"provider": "openrouter", "model_id": "or-1", "extra": {}},
                    {"provider": "groq", "model_id": "gq-1", "extra": {}},
                ]
            },
        },
    )
    monkeypatch.setattr(router.time, "sleep", lambda *_a, **_k: None)


@pytest.fixture
def llamadas(monkeypatch):
    calls: list[tuple[str, str]] = []

    def fake_chat(provider, model_id, prompt, max_tokens, extra, timeout=None, key=None):
        calls.append((provider, model_id))
        return f"ok:{provider}"

    monkeypatch.setattr(router, "_chat", fake_chat)
    return calls


def _claves(monkeypatch, **keys):
    monkeypatch.setattr(router, "_get_provider_key", lambda p: keys.get(p))


def test_solo_openrouter_salta_opencode_y_groq(cadena, llamadas, monkeypatch):
    _claves(monkeypatch, openrouter="sk-or")
    assert generar_texto("p", "codigo", 100) == "ok:openrouter"
    assert llamadas == [("openrouter", "or-1")]


def test_con_todas_las_claves_la_cadena_no_cambia(cadena, llamadas, monkeypatch):
    _claves(monkeypatch, opencode="a", openrouter="b", groq="c")
    assert generar_texto("p", "codigo", 100) == "ok:opencode"
    assert llamadas == [("opencode", "oc-1")]


def test_sin_ninguna_clave_error_claro_sin_llamar(cadena, llamadas, monkeypatch):
    _claves(monkeypatch)
    with pytest.raises(LLMNoCredentialsError, match="Ningún proveedor"):
        generar_texto("p", "codigo", 100)
    assert llamadas == []


def test_la_clave_propia_del_autor_cuenta(cadena, llamadas, monkeypatch):
    _claves(monkeypatch)  # sin claves de plataforma
    monkeypatch.setattr("llm.clients.clients.get_user_keys", lambda uid: {"groq": "gsk-propia"})
    assert generar_texto("p", "codigo", 100, llm_config={OWNER_FIELD: "u1"}) == "ok:groq"
    assert llamadas == [("groq", "gq-1")]


def test_saltado_y_fallo_real_sigue_la_cadena(cadena, monkeypatch):
    """Los saltados no alteran el recorrido: el fallo del primer usable pasa al siguiente."""
    from llm.utils.llm_helpers import EmptyContentError

    _claves(monkeypatch, openrouter="b", groq="c")
    calls = []

    def fake_chat(provider, model_id, *a, **k):
        calls.append(provider)
        if provider == "openrouter":
            raise EmptyContentError("vacío")
        return "ok"

    monkeypatch.setattr(router, "_chat", fake_chat)
    assert generar_texto("p", "codigo", 100) == "ok"
    assert calls == ["openrouter", "groq"]


def test_la_clave_se_consulta_una_vez_por_proveedor(cadena, llamadas, monkeypatch):
    consultas: list[str] = []

    def key(p):
        consultas.append(p)
        return None if p == "opencode" else "k"

    monkeypatch.setattr(router, "_get_provider_key", key)
    monkeypatch.setattr(
        llm_config_store,
        "stored_cached",
        lambda: {
            "defaults": {"codigo": {"provider": "opencode", "model_id": "oc-1", "extra": {}}},
            "fallbacks": {
                "codigo": [
                    {"provider": "opencode", "model_id": "oc-2", "extra": {}},
                    {"provider": "groq", "model_id": "gq-1", "extra": {}},
                ]
            },
        },
    )
    generar_texto("p", "codigo", 100)
    assert consultas.count("opencode") == 1
