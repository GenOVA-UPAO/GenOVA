"""Tests unitarios para los nuevos tipos de recurso: Applet GeoGebra (explore:11) y Quiz Adaptativo (evaluate:11)."""

from __future__ import annotations

import copy

from ova_engine.contract import RenderContext
from ova_engine.planner_attrs import ATTRS, profile_keywords, select_plan
from ova_engine.registry import get_spec
from ova_engine.schema import validate
from ova_engine.templates.explore_11 import is_safe_geogebra_command

# =====================================================================
# 1. Tests de Applet GeoGebra (explore:11)
# =====================================================================

def test_geogebra_safe_command_validator():
    # Comandos seguros válidos
    assert is_safe_geogebra_command("a = Slider(-5, 5, 0.5)")
    assert is_safe_geogebra_command("f(x) = a * x^2 + b * x + c")
    assert is_safe_geogebra_command("P = (0, 0)")
    assert is_safe_geogebra_command("V = Vertex(f)")
    assert is_safe_geogebra_command("Intersect(f, xAxis)")
    assert is_safe_geogebra_command("ZoomIn(-10, -10, 10, 10)")
    assert is_safe_geogebra_command("SetColor(f, \"red\")")

    # Comandos peligrosos que deben ser rechazados
    assert not is_safe_geogebra_command("Execute(\"alert(1)\")")
    assert not is_safe_geogebra_command("execute(\"https://evil.com/code.js\")")
    assert not is_safe_geogebra_command("<script>alert(1)</script>")
    assert not is_safe_geogebra_command("javascript:evil()")
    assert not is_safe_geogebra_command("eval(\"document.cookie\")")
    assert not is_safe_geogebra_command("fetch('https://malicious.org')")
    assert not is_safe_geogebra_command("window.open('http://hack.me')")
    assert not is_safe_geogebra_command("a = `ls -la`")
    assert not is_safe_geogebra_command("a = ${MALICIOUS}")
    assert not is_safe_geogebra_command("")
    assert not is_safe_geogebra_command("   ")


def test_geogebra_spec_schema_and_sample():
    spec = get_spec("explore", 11)
    assert spec is not None
    assert spec.title == "Applet GeoGebra"

    for n_steps in (3, 4, 5):
        params = {"num_steps": n_steps}
        data = spec.sample("Funciones cuadráticas", params)
        errors = validate(data, spec.schema(params))
        assert errors == [], f"Errores de schema en n_steps={n_steps}: {errors}"
        assert len(data["consignas"]) == n_steps
        assert len(data["comandos"]) >= 3


def test_geogebra_render_offline_and_fallback():
    spec = get_spec("explore", 11)
    assert spec is not None
    params = {"num_steps": 4}
    data = spec.sample("Funciones cuadráticas", params)
    ctx = RenderContext("Funciones cuadráticas", "explore", 11, spec.title, params)
    html = spec.render(copy.deepcopy(data), ctx)

    # Inclusión del script oficial de GeoGebra
    assert "https://www.geogebra.org/apps/deployggb.js" in html
    # Mensaje de fallback visible si no hay red
    assert "Este recurso necesita conexión para cargar GeoGebra" in html
    # Aviso en los formatos offline
    assert "Aviso para modo sin conexión" in html
    assert "recurso interactivo necesita conexión para cargar GeoGebra" in html
    # Contenedor y appletOnLoad
    assert 'id="ggb-element"' in html
    assert "appletOnLoad" in html
    # Consignas guiadas y verificación interactiva
    assert "checkStep" in html
    assert 'id="step-1"' in html
    assert 'id="step-4"' in html
    assert "upao-complete" in html


def test_geogebra_filters_unsafe_commands_on_render():
    spec = get_spec("explore", 11)
    assert spec is not None
    params = {"num_steps": 3}
    data = spec.sample("Funciones", params)
    data["comandos"].append("Execute(\"https://malicious.com/hack\")")
    data["comandos"].append("<script>alert('xss')</script>")
    ctx = RenderContext("Funciones", "explore", 11, spec.title, params)
    html = spec.render(data, ctx)

    assert "https://malicious.com/hack" not in html
    assert "<script>alert('xss')</script>" not in html


def test_planner_chooses_geogebra_only_for_math_topics():
    # Perfil puramente matemático
    prof_math = {a: 0.0 for a in ATTRS}
    prof_math["matematico"] = 1.0
    plan_math = select_plan(prof_math)
    assert 11 in plan_math["explore"], "Applet GeoGebra debe seleccionarse en temas matemáticos"

    # Perfil no matemático (histórico, ético, tuning de base de datos)
    prof_non_math = {a: 0.0 for a in ATTRS}
    prof_non_math["historico"] = 1.0
    prof_non_math["matematico"] = 0.0
    plan_non_math = select_plan(prof_non_math)
    assert 11 not in plan_non_math["explore"], "Applet GeoGebra NO debe seleccionarse sin requisito matemático"

    # Perfil sin atributos (default cero)
    plan_empty = select_plan({a: 0.0 for a in ATTRS})
    assert 11 not in plan_empty["explore"], "Applet GeoGebra recibe REQ_PENALTY cuando matematico < 0.5"


