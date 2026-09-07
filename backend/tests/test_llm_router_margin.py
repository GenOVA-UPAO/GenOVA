"""Margen de fallback y error por presupuesto (router) — sin red, reloj falso.

- El primer intento no puede gastar el presupuesto entero: queda margen para
  al menos un fallback rápido (reparto, no presupuesto total).
- Corte por presupuesto sin haber probado nada → LLMBudgetExhaustedError
  (distinto de "All LLM fallbacks failed").
- Un fallo real de modelo conserva su error aunque después se corte.
"""

import pytest

import llm.router as router
from llm.router import LLMBudgetExhaustedError, generar_texto
from llm.utils import llm_config_store
from llm.utils.llm_helpers import EmptyContentError


class FakeClock:
    def __init__(self, t: float = 0.0):
        self.t = t


@pytest.fixture
def clock(monkeypatch):
    c = FakeClock()
    monkeypatch.setattr(router.time, "monotonic", lambda: c.t)
    monkeypatch.setattr(router.time, "sleep", lambda *_a, **_k: None)
    return c


def _admin(monkeypatch, defaults, fallbacks):
    """Config admin falsa vía llm_config_store (patrón de test_llm_config_store)."""

    def stored():
        return {
            "defaults": {
                tarea: {"provider": p, "model_id": m, "extra": x}
                for tarea, (p, m, x) in defaults.items()
            },
            "fallbacks": {
                tarea: [{"provider": p, "model_id": m, "extra": x} for p, m, x in items]
                for tarea, items in fallbacks.items()
            },
        }

    monkeypatch.setattr(llm_config_store, "stored_cached", stored)


def _fake_chat(clock, actions, calls):
    """Fake de _chat: cada action = (avance_reloj, resultado|Exception)."""

    def fake(provider, model_id, prompt, max_tokens, extra, timeout):
        calls.append({"provider": provider, "model_id": model_id, "timeout": timeout})
        advance, outcome = actions.pop(0)
        clock.t += advance
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    return fake


def test_primer_intento_acotado_deja_margen_para_fallback(monkeypatch, clock):
    _admin(
        monkeypatch,
        {"texto": ("openrouter", "primary-x", {})},
        {"texto": [("openrouter", "gemini-x", {})]},
    )
    calls = []
    monkeypatch.setattr(
        router, "_chat", _fake_chat(clock, [(70.0, EmptyContentError("")), (2.0, "ok")], calls)
    )
    out = generar_texto("p", "texto", 8192, deadline=90.0)
    assert out == "ok"
    # intento 1: presupuesto 90 - 20 de reserva = 70s de techo
    assert calls[0]["model_id"] == "primary-x"
    assert calls[0]["timeout"] == 70.0
    # intento 2 (último): left=20 sin reserva, sin sleep real
    assert calls[1]["model_id"] == "gemini-x"
    assert calls[1]["timeout"] == 20.0


def test_corte_por_presupuesto_sin_probar_nada_da_error_distinto(monkeypatch, clock):
    clock.t = 80.0  # solo quedan 10s del presupuesto de 90
    _admin(monkeypatch, {"texto": ("openrouter", "primary-x", {})}, {"texto": [("groq", "fb-y", {})]})
    calls = []
    monkeypatch.setattr(router, "_chat", _fake_chat(clock, [], calls))
    with pytest.raises(LLMBudgetExhaustedError) as excinfo:
        generar_texto("p", "texto", 8192, deadline=90.0)
    assert calls == []  # ni el primario se intentó
    assert "All LLM fallbacks failed" not in str(excinfo.value)


def test_fallo_de_modelo_conserva_su_error_aunque_se_corte_despues(monkeypatch, clock):
    _admin(
        monkeypatch,
        {"texto": ("openrouter", "primary-x", {})},
        {"texto": [("openrouter", "f1", {}), ("groq", "f2", {})]},
    )
    calls = []
    monkeypatch.setattr(
        router,
        "_chat",
        _fake_chat(
            clock,
            [(70.0, EmptyContentError("a")), (15.0, EmptyContentError("b"))],
            calls,
        ),
    )
    with pytest.raises(EmptyContentError):
        generar_texto("p", "texto", 8192, deadline=90.0)
    # fallback 1 sí se intentó con el margen garantizado (left=20 → techo 15)
    assert calls[1]["timeout"] == 15.0
