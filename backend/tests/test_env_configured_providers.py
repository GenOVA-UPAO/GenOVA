"""env_configured_providers: qué proveedores tienen clave en el entorno."""

from llm.providers import ALL_PROVIDERS, ENV_VARS, env_configured_providers


def test_solo_cuenta_variables_con_valor(monkeypatch):
    for provider in ALL_PROVIDERS:
        monkeypatch.delenv(ENV_VARS[provider], raising=False)
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-123")
    monkeypatch.setenv("GROQ_API_KEY", "   ")
    assert env_configured_providers() == ["openrouter"]
