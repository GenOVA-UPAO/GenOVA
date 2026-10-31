"""Tests for LangSmith opt-in init (no network)."""

import os

import pytest
from langsmith import utils as langsmith_utils

from core import observability


def _clear_langsmith_caches() -> None:
    # langsmith cachea con lru_cache las variables de entorno que lee: sin
    # limpiarlo, el LANGSMITH_TRACING=true de un test sobrevive al delenv y el
    # resto de la suite intenta enviar trazas con la clave falsa lsv2_test_key.
    langsmith_utils.get_env_var.cache_clear()
    langsmith_utils.get_tracer_project.cache_clear()
    observability._langsmith_client.cache_clear()


@pytest.fixture(autouse=True)
def _isolate_tracing_environment(monkeypatch):
    # init_langsmith writes os.environ directly: snapshot before invoking it,
    # otherwise cleanup delenv would restore the test's true/dummy values.
    for key in ("LANGSMITH_TRACING", "LANGSMITH_API_KEY", "LANGSMITH_PROJECT",
                "LANGSMITH_HIDE_INPUTS", "LANGSMITH_HIDE_OUTPUTS"):
        monkeypatch.delenv(key, raising=False)
    _clear_langsmith_caches()
    yield
    monkeypatch.undo()
    _clear_langsmith_caches()


def test_init_langsmith_noop_without_key(monkeypatch):
    monkeypatch.setattr(observability.settings, "langsmith_api_key", "")
    monkeypatch.setattr(observability.settings, "langsmith_tracing", True)
    monkeypatch.delenv("LANGSMITH_TRACING", raising=False)
    monkeypatch.delenv("LANGSMITH_API_KEY", raising=False)
    observability.init_langsmith()
    assert os.environ.get("LANGSMITH_TRACING") is None
    assert os.environ.get("LANGSMITH_API_KEY") is None


def test_init_langsmith_sets_env_when_enabled(monkeypatch):
    monkeypatch.setattr(observability.settings, "langsmith_api_key", "lsv2_test_key")
    monkeypatch.setattr(observability.settings, "langsmith_tracing", True)
    monkeypatch.setattr(observability.settings, "langsmith_project", "genova-test")
    monkeypatch.setattr(observability.settings, "env", "dev")
    observability.init_langsmith()
    assert os.environ["LANGSMITH_TRACING"] == "true"
    assert os.environ["LANGSMITH_API_KEY"] == "lsv2_test_key"
    assert os.environ["LANGSMITH_PROJECT"] == "genova-test"
    # cleanup so other tests are not polluted
    monkeypatch.delenv("LANGSMITH_TRACING", raising=False)
    monkeypatch.delenv("LANGSMITH_API_KEY", raising=False)
    monkeypatch.delenv("LANGSMITH_PROJECT", raising=False)


def test_init_langsmith_noop_when_tracing_false(monkeypatch):
    monkeypatch.setattr(observability.settings, "langsmith_api_key", "lsv2_test_key")
    monkeypatch.setattr(observability.settings, "langsmith_tracing", False)
    monkeypatch.delenv("LANGSMITH_TRACING", raising=False)
    observability.init_langsmith()
    assert os.environ.get("LANGSMITH_TRACING") is None


def test_tracing_no_queda_activo_tras_habilitarlo(monkeypatch):
    monkeypatch.setattr(observability.settings, "langsmith_api_key", "lsv2_test_key")
    monkeypatch.setattr(observability.settings, "langsmith_tracing", True)
    observability.init_langsmith()
    assert langsmith_utils.tracing_is_enabled() is True
    monkeypatch.undo()
    _clear_langsmith_caches()
    assert os.environ.get("LANGSMITH_TRACING") != "true"
    assert langsmith_utils.tracing_is_enabled() is False
