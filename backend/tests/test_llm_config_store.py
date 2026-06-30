"""Unit tests del store de config LLM admin + accesores del router.

Puros (sin DB ni red): se monkeypatchea ``stored_cached`` para simular la config
guardada. ``sanitize_config`` valida contra el catálogo en memoria (curado).

    uv run pytest tests/test_llm_config_store.py -v
"""

import pytest

from llm import router
from llm.utils import llm_config_store as store


def test_sanitize_drops_invalid_keeps_valid():
    payload = {
        "defaults": {
            "codigo": {"provider": "openrouter", "model_id": "deepseek/deepseek-v4-flash"},
            "texto": {"provider": "bogus", "model_id": "nope"},  # provider inválido
            "razonamiento": {"provider": "groq", "model_id": "no-existe-xyz"},  # modelo inválido
        },
        "fallbacks": {
            "codigo": [
                {"provider": "groq", "model_id": "llama-3.3-70b-versatile"},
                {"provider": "x", "model_id": "y"},  # se descarta
            ]
        },
    }
    clean = store.sanitize_config(payload)
    assert clean["defaults"]["codigo"]["model_id"] == "deepseek/deepseek-v4-flash"
    assert "texto" not in clean["defaults"]
    assert "razonamiento" not in clean["defaults"]
    assert len(clean["fallbacks"]["codigo"]) == 1


def test_sanitize_empty():
    assert store.sanitize_config(None) == {"defaults": {}, "fallbacks": {}}
    assert store.sanitize_config({}) == {"defaults": {}, "fallbacks": {}}


def test_default_models_seed_without_config(monkeypatch):
    monkeypatch.setattr(store, "stored_cached", lambda: {})
    assert router._default_models()["codigo"] == router._SEED_MODELOS["codigo"]


def test_default_models_admin_override(monkeypatch):
    monkeypatch.setattr(
        store,
        "stored_cached",
        lambda: {
            "defaults": {
                "codigo": {
                    "provider": "openrouter",
                    "model_id": "deepseek/deepseek-v4-flash",
                    "extra": {},
                }
            }
        },
    )
    models = router._default_models()
    assert models["codigo"] == ("openrouter", "deepseek/deepseek-v4-flash", {})
    assert models["texto"] == router._SEED_MODELOS["texto"]  # tarea intacta = semilla


def test_fallback_chain_admin_override(monkeypatch):
    monkeypatch.setattr(
        store,
        "stored_cached",
        lambda: {
            "fallbacks": {
                "texto": [{"provider": "groq", "model_id": "llama-3.1-8b-instant", "extra": {}}]
            }
        },
    )
    assert router._fallback_chain("texto") == [("groq", "llama-3.1-8b-instant", {})]
    assert router._fallback_chain("codigo") == router._SEED_FALLBACK_CHAIN["codigo"]


def test_effective_config_shape(monkeypatch):
    monkeypatch.setattr(store, "stored_cached", lambda: {})
    eff = router.effective_llm_config()
    assert set(eff["defaults"]) == set(router._SEED_MODELOS)
    assert set(eff["fallbacks"]) == set(router._SEED_MODELOS)
    assert eff["defaults"]["codigo"]["provider"] == "opencode"


# --- _chat: opencode DeepSeek thinking-disabled injection -------------------


class _FakeClient:
    """Cliente OpenAI-compatible falso: registra kwargs y devuelve content fijo."""

    def __init__(self, sink):
        self._sink = sink

    def with_options(self, **_kw):
        return self

    @property
    def chat(self):
        return self

    @property
    def completions(self):
        return self

    def create(self, **kw):
        self._sink.update(kw)
        msg = type("M", (), {"content": "<div>ok</div>"})()
        choice = type("C", (), {"message": msg})()
        return type("R", (), {"choices": [choice]})()


def test_opencode_deepseek_thinking_disabled(monkeypatch):
    # Thinking must be DISABLED on deepseek to prevent empty content responses.
    sink = {}
    monkeypatch.setattr(router, "opencode_client", _FakeClient(sink))
    router._chat("opencode", "deepseek-v4-pro", "hola", 100, {}, None)
    assert sink.get("extra_body") == {"thinking": {"type": "disabled"}}


