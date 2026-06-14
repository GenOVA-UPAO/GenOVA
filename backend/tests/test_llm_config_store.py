"""Unit tests del store de config LLM admin + accesores del router.

Puros (sin DB ni red): se monkeypatchea ``stored_cached`` para simular la config
guardada. ``sanitize_config`` valida contra el catálogo en memoria (curado).

    uv run pytest tests/test_llm_config_store.py -v
"""

from llm import llm_config_store as store
from llm import router


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