def test_profile_keywords_detects_mathematical_concepts():
    prof = profile_keywords("Estudio de funciones cuadráticas, parábolas y cálculo diferencial")
    assert prof["matematico"] == 1.0

    prof_db = profile_keywords("Historia y evolución de índices en Oracle SQL")
    assert prof_db["matematico"] == 0.0
    assert prof_db["historico"] == 1.0


# =====================================================================
# 2. Tests de Quiz Adaptativo (evaluate:11)
# =====================================================================

def test_quiz_adaptativo_spec_schema_and_sample():
    spec = get_spec("evaluate", 11)
    assert spec is not None
    assert spec.title == "Quiz Adaptativo"

    for n_level in (2, 3, 4):
        params = {"num_per_level": n_level, "max_questions": 5, "mastery_threshold": 2}
        data = spec.sample("Índices B-tree", params)
        errors = validate(data, spec.schema(params))
        assert errors == [], f"Errores de schema en num_per_level={n_level}: {errors}"

        banco = data["banco"]
        assert len(banco["bajo"]) == n_level
        assert len(banco["medio"]) == n_level
        assert len(banco["alto"]) == n_level

        for lvl_name in ("bajo", "medio", "alto"):
            for q in banco[lvl_name]:
                assert len(q["opciones"]) == 4
                correct_count = sum(1 for o in q["opciones"] if o.get("correcta"))
                assert correct_count == 1, f"Pregunta {q['id']} debe tener exactamente 1 opción correcta"


def test_quiz_adaptativo_render_structure():
    spec = get_spec("evaluate", 11)
    assert spec is not None
    params = {"num_per_level": 3, "max_questions": 5, "mastery_threshold": 2}
    data = spec.sample("Índices B-tree", params)
    ctx = RenderContext("Índices B-tree", "evaluate", 11, spec.title, params)
    html = spec.render(copy.deepcopy(data), ctx)

    # Elementos de cabecera y HUD
    assert "<upao-header" in html
    assert 'eyebrow="QUIZ ADAPTATIVO"' in html
    assert '<upao-score id="score" current="0" max="100"' in html
    assert '<upao-progress id="prog" current="0" total="5"' in html

    # Zona activa interactiva
    assert 'id="ad-active-section"' in html
    assert 'id="ad-badge"' in html
    assert 'id="ad-enunciado"' in html
    assert 'id="ad-opts"' in html
    assert 'id="ad-confirm-btn"' in html
    assert 'id="ad-next-btn"' in html

    # Tarjeta de resultados finales y reporte SCORM/xAPI
    assert 'id="result"' in html
    assert 'id="dom-badge"' in html
    assert 'id="stat-alto-val"' in html
    assert 'id="stat-medio-val"' in html
    assert 'id="stat-bajo-val"' in html
    assert "genova-resource-completed" in html
    assert "_scormComplete" in html
    assert "upao-complete" in html


def test_quiz_adaptativo_adaptive_logic_simulation():
    """Simula la lógica adaptativa implementada en evaluate_11:

    - Comienza en nivel medio (1)
    - Acierto -> sube (1 -> 2)
    - Fallo -> baja (2 -> 1, 1 -> 0)
    - Termina al dominar nivel alto (highHits >= masteryThreshold) o alcanzar maxQuestions
    """
    spec = get_spec("evaluate", 11)
    assert spec is not None
    # Simulación 1: Estudiante excelente (empieza en medio, acierta todo -> medio, alto, alto [termina por dominio alto])
    current_level = 1
    high_hits = 0
    mastery_threshold = 2
    max_questions = 5
    path = []

    # Respuestas: siempre acierta
    for _ in range(max_questions):
        path.append(current_level)
        is_correct = True
        if is_correct:
            if current_level == 2:
                high_hits += 1
            else:
                current_level += 1
        if high_hits >= mastery_threshold:
            break

    assert path == [1, 2, 2], f"Camino esperado [medio, alto, alto], obtenido {path}"
    assert high_hits == 2

    # Simulación 2: Estudiante con fallos (medio [fallo] -> bajo [acierto] -> medio [fallo] -> bajo [acierto] -> medio)
    current_level = 1
    high_hits = 0
    path = []
    answers = [False, True, False, True, False]
    for ans in answers:
        path.append(current_level)
        if ans:
            if current_level == 2:
                high_hits += 1
            else:
                current_level += 1
        else:
            high_hits = 0
            if current_level > 0:
                current_level -= 1

    assert path == [1, 0, 1, 0, 1], f"Camino oscilante esperado [1, 0, 1, 0, 1], obtenido {path}"
