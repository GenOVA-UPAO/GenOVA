"""Prueba de modelo («Probar») y de conexión de proveedor: clasificación de
errores, modo LLM_FAKE, límite por persona y que la clave nunca salga.

Puros: sin red ni BD (se monkeypatchea la llamada al proveedor).

    uv run pytest tests/test_model_probe.py -v
"""

import httpx
import openai
import pytest

from llm.catalog import provider_check
from llm.utils import model_probe
from llm.utils.model_probe import ProbeThrottle, classify_probe_error, excerpt, probe_model

SECRET = "sk-or-v1-SECRETO-no-debe-salir-1234"


def _status_error(cls, code: int, message: str = "boom"):
    req = httpx.Request("POST", "https://example.test/v1/chat/completions")
    return cls(message, response=httpx.Response(code, request=req), body=None)


@pytest.mark.parametrize(
    ("exc", "code"),
    [
        (_status_error(openai.AuthenticationError, 401), "invalid_key"),
        (_status_error(openai.PermissionDeniedError, 403), "invalid_key"),
        (_status_error(openai.APIStatusError, 402, "Insufficient credits"), "no_credit"),
        (_status_error(openai.RateLimitError, 429), "rate_limited"),
        (_status_error(openai.NotFoundError, 404), "model_not_found"),
        (
            _status_error(openai.BadRequestError, 400, "foo/bar is not a valid model ID"),
            "model_not_found",
        ),
        (_status_error(openai.BadRequestError, 400, "max_tokens too large"), "error"),
        (_status_error(openai.InternalServerError, 503), "unreachable"),
        (openai.APITimeoutError(httpx.Request("POST", "https://x.test")), "timeout"),
        (openai.APIConnectionError(request=httpx.Request("POST", "https://x.test")), "unreachable"),
        (TimeoutError(), "timeout"),
        (RuntimeError("??"), "error"),
    ],
)
def test_classify_probe_error(exc, code):
    assert classify_probe_error(exc) == code


def test_classify_empty_content():
    from llm.utils.llm_helpers import EmptyContentError

    assert classify_probe_error(EmptyContentError("vacío")) == "empty"


def test_excerpt_flattens_and_truncates():
    assert excerpt("  Listo.\n\n ") == "Listo."
    long = "palabra " * 60
    out = excerpt(long)
    assert len(out) == model_probe.EXCERPT_MAX
    assert out.endswith("…")


def test_no_key_does_not_call(monkeypatch):
    monkeypatch.setattr(model_probe.settings, "llm_fake", False)
    called = []
    monkeypatch.setattr("llm.router._chat_once", lambda *a, **k: called.append(a))
    out = probe_model("groq", "llama-3.1-8b-instant", None, key_source="platform")
    assert out["ok"] is False
    assert out["code"] == "no_key"
    assert called == []


def test_fake_mode_is_deterministic(monkeypatch):
    monkeypatch.setattr(model_probe.settings, "llm_fake", True)
    a = probe_model("openrouter", "deepseek/deepseek-v4-flash", SECRET, key_source="platform")
    b = probe_model("openrouter", "deepseek/deepseek-v4-flash", SECRET, key_source="platform")
    assert a == b
    assert a["ok"] is True and a["simulated"] is True
    assert a["excerpt"] == "Listo."
    assert 240 <= a["latency_ms"] < 1140
    other = probe_model("openrouter", "anthropic/claude-haiku-4.5", SECRET, key_source="platform")
    assert other["latency_ms"] != a["latency_ms"] or other["model_id"] != a["model_id"]


def test_fake_mode_simulates_bad_keys(monkeypatch):
    monkeypatch.setattr(model_probe.settings, "llm_fake", True)
    bad = probe_model("groq", "llama-3.1-8b-instant", "fake-invalid-1", key_source="own")
    down = probe_model("groq", "llama-3.1-8b-instant", "fake-down-1", key_source="own")
    assert bad["code"] == "invalid_key"
    assert down["code"] == "unreachable"


