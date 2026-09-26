"""Descripción de las imágenes que sube el docente (RAG).

El modelo de visión era un id fijo de Groq que Groq retiró: cada imagen daba
404 y se indexaba como «[Archivo multimodal: …]». Ahora la cadena sale de la
configuración o del catálogo y un modelo retirado cae al siguiente.
"""

from types import SimpleNamespace

import httpx
import pytest
from groq import RateLimitError as GroqRateLimitError
from openai import NotFoundError

from llm import router
from llm.utils import vision_models
from llm.utils.llm_helpers import EmptyContentError
from llm.utils.vision_models import clean_description, parse_chain, vision_chain

CATALOG = [
    {
        "provider": "groq",
        "model_id": "qwen/qwen3.8-27b",
        "modality": "text+image->text",
        "aptitudes": ["texto"],
        "active": True,
    },
    {"provider": "groq", "model_id": "llama-texto", "modality": "text->text", "aptitudes": ["texto"]},
    {
        "provider": "groq",
        "model_id": "meta-llama/llama-guard-4-12b",
        "modality": "text+image->text",
        "aptitudes": ["moderacion"],
    },
    {
        "provider": "openrouter",
        "model_id": "google/gemini-2.5-flash-lite",
        "modality": "text+image->text",
        "aptitudes": ["texto"],
    },
]


@pytest.fixture
def catalog(monkeypatch):
    monkeypatch.delenv("VISION_MODELS", raising=False)
    monkeypatch.delenv("VISION_OPENROUTER_MODEL", raising=False)
    monkeypatch.setattr(vision_models, "_catalog", lambda: CATALOG)


def test_parse_chain_admite_ids_con_dos_puntos():
    assert parse_chain("groq:a/b, openrouter:x/y:free ,otro:z,sinproveedor") == [
        ("groq", "a/b"),
        ("openrouter", "x/y:free"),
    ]


def test_sin_configuracion_usa_los_de_vision_del_catalogo(catalog):
    assert vision_chain() == [
        ("groq", "qwen/qwen3.8-27b"),
        ("openrouter", "google/gemini-2.5-flash-lite"),
    ]


def test_se_saltan_los_que_el_proveedor_ya_no_lista(catalog, monkeypatch):
    monkeypatch.setenv(
        "VISION_MODELS",
        "groq:meta-llama/llama-4-scout-17b-16e-instruct,openrouter:google/gemini-2.5-flash-lite",
    )
    assert vision_chain() == [("openrouter", "google/gemini-2.5-flash-lite")]


def test_si_todos_los_configurados_caducaron_se_usa_el_catalogo(catalog, monkeypatch):
    monkeypatch.setenv("VISION_MODELS", "groq:meta-llama/llama-4-scout-17b-16e-instruct")
    assert vision_chain()[0] == ("groq", "qwen/qwen3.8-27b")


def test_sin_catalogo_se_intenta_el_respaldo_de_openrouter(monkeypatch):
    monkeypatch.delenv("VISION_MODELS", raising=False)
    monkeypatch.setattr(vision_models, "_catalog", lambda: [])
    assert vision_chain() == [("openrouter", vision_models.DEFAULT_OPENROUTER_VISION)]


def test_clean_description_quita_el_razonamiento():
    assert clean_description("<think>veo un círculo…</think>\n Un círculo rojo.") == "Un círculo rojo."
    assert clean_description("<think>sin cerrar") == ""
    assert clean_description(None) == ""


class _Client:
    """Cliente de chat simulado: responde o falla según el modelo."""

    def __init__(self, calls, answers):
        self.calls = calls
        self.answers = answers
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def with_options(self, **_kwargs):
        return self

    def _create(self, *, model, messages, **kwargs):
        self.calls.append((model, kwargs))
        answer = self.answers[model]
        if isinstance(answer, list):  # una respuesta por llamada, en orden
            answer = answer.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=answer))])


def _not_found():
    request = httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
    response = httpx.Response(404, request=request, json={"error": {"code": "model_not_found"}})
    return NotFoundError("model_not_found", response=response, body=None)


def _rate_limited(retry_after: str | None):
    request = httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
    headers = {"retry-after": retry_after} if retry_after else {}
    response = httpx.Response(429, request=request, headers=headers, json={"error": {}})
    return GroqRateLimitError("rate_limit_exceeded", response=response, body=None)


