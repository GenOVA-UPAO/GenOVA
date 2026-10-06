"""Dominio neutro, recuentos y GeoGebra de las plantillas engage/explore (sin LLM real)."""

import copy
import re

import pytest

from ova_engine.contract import RenderContext
from ova_engine.registry import all_specs, get_spec
from ova_engine.schema import validate
from ova_engine.templates.explore_11 import translate_geogebra_command
from ova_engine.text import ORACLE_FACTS, _full_prompt
from ova_engine.word_fit import bounds, count_words, fit_words, trim_to_words

SPECS = sorted(
    (s for s in all_specs().values() if s.phase in ("engage", "explore")), key=lambda s: (s.phase, s.rt)
)
SEC = "Pedido del docente (respeta su objetivo y nivel): {t}. Nivel educativo: secundaria."
PROHIBIDO = re.compile(r"Oracle|SGBD|\bDBA\b|\bSQL\b|base de datos|bases de datos|tablespace|\bSGA\b", re.I)


@pytest.mark.parametrize("spec", SPECS, ids=lambda s: s.key)
@pytest.mark.parametrize("tema", ["La fotosíntesis", "Derivadas como razón de cambio"])
def test_prompt_neutro_para_temas_que_no_son_de_bd(spec, tema):
    p = spec.prompt(tema, SEC.format(t=tema), spec.resolve_params({}))
    assert not PROHIBIDO.search(p), PROHIBIDO.search(p).group(0)
    assert "secundaria" in p
    assert "Oracle" not in _full_prompt(p, {}, False)


@pytest.mark.parametrize("spec", SPECS, ids=lambda s: s.key)
def test_prompt_de_bd_conserva_el_contexto_oracle(spec):
    tema = "Tablespaces en Oracle"
    p = spec.prompt(tema, SEC.format(t=tema), spec.resolve_params({}))
    assert "Tablespaces en Oracle" in p
    assert ORACLE_FACTS in _full_prompt(p, {})


def test_hechos_oracle_solo_si_el_tema_es_de_bd():
    assert ORACLE_FACTS not in _full_prompt("La fotosíntesis en plantas", {})
    assert ORACLE_FACTS in _full_prompt("Tablespaces en Oracle", {})


def _render(spec, data, params):
    return spec.render(copy.deepcopy(data), RenderContext("Tema", spec.phase, spec.rt, spec.title, params))


@pytest.mark.parametrize("pedido", [1, 2, 3, 5])
@pytest.mark.parametrize("generado", [1, 2, 4, 6])
def test_video_pausa_activa_ajusta_pausas_al_pedido(pedido, generado):
    spec = get_spec("explore", 4)
    data = spec.sample("Tema", {"num_pauses": generado})
    params = spec.resolve_params({"num_pauses": pedido})
    assert params["num_pauses"] == pedido
    out = spec.normalize(data, params)
    assert validate(out, spec.schema(params)) == []
    html = _render(spec, out, params)
    assert html.count('class="ova-step"') == pedido + 1 or html.count("ova-step\"") >= pedido
    assert f'total="{pedido}"' in html


def test_video_pausa_activa_prompt_para_el_docente_no_bloquea_la_finalizacion():
    spec = get_spec("explore", 4)
    params = spec.resolve_params({"num_pauses": 2})
    html = _render(spec, spec.sample("Tema", params), params)
    assert "<details" in html and "Para el docente" in html
    assert "copia el prompt" not in html
    assert "ovaMark('prompt')" not in html


@pytest.mark.parametrize(
    ("es", "en"),
    [
        ("a = Deslizador(-3, 3, 0.1)", "a = Slider(-3, 3, 0.1)"),
        ("r = Recta(P, Q)", "r = Line(P, Q)"),
        ("t = Tangente(a, f)", "t = Tangent(a, f)"),
        ("P = Punto(f)", "P = Point(f)"),
        ("s = Segmento(A, B)", "s = Segment(A, B)"),
        ("c = Circunferencia(A, 3)", "c = Circle(A, 3)"),
        ("I = Interseca(f, g)", "I = Intersect(f, g)"),
        ("I = Intersección(f, g)", "I = Intersect(f, g)"),
        ("g = Derivada(f)", "g = Derivative(f)"),
        ("h = Función(x^2, 0, 3)", "h = Function(x^2, 0, 3)"),
        ("M = PuntoMedio(A, B)", "M = Midpoint(A, B)"),
        ("f(x) = a * x^2", "f(x) = a * x^2"),
        ("Slider(1, 2)", "Slider(1, 2)"),
    ],
)
def test_geogebra_traduce_comandos_en_espanol(es, en):
    assert translate_geogebra_command(es) == en


def test_geogebra_renderiza_comandos_ingleses_y_parametros_del_applet():
    spec = get_spec("explore", 11)
    params = spec.resolve_params({})
    data = spec.sample("Parábolas", params)
    data["comandos"] = ["a = Deslizador(-3, 3, 0.1)", "f(x) = a x^2", "t = Tangente(1, f)"]
    html = _render(spec, spec.normalize(data, params), params)
    assert "Deslizador" not in html and "Tangente" not in html
    assert "Slider(-3, 3, 0.1)" in html and "Tangent(1, f)" in html
    assert "language: 'es'" in html
    assert "showErrorDialogs: false" in html
    assert 'id="ggb-warn"' in html
    assert "console.warn" in html


def test_ajuste_de_palabras_del_podcast():
    largo = " ".join(["palabra."] * 145)
    lo, hi = bounds(90)
    assert count_words(trim_to_words(largo, 90)) <= hi
    assert lo <= count_words(fit_words(largo, 90)) <= hi
    corto = " ".join(["hola"] * 20)
    llamadas = []

    def reparar(cur, n):
        llamadas.append(n)
        return " ".join(["texto."] * n)

    out = fit_words(corto, 90, regenerate=reparar)
    assert llamadas == [90] and lo <= count_words(out) <= hi
    dentro = " ".join(["x"] * 90)
    assert fit_words(dentro, 90, regenerate=reparar) == dentro and llamadas == [90]


def test_resumen_oculta_el_logro_hasta_desbloquear_el_boton():
    from llm.ova_components import _JS_PATH

    js = _JS_PATH.read_text(encoding="utf-8")
    assert "upao-complete[locked]" in js
    assert ".panel.pending h2" in js
    assert "emit('upao-unlocked')" in js
