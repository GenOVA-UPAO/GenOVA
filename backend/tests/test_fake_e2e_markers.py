"""LLM_FAKE=1: marcadores y clasificador deterministas que usan los E2E (sin red)."""

import json

from generation.domain.guardrails import parse_classifier_response
from generation.infrastructure.input_guardrail import _fake_classifier
from prometheus.engine import fake_invoke


def _verdict(prompt: str, area: str):
    return parse_classifier_response(_fake_classifier(prompt, area))


def test_clasificador_fake_acepta_prompt_dentro_del_area():
    verdict = _verdict("Introducción al Machine Learning supervisado", "machine learning")
    assert verdict is not None and verdict.topic_ok is True and verdict.language_ok is True


def test_clasificador_fake_rechaza_prompt_fuera_del_area():
    verdict = _verdict("Receta de paella valenciana", "machine learning")
    assert verdict is not None and verdict.topic_ok is False


def test_clasificador_fake_ignora_tildes_y_mayusculas():
    assert _verdict("EDUCACIÓN financiera", "Educacion").topic_ok is True


def test_clasificador_fake_sin_area_permite_todo():
    assert json.loads(_fake_classifier("lo que sea", ""))["topic"] == "ok"


def test_edicion_normal_no_espera(monkeypatch):
    monkeypatch.setattr(fake_invoke.time, "sleep", lambda s: (_ for _ in ()).throw(AssertionError(s)))
    html = fake_invoke.fake_edited_html("<html><body>x</body></html>", "Añade un resumen")
    assert 'data-llm-fake-edit="1"' in html


def test_edicion_lenta_espera_con_el_marcador(monkeypatch):
    waits = []
    monkeypatch.setattr(fake_invoke.time, "sleep", waits.append)
    fake_invoke.fake_edited_html("<html><body>x</body></html>", f"{fake_invoke.SLOW_MARKER} glosario")
    assert waits == [fake_invoke.SLOW_EDIT_SECONDS]


def test_fallo_forzado_queda_como_agotado_para_el_runner():
    from types import SimpleNamespace

    from generation.domain.execution import build_result_maps

    res = SimpleNamespace(phase_type="engage", resource_type="Cómic Interactivo")
    _, exhausted = build_result_maps([], [fake_invoke._forced_error(res)])
    assert "engage:Cómic Interactivo" in exhausted
