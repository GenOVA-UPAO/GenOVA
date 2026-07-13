"""Tests for LangSmith opt-in init (no network)."""

import os

from core import observability


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
