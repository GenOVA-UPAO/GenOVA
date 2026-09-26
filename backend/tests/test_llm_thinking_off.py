"""Ruta de JSON sin thinking (explicíto, no por umbral) — sin red.

Verifica que la llamada del paso estructurado (texto 8192) sale con thinking
apagado explícitamente (medido: deepseek 39.7s → 11.5s con el mismo JSON
válido), que los modelos no pensantes no ganan extra_body, y que
with_model_thinking() mantiene su contrato puro.
"""

import llm.router as router
from llm.router import generar_texto
from llm.utils.llm_helpers import (
    _FALLBACK_OR_MODEL,
    with_model_thinking,
    with_thinking_disabled,
)


class _CapturingChat:
    def __init__(self):
        self.calls = []

    def __call__(self, provider, model_id, prompt, max_tokens, extra, timeout, key=None):
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


# ── Respaldos de OpenRouter que razonan por defecto: razonamiento apagado ────
REASONING_OFF = {"reasoning": {"enabled": False}}


def test_respaldos_or_apagan_razonamiento_con_cualquier_presupuesto():
    # Qwen3.8 27B, Gemma 4 y Laguna: apagado del todo, no solo reducido, tanto en
    # la variante :free como en la de pago y con presupuesto de JSON o de código.
    for model_id in (
        "qwen/qwen3.8-27b:free",
        "qwen/qwen3.8-27b",
        "google/gemma-4-31b-it:free",
        "google/gemma-4-26b-a4b-it",
        "poolside/laguna-s-2.1:free",
        "poolside/laguna-xs-2.1",
    ):
        for max_tokens in (0, 8192, 24000):
            assert with_model_thinking("openrouter", model_id, {}, max_tokens) == {
                "extra_body": REASONING_OFF
            }, (model_id, max_tokens)


def test_razonamiento_apagado_solo_en_openrouter_y_en_esos_modelos():
    # `reasoning` es un parámetro de OpenRouter: el mismo Qwen3.8 en Groq no se toca.
    assert with_model_thinking("groq", "qwen/qwen3.8-27b", {}, 8192) == {}
    # Otros Qwen3.8 (Max, Flash) conservan su razonamiento.
    assert with_model_thinking("openrouter", "qwen/qwen3.8-max-prime", {}, 24000) == {}
    assert with_model_thinking("openrouter", "google/gemini-2.5-flash", {}, 24000) == {}


def test_razonamiento_apagado_respeta_extra_body_explicito():
    extra = {"extra_body": {"reasoning": {"effort": "low"}}}
    assert with_model_thinking("openrouter", "poolside/laguna-s-2.1:free", extra, 24000) == extra


def test_razonamiento_apagado_no_pisa_otros_kwargs():
    extra = {"temperature": 0.2}
    assert with_model_thinking("openrouter", "google/gemma-4-31b-it:free", extra, 8192) == {
        "temperature": 0.2,
        "extra_body": REASONING_OFF,
    }
    assert extra == {"temperature": 0.2}  # no muta la entrada


class _FakeOpenRouter:
    """Cliente falso: guarda los kwargs de chat.completions.create."""

    def __init__(self):
        self.kwargs = None
        self.chat = self
        self.completions = self

    def with_options(self, **_):
        return self

    def create(self, **kw):
        from types import SimpleNamespace

        self.kwargs = kw
        msg = SimpleNamespace(content="<html></html>")
        return SimpleNamespace(choices=[SimpleNamespace(message=msg, finish_reason="stop")])


def test_chat_once_envia_reasoning_apagado_a_openrouter(monkeypatch):
    # La ruta real de generar_texto (_chat_once, provider=openrouter) manda el
    # ajuste en extra_body, que el SDK de OpenAI añade tal cual al JSON.
    fake = _FakeOpenRouter()
    monkeypatch.setattr(router, "openrouter_client", fake)
    monkeypatch.setattr(router, "traced_openai", lambda c: c)
    router._chat_once(
        "openrouter",
        "poolside/laguna-s-2.1:free",
        [{"role": "user", "content": "p"}],
        24000,
        {},
        None,
        "k",
    )
    assert fake.kwargs["extra_body"] == REASONING_OFF
    assert fake.kwargs["max_tokens"] == 24000


def test_respaldo_de_generar_texto_with_model_apaga_razonamiento(monkeypatch):
    # Si el modelo pedido da 429, el respaldo gratuito (Gemma 4) sale con el
    # razonamiento apagado: con 512 tokens podía no quedar sitio para la respuesta.
    import httpx
    from openai import RateLimitError

    fake = _FakeOpenRouter()
    calls = []

    def create(**kw):
        calls.append(kw)
        if len(calls) == 1:
            req = httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions")
            raise RateLimitError("429", response=httpx.Response(429, request=req), body=None)
        return _FakeOpenRouter.create(fake, **kw)

    fake.create = create
    monkeypatch.setattr(router, "openrouter_client", fake)
    monkeypatch.setattr(router, "_get_provider_key", lambda _p: "k")
    out = router.generar_texto_with_model("p", "deepseek/deepseek-chat-v3.1", "openrouter", 512)
    assert out == "<html></html>"
    assert calls[1]["model"] == _FALLBACK_OR_MODEL
    assert calls[1]["extra_body"] == REASONING_OFF
