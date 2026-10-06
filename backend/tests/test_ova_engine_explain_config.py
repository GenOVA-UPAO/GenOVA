"""explain: dominio neutro en los prompts y recuentos fieles a la configuración (A1, A6, M6)."""

import re

import pytest

from ova_engine.contract import RenderContext
from ova_engine.registry import all_specs

EXPLAIN = sorted((s for s in all_specs().values() if s.phase == "explain"), key=lambda s: s.rt)
BAD = re.compile(r"Oracle|SGBD|\bDBA\b|\bSQL\b|base de datos|bases de datos|tablespace", re.IGNORECASE)
PEDIDO = "Pedido del docente (respeta su objetivo y nivel): La fotosíntesis. Nivel educativo: secundaria."


@pytest.mark.parametrize("spec", EXPLAIN, ids=lambda s: s.key)
@pytest.mark.parametrize("tema", ["La fotosíntesis", "Derivadas como razón de cambio"])
def test_prompt_sin_oracle_en_temas_ajenos(spec, tema):
    p = spec.prompt(tema, PEDIDO if "foto" in tema else "", spec.resolve_params({}))
    assert BAD.search(p) is None, BAD.search(p).group()


@pytest.mark.parametrize("spec", EXPLAIN, ids=lambda s: s.key)
def test_prompt_conserva_oracle_en_temas_de_bd(spec):
    p = spec.prompt("Tablespaces en Oracle", "", spec.resolve_params({}))
    assert "Oracle" in p or "base" in p.lower() or "SGBD" in p


def test_render_sin_oracle_en_tema_ajeno():
    for spec in EXPLAIN:
        params = spec.resolve_params({})
        data = spec.sample("La fotosíntesis", params)
        html = spec.render(data, RenderContext("La fotosíntesis", spec.phase, spec.rt, spec.title, params))
        # los textos fijos de la plantilla (no el sample) no nombran Oracle/DBA
        for fixed in ("ROL DBA", "para el DBA", "en el SGBD", "Buenas prácticas del DBA"):
            assert fixed not in html, (spec.key, fixed)


def test_demo_animada_recorta_pasos():
    spec = all_specs()["explain:5"]
    params = spec.resolve_params({"num_steps": 3})
    data = spec.sample("La fotosíntesis", spec.resolve_params({"num_steps": 5}))
    assert len(data["pasos"]) == 5
    out = spec.normalize(data, params)
    assert len(out["pasos"]) == 3 and [p["paso"] for p in out["pasos"]] == [1, 2, 3]
    html = spec.render(out, RenderContext("La fotosíntesis", "explain", 5, spec.title, params))
    assert 'total="3"' in html and "Paso 1 de 3" in html


def test_demo_animada_indicador_no_tapa_el_nodo():
    spec = all_specs()["explain:5"]
    params = spec.resolve_params({"num_steps": 4})
    data = spec.sample("Tema", params)
    data["pasos"][0]["titulo"] = "Parsing y escritura en memoria compartida"
    html = spec.render(data, RenderContext("Tema", "explain", 5, spec.title, params))
    m = re.search(r'id="node-1"[^>]*data-cy="([\d.]+)"', html)
    assert float(m.group(1)) < 92 - 76 / 2 + 1  # por encima del borde superior del nodo
    assert "Parsing y escritura" in html and "<title>Parsing y escritura en memoria compartida</title>" in html


def test_diagrama_framework_8_bloques_y_recuentos_coherentes():
    spec = all_specs()["explain:8"]
    params = spec.resolve_params({"num_blocks": 8})
    assert params["num_blocks"] == 8
    data = spec.sample("Tema", params)
    data["bloques"] = data["bloques"][:7]  # el modelo escribió 7
    data["flujo"][0]["paso"] = "1. Entra la operación"
    out = spec.normalize(data, params)
    html = spec.render(out, RenderContext("Tema", "explain", 8, spec.title, params))
    assert 'total="8"' in html and "0 de 8 pasos" in html  # barra y contador coinciden
    assert "<li>Entra la operación</li>" in html
    assert "DIAGRAMA DE FRAMEWORK" in html and "ARQUITECTURA" not in html.split("<style>")[0]
    assert "max-height:70vh" not in html


def test_diagrama_framework_recorta_sobrantes():
    spec = all_specs()["explain:8"]
    params = spec.resolve_params({"num_blocks": 4})
    data = spec.sample("Tema", spec.resolve_params({"num_blocks": 7}))
    out = spec.normalize(data, params)
    assert len(out["bloques"]) == 4
    assert all(1 <= f["bloque"] <= 4 for f in out["flujo"])
