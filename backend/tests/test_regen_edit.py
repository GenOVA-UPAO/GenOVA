"""Chat "Aplicar" con recurso seleccionado = edición puntual, no regen desde cero.

Bug: el mensaje del chat ("arregla los botones") se usaba como CONCEPTO y el
recurso se recreaba entero (título y tema nuevos). Ahora el mensaje es una
INSTRUCCIÓN sobre el HTML actual y el tema se conserva.
"""

import generation.regen.regen_edit as regen_edit
from generation.regen.regen_edit import _regen_one_phase, edit_phase_content

_BASE_HTML = "<!DOCTYPE html><html><head></head><body>" + "x" * 400 + "</body></html>"


class _Phase:
    id = "p1"
    phase_type = "explore"
    resource_type_id = 2
    content = _BASE_HTML
    title = "explore · Simulador"


def test_edit_keeps_topic_and_passes_current_html(monkeypatch):
    seen = {}

    def fake_generar(prompt, tarea, *a, **kw):
        seen["prompt"] = prompt
        return "<!DOCTYPE html><html><body>" + "y" * 500 + "</body></html>"

    monkeypatch.setattr(regen_edit, "generar_texto", fake_generar)
    out = edit_phase_content("Aprendizaje supervisado", "arregla los botones", _BASE_HTML)

    assert out and out.strip().lower().endswith("</html>")
    assert "arregla los botones" in seen["prompt"]
    assert "Aprendizaje supervisado" in seen["prompt"]
    assert "HTML_ACTUAL" in seen["prompt"]


def test_edit_discards_truncated_result(monkeypatch):
    monkeypatch.setattr(regen_edit, "generar_texto", lambda *a, **kw: "<html><body>cortad")
    assert edit_phase_content("tema", "cambio", _BASE_HTML) is None


def test_edit_discards_shrunk_result(monkeypatch):
    monkeypatch.setattr(regen_edit, "generar_texto", lambda *a, **kw: "<html></html>")
    assert edit_phase_content("tema", "cambio", _BASE_HTML) is None


def test_edit_noop_without_instruction():
    assert edit_phase_content("tema", "", _BASE_HTML) is None
    assert edit_phase_content("tema", "   ", _BASE_HTML) is None


def test_regen_one_phase_routes_to_edit_when_instruction(monkeypatch):
    called = {}
    monkeypatch.setattr(
        regen_edit,
        "edit_phase_content",
        lambda *a, **kw: called.setdefault("edit", True) or "<html></html>",
    )
    monkeypatch.setattr(
        regen_edit,
        "regenerate_phase_content",
        lambda *a, **kw: called.setdefault("regen", True),
    )
    _regen_one_phase(_Phase(), "tema", "sube el contraste", None, None, None)
    assert called == {"edit": True}


def test_regen_one_phase_routes_to_regen_without_instruction(monkeypatch):
    called = {}
    monkeypatch.setattr(
        regen_edit, "edit_phase_content", lambda *a, **kw: called.setdefault("edit", True)
    )
    monkeypatch.setattr(
        regen_edit,
        "regenerate_phase_content",
        lambda *a, **kw: called.setdefault("regen", True) or "<html></html>",
    )
    _regen_one_phase(_Phase(), "tema", None, None, None, None)
    assert called == {"regen": True}
