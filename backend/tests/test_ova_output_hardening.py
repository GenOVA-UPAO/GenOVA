"""Blindaje de la salida de los OVAs generados (extracción, runtime, JS, plan)."""

from generation.jobs.jobs_helpers import StartJobRequest, build_resource_plan
from llm.utils.ova_runtime import inject_runtime, strip_runtime
from llm.utils.utils import extract_html_document, parse_json
from prometheus.engine.js_check import script_syntax_errors
from prometheus.engine.topic import topic_drift_defect

DOC = "<!DOCTYPE html><html><head></head><body><h1>Ley de Ohm</h1><script>var a = 1;</script></body></html>"


def test_extract_drops_prose_around_fenced_document():
    raw = f"Here is a self-contained HTML file.\n```html\n{DOC}\n```\n### How it works\nBlah."
    assert extract_html_document(raw) == DOC


def test_extract_drops_prose_without_fence():
    assert extract_html_document(f"Intro text {DOC} closing notes") == DOC


def test_parse_json_ignores_trailing_notes():
    assert parse_json('```json\n{"a": 1}\n```\nNotas del modelo') == {"a": 1}


def test_runtime_roundtrip_keeps_authored_html():
    injected = inject_runtime(DOC, css=True, components=True)
    authored, had_css, had_components = strip_runtime(injected)
    assert (had_css, had_components) == (True, True)
    assert "UPAO Components v" not in authored and 'id="ova-base"' not in authored
    reinjected = inject_runtime(authored, css=True, components=True)
    assert strip_runtime(reinjected)[0] == authored
    assert reinjected.count("UPAO Components v") == 1


def test_js_check_flags_truncated_script_only():
    broken = DOC.replace("var a = 1;", "document.getElementById('x').textContent = '")
    assert script_syntax_errors(DOC) == []
    errors = script_syntax_errors(broken)
    assert errors and errors[0].startswith("script 1")


def test_js_check_skips_injected_runtime():
    assert script_syntax_errors(inject_runtime(DOC, css=True, components=True)) == []


def test_resource_names_are_stored_as_ids():
    payload = StartJobRequest(
        prompt="Ley de Ohm",
        resources=[
            {"phase_type": "engage", "resource_type": "Cómic Interactivo"},
            {"phase_type": "explore", "resource_type": "6"},
        ],
    )
    assert [r["resource_type"] for r in build_resource_plan(payload)] == ["1", "6"]


def test_topic_drift_accepts_short_core_terms_and_lead():
    prompt = "Circuitos de corriente continua: Ley de Ohm y leyes de Kirchhoff"
    html = "<h1>La Ley de Ohm evitó un apagón</h1><p>El hospital recalculó resistencias.</p>"
    assert topic_drift_defect(html, prompt) is None
    assert topic_drift_defect("<h1>Churn en telecomunicaciones</h1>", prompt)


def test_comic_sin_dibujo_propio_se_marca_como_defecto():
    from prometheus.engine.validate import comic_defects

    html = '<upao-comic-panel number="1" character="Max">¡Mira esta foto!</upao-comic-panel>'

    defects = comic_defects(html)

    assert any("dibujo" in d for d in defects)


def test_comic_con_acotacion_en_vez_de_dialogo_se_marca_como_defecto():
    from prometheus.engine.validate import comic_defects

    html = (
        '<upao-comic-panel number="1"><svg slot="art" viewBox="0 0 10 10"></svg>'
        "Escena: Max señala una flecha roja.</upao-comic-panel>"
    )

    defects = comic_defects(html)

    assert any("acotación" in d for d in defects)


def test_comic_bien_hecho_no_genera_defectos():
    from prometheus.engine.validate import comic_defects

    html = (
        '<upao-comic-panel number="1"><svg slot="art" viewBox="0 0 10 10"></svg>'
        "Esta flecha no se tuerce al estirar la imagen.</upao-comic-panel>"
    )

    assert comic_defects(html) == []


def test_html_sin_comic_no_activa_el_chequeo():
    from prometheus.engine.validate import comic_defects

    assert comic_defects("<section><p>Escena: nada que ver</p></section>") == []
