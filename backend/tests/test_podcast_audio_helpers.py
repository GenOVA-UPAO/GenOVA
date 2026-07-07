"""Podcast TTS must resolve the Groq key via the DB-backed resolver.

Regression: `_client()` used to call `resolve_key("groq", None)` with no `db`,
silently skipping the platform-key DB tier and depending only on the raw
GROQ_API_KEY env var — TTS failed in every environment where Groq is only
configured via the admin platform-keys panel (audit 2026-07-06 #4).
"""

from llm.podcast import audio_helpers


def test_client_uses_db_backed_key_resolver(monkeypatch):
    calls = []

    def fake_get_provider_key(provider):
        calls.append(provider)
        return "sk-from-platform-db"

    monkeypatch.setattr(
        "llm.clients.clients._get_provider_key", fake_get_provider_key
    )

    client = audio_helpers._client()

    assert calls == ["groq"]
    assert client.api_key == "sk-from-platform-db"
