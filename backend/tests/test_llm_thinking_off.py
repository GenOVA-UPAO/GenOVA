"""Ruta de JSON sin thinking (explicíto, no por umbral) — sin red.

Verifica que la llamada del paso estructurado (texto 8192) sale con thinking
apagado explícitamente (medido: deepseek 39.7s → 11.5s con el mismo JSON
válido), que los modelos no pensantes no ganan extra_body, y que
with_model_thinking() mantiene su contrato puro.
"""

import llm.router as router
from llm.router import generar_texto
from llm.utils.llm_helpers import with_model_thinking, with_thinking_disabled


class _CapturingChat:
    def __init__(self):
        self.calls = []

    def __call__(self, provider, model_id, prompt, max_tokens, extra, timeout):
        self.calls.append({"extra": dict(extra or {})})
        return "{}"


DEEPSEEK_ON = {"thinking": {"type": "enabled"}, "reasoning": {"effort": "low", "exclude": True}}
DEEPSEEK_OFF = {"thinking": {"type": "disabled"}, "reasoning": {"effort": "none"}}


def _routed(monkeypatch, model_id):
    from llm.utils import llm_config_store

    monkeypatch.setattr(
        llm_config_store,
        "stored_cached",
        lambda: {
            "defaults": {"texto": {"provider": "openrouter", "model_id": model_id, "extra": {}}},
            "fallbacks": {},
        },
    )


def test_thinking_false_fuerza_disabled_en_deepseek(monkeypatch):
    _routed(monkeypatch, "deepseek/deepseek-v4-flash")
    rec = _CapturingChat()
    monkeypatch.setattr(router, "_chat", rec)
    generar_texto("p", "texto", 8192, thinking=False)
    assert rec.calls[0]["extra"] == {"extra_body": DEEPSEEK_OFF}


def test_thinking_auto_en_deepseek_8192_no_inyecta_override(monkeypatch):
    # Sin thinking=False la ruta no fuerza nada: el thinking enabled lo aplica
    # _chat via with_model_thinking (contrato cubierto en test_llm_config_store).
    _routed(monkeypatch, "deepseek/deepseek-v4-flash")
    rec = _CapturingChat()
    monkeypatch.setattr(router, "_chat", rec)
    generar_texto("p", "texto", 8192)
    assert rec.calls[0]["extra"] == {}


def test_thinking_false_no_toca_modelos_no_pensantes(monkeypatch):
    _routed(monkeypatch, "google/gemini-2.5-flash-lite")
    rec = _CapturingChat()
    monkeypatch.setattr(router, "_chat", rec)
    generar_texto("p", "texto", 8192, thinking=False)
    assert rec.calls[0]["extra"] == {}


def test_with_model_thinking_puro_presupuesto_8192_deepseek():
    # Lógica pura: 8192 (>= 6000) → thinking enabled con effort low (hoy).
    assert with_model_thinking("openrouter", "deepseek/deepseek-v4-flash", {}, 8192) == {
        "extra_body": DEEPSEEK_ON
    }


def test_with_model_thinking_modelos_no_pensantes_sin_extra_body():
    assert with_model_thinking("openrouter", "google/gemini-2.5-flash-lite", {}, 8192) == {}
    assert with_model_thinking("groq", "llama-3.3-70b-versatile", {}, 24000) == {}


def test_with_thinking_disabled_preserva_extra_body_del_llamador():
    extra = {"extra_body": {"custom": 1}}
    assert with_thinking_disabled("openrouter", "deepseek/deepseek-v4-flash", extra) == extra