def test_real_call_success_uses_given_key(monkeypatch):
    monkeypatch.setattr(model_probe.settings, "llm_fake", False)
    seen = {}

    def fake_chat(provider, model_id, msgs, max_tokens, extra, timeout, key):
        seen.update(provider=provider, max_tokens=max_tokens, timeout=timeout, key=key)
        return "  Listo.  ", "stop"

    monkeypatch.setattr("llm.router._chat_once", fake_chat)
    out = probe_model("openrouter", "deepseek/deepseek-v4-flash", SECRET, key_source="own")
    assert out["ok"] is True and out["code"] == "ok"
    assert out["excerpt"] == "Listo."
    assert isinstance(out["latency_ms"], int)
    assert seen["key"] == SECRET
    assert seen["max_tokens"] == model_probe.PROBE_MAX_TOKENS
    assert seen["timeout"] == model_probe.PROBE_TIMEOUT_S
    assert SECRET not in repr(out)


def test_real_call_error_never_leaks_key(monkeypatch, capsys):
    monkeypatch.setattr(model_probe.settings, "llm_fake", False)

    def fake_chat(*_a, **_k):
        raise _status_error(openai.AuthenticationError, 401, f"Incorrect API key: {SECRET}")

    monkeypatch.setattr("llm.router._chat_once", fake_chat)
    out = probe_model("openrouter", "x/y", SECRET, key_source="platform")
    assert out["code"] == "invalid_key"
    captured = capsys.readouterr()
    assert SECRET not in repr(out)
    assert SECRET not in captured.out + captured.err


def test_throttle_window():
    t = ProbeThrottle(limit=2, window_s=60)
    assert t.retry_after("u1") == 0
    assert t.retry_after("u1") == 0
    assert t.retry_after("u1") > 0
    assert t.retry_after("u2") == 0  # por persona
    t.reset()
    assert t.retry_after("u1") == 0


# ── Probar conexión ────────────────────────────────────────────────────────────


def test_check_provider_without_key():
    out = provider_check.check_provider_key("groq", None, key_source="platform")
    assert out == {"provider": "groq", "key_source": "platform", "models": None, "code": "no_key"}


def test_check_provider_image_is_unchecked():
    out = provider_check.check_provider_key("runware", "abc12345", key_source="platform")
    assert out["code"] == "unchecked"


def test_check_provider_counts_models(monkeypatch):
    monkeypatch.setattr(provider_check, "list_models_with_key", lambda p, k: {"a", "b", "c"})
    out = provider_check.check_provider_key("groq", SECRET, key_source="platform")
    assert out["code"] == "connected" and out["models"] == 3
    assert SECRET not in repr(out)


def test_check_openrouter_counts_public_catalog(monkeypatch):
    monkeypatch.setattr(provider_check, "list_models_with_key", lambda p, k: None)
    monkeypatch.setattr(
        provider_check,
        "get_full_catalog_entries",
        lambda: [
            {"provider": "openrouter", "model_id": "a", "active": True},
            {"provider": "openrouter", "model_id": "b", "active": False},
            {"provider": "groq", "model_id": "c", "active": True},
        ],
    )
    out = provider_check.check_provider_key("openrouter", SECRET, key_source="platform")
    assert out == {"provider": "openrouter", "key_source": "platform", "models": 1, "code": "connected"}


def test_check_provider_classifies_failures(monkeypatch):
    def boom(_p, _k):
        raise _status_error(openai.AuthenticationError, 401, f"bad key {SECRET}")

    monkeypatch.setattr(provider_check, "list_models_with_key", boom)
    out = provider_check.check_provider_key("groq", SECRET, key_source="own")
    assert out["code"] == "invalid_key"
    assert SECRET not in repr(out)


def test_check_provider_fake_keys(monkeypatch):
    from llm.catalog import provider_listing

    monkeypatch.setattr(provider_listing.settings, "llm_fake", True)
    ok = provider_check.check_provider_key("groq", "fake-ok", key_source="own")
    bad = provider_check.check_provider_key("groq", "fake-invalid", key_source="own")
    down = provider_check.check_provider_key("groq", "fake-down", key_source="own")
    assert ok["code"] == "connected" and ok["models"] == len(provider_listing._FAKE_IDS["groq"])
    assert bad["code"] == "invalid_key"
    assert down["code"] == "unreachable"