def _install(monkeypatch, answers, chain):
    calls: list = []
    monkeypatch.setattr(router, "vision_chain", lambda: chain)
    monkeypatch.setattr(router, "_get_provider_key", lambda p: f"key-{p}")
    monkeypatch.setattr(router, "groq_client", _Client(calls, answers))
    monkeypatch.setattr(router, "openrouter_client", _Client(calls, answers))
    return calls


def test_un_modelo_retirado_cae_al_siguiente(monkeypatch):
    calls = _install(
        monkeypatch,
        {"retirado": _not_found(), "google/gemini-2.5-flash-lite": "Un diagrama del agua."},
        [("groq", "retirado"), ("openrouter", "google/gemini-2.5-flash-lite")],
    )
    assert router.generar_vision([{"role": "user", "content": "x"}], max_tokens=512) == (
        "Un diagrama del agua."
    )
    assert [c[0] for c in calls] == ["retirado", "google/gemini-2.5-flash-lite"]
    # En Groq hay margen para el razonamiento; en OpenRouter se respeta el tope.
    assert calls[0][1]["max_completion_tokens"] == router._VISION_GROQ_MIN_TOKENS
    assert calls[1][1]["max_tokens"] == 512


def test_una_respuesta_solo_de_razonamiento_cuenta_como_vacia(monkeypatch):
    _install(
        monkeypatch,
        {"piensa": "<think>no sé</think>", "otro": "Una célula."},
        [("groq", "piensa"), ("openrouter", "otro")],
    )
    assert router.generar_vision([]) == "Una célula."


def test_sin_ningun_modelo_que_responda_lanza(monkeypatch):
    _install(monkeypatch, {"piensa": ""}, [("groq", "piensa")])
    with pytest.raises(EmptyContentError):
        router.generar_vision([])
    _install(monkeypatch, {}, [])
    with pytest.raises(RuntimeError):
        router.generar_vision([])


def test_sin_clave_del_proveedor_se_salta(monkeypatch):
    calls = _install(monkeypatch, {"b": "ok"}, [("groq", "a"), ("openrouter", "b")])
    monkeypatch.setattr(router, "_get_provider_key", lambda p: None if p == "groq" else "k")
    assert router.generar_vision([]) == "ok"
    assert [c[0] for c in calls] == ["b"]


# Plan gratuito de Groq: 8000 tokens/min y ~1835 por imagen → la tercera imagen
# seguida da 429 con Retry-After ~19 s (medido el 2026-09-25).
def test_un_429_corto_de_groq_se_espera_en_vez_de_pagar_el_respaldo(monkeypatch):
    calls = _install(
        monkeypatch,
        {"qwen": [_rate_limited("19"), "Una matriz de confusión."], "gemini": "de pago"},
        [("groq", "qwen"), ("openrouter", "gemini")],
    )
    waits: list[float] = []
    monkeypatch.setattr(router.time, "sleep", waits.append)
    assert router.generar_vision([], max_tokens=512) == "Una matriz de confusión."
    assert waits == [19.0]
    assert [c[0] for c in calls] == ["qwen", "qwen"]
    # Tope bajo: Groq lo reserva contra su límite de tokens por minuto.
    assert calls[0][1]["max_completion_tokens"] == router._VISION_GROQ_MIN_TOKENS < 1000


def test_un_429_largo_o_repetido_pasa_al_siguiente(monkeypatch):
    waits: list[float] = []
    calls = _install(
        monkeypatch,
        {"qwen": [_rate_limited("3600")], "gemini": "de pago"},
        [("groq", "qwen"), ("openrouter", "gemini")],
    )
    monkeypatch.setattr(router.time, "sleep", waits.append)
    assert router.generar_vision([]) == "de pago"
    assert waits == [] and [c[0] for c in calls] == ["qwen", "gemini"]

    retries = router._VISION_GROQ_RATE_RETRIES
    calls = _install(
        monkeypatch,
        {"qwen": [_rate_limited("5") for _ in range(retries + 1)], "gemini": "de pago"},
        [("groq", "qwen"), ("openrouter", "gemini")],
    )
    assert router.generar_vision([]) == "de pago"
    assert waits == [5.0] * retries
    assert [c[0] for c in calls] == ["qwen"] * (retries + 1) + ["gemini"]


def test_rate_limit_wait():
    assert vision_models.rate_limit_wait(_rate_limited("18.5")) == 18.5
    assert vision_models.rate_limit_wait(_rate_limited(None)) is None
    assert vision_models.rate_limit_wait(_rate_limited("120")) is None