def test_opencode_non_deepseek_no_injection(monkeypatch):
    sink = {}
    monkeypatch.setattr(router, "opencode_client", _FakeClient(sink))
    router._chat("opencode", "otro-modelo", "hola", 100, {}, None)
    assert "extra_body" not in sink


def test_opencode_explicit_extra_body_preserved(monkeypatch):
    sink = {}
    monkeypatch.setattr(router, "opencode_client", _FakeClient(sink))
    router._chat("opencode", "deepseek-v4-pro", "hola", 100, {"extra_body": {"x": 1}}, None)
    assert sink["extra_body"] == {"x": 1}


# --- generar_texto: cadena de fallback (sin red) ----------------------------


class _ModelFake:
    """Cliente falso: devuelve content por model_id. '' / ausente → content vacío,
    lo que hace que _chat lance EmptyContentError (ruta de fallback real)."""

    def __init__(self, contents):
        self._contents = contents

    def with_options(self, **_kw):
        return self

    @property
    def chat(self):
        return self

    @property
    def completions(self):
        return self

    def create(self, model, **_kw):
        content = self._contents.get(model, "")
        msg = type("M", (), {"content": content})()
        choice = type("C", (), {"message": msg})()
        return type("R", (), {"choices": [choice]})()


@pytest.fixture(autouse=True)
def _no_sleep(monkeypatch):
    monkeypatch.setattr(router.time, "sleep", lambda *_a, **_k: None)


def _admin(monkeypatch, defaults, fallbacks):
    monkeypatch.setattr(
        store, "stored_cached", lambda: {"defaults": defaults, "fallbacks": fallbacks}
    )


def test_fallback_advances_on_empty_content(monkeypatch):
    # primario (openrouter) vacío → EmptyContentError → fallback (groq) responde.
    _admin(
        monkeypatch,
        {"codigo": {"provider": "openrouter", "model_id": "primary-x", "extra": {}}},
        {"codigo": [{"provider": "groq", "model_id": "fb-y", "extra": {}}]},
    )
    monkeypatch.setattr(router, "openrouter_client", _ModelFake({"primary-x": ""}))
    monkeypatch.setattr(router, "groq_client", _ModelFake({"fb-y": "<ok>"}))
    assert router.generar_texto("p", "codigo", 100) == "<ok>"


def test_fallback_respects_order(monkeypatch):
    # primario vacío, fallback#1 vacío, fallback#2 responde → se usa el #2.
    _admin(
        monkeypatch,
        {"codigo": {"provider": "openrouter", "model_id": "p", "extra": {}}},
        {
            "codigo": [
                {"provider": "openrouter", "model_id": "f1", "extra": {}},
                {"provider": "groq", "model_id": "f2", "extra": {}},
            ]
        },
    )
    monkeypatch.setattr(router, "openrouter_client", _ModelFake({"p": "", "f1": ""}))
    monkeypatch.setattr(router, "groq_client", _ModelFake({"f2": "segundo"}))
    assert router.generar_texto("p", "codigo", 100) == "segundo"


def test_all_models_empty_raises(monkeypatch):
    _admin(
        monkeypatch,
        {"codigo": {"provider": "openrouter", "model_id": "p", "extra": {}}},
        {"codigo": [{"provider": "groq", "model_id": "f", "extra": {}}]},
    )
    monkeypatch.setattr(router, "openrouter_client", _ModelFake({"p": ""}))
    monkeypatch.setattr(router, "groq_client", _ModelFake({"f": ""}))
    with pytest.raises(router.EmptyContentError):
        router.generar_texto("p", "codigo", 100)


def test_primary_success_skips_fallback(monkeypatch):
    _admin(
        monkeypatch,
        {"texto": {"provider": "groq", "model_id": "good", "extra": {}}},
        {"texto": [{"provider": "openrouter", "model_id": "never", "extra": {}}]},
    )
    monkeypatch.setattr(router, "groq_client", _ModelFake({"good": "primario"}))
    # openrouter_client lanzaría KeyError si se invocara → confirma que no se usa.
    monkeypatch.setattr(router, "openrouter_client", _ModelFake({}))
    assert router.generar_texto("p", "texto", 100) == "primario"
