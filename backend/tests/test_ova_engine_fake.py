"""LLM_FAKE=1: el OVA completo usa las plantillas reales con datos de ejemplo (sin red)."""

import pytest

from ova_engine import decision
from prometheus.engine import fake_invoke

CTX = "[Fuente: apuntes.pdf]\nUn índice B-tree tiene raíz, ramas y hojas.\n<<<FIN_MATERIAL>>>"


@pytest.fixture(autouse=True)
def _sin_red(monkeypatch):
    monkeypatch.setenv("OVA_DECISION_BACKEND", "jev")  # aunque el .env pida Jev, fake no sale a la red
    monkeypatch.setattr(decision.httpx, "post", lambda *a, **k: pytest.fail("fake no debe usar red"))


def test_recurso_con_plantilla_usa_su_diseno():
    html = fake_invoke._template_html("Índices B-tree. Objetivo: x", "explore", "1", "", {})
    assert "SIMULADOR VIRTUAL LAB" in html and "UPAO Components v" in html
    assert "Recurso de prueba" not in html
    assert "<title>Simulador Virtual Lab: Índices B-tree</title>" in html


def test_resumen_rag_se_conserva():
    html = fake_invoke._template_html("Índices B-tree", "engage", "1", CTX, {})
    assert 'data-llm-fake-rag="1"' in html and "apuntes.pdf" in html


def test_sin_plantilla_cae_al_stub():
    assert fake_invoke._template_html("Índices", "engage", "3", "", {}) is None  # podcast
    assert fake_invoke._template_html("Índices", "engage", "x", "", {}) is None
