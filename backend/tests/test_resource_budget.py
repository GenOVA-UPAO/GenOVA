"""Presupuesto de reloj por recurso: pura, sin LLM ni red."""

from prometheus.engine.budget import (
    DEFAULT_RESOURCE_BUDGET_S,
    MIN_LLM_SLACK_S,
    budget_seconds,
    can_spend,
    deadline_at,
    remaining,
)


def test_default_es_90s_porque_no_toca_recursos_sanos():
    assert DEFAULT_RESOURCE_BUDGET_S == 90.0
    assert budget_seconds(None) == 90.0
    assert budget_seconds(90) == 90.0


def test_budget_seconds_rechaza_valores_no_positivos():
    assert budget_seconds(0) == 1.0
    assert budget_seconds(-12) == 1.0


def test_deadline_at_suma_el_presupuesto():
    assert deadline_at(100.0, 90.0) == 190.0


def test_remaining_usa_now_inyectable():
    assert remaining(150.0, now=100.0) == 50.0
    assert remaining(150.0, now=200.0) == -50.0


def test_can_spend_sin_deadline_siempre_permite():
    assert can_spend(None) is True


def test_can_spend_exige_slack_para_otra_llamada_llm():
    deadline = 100.0
    assert can_spend(deadline, now=100.0 - MIN_LLM_SLACK_S) is True
    assert can_spend(deadline, now=100.0 - MIN_LLM_SLACK_S + 0.01) is False
    assert can_spend(deadline, now=100.0) is False
    assert can_spend(deadline, now=80.0) is True
