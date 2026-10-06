"""EVALUATE: prompts sin Oracle fuera de BD (A1), recuentos frente a params (A6), quiz adaptativo (B5)."""

import re

import pytest

from ova_engine.contract import RenderContext
from ova_engine.registry import all_specs
from ova_engine.schema import validate

SPECS = sorted((s for s in all_specs().values() if s.phase == "evaluate"), key=lambda s: s.rt)
PROHIBIDO = re.compile(r"oracle|sgbd|\bdba\b|\bsql\b|base de datos|bases de datos|tablespace", re.I)
CTX_SEC = "Pedido del docente (respeta su objetivo y nivel): La fotosíntesis. Nivel educativo: secundaria."


@pytest.mark.parametrize("spec", SPECS, ids=lambda s: s.key)
@pytest.mark.parametrize("tema", ["La fotosíntesis", "Derivadas como razón de cambio"])
def test_prompt_neutro_fuera_de_bd(spec, tema):
    p = spec.prompt(tema, CTX_SEC, spec.resolve_params({}))
    assert not PROHIBIDO.search(p), PROHIBIDO.search(p).group(0)
    assert "secundaria" in p


@pytest.mark.parametrize("spec", SPECS, ids=lambda s: s.key)
def test_prompt_de_bd_conserva_oracle(spec):
    p = spec.prompt("Tablespaces en Oracle", "", spec.resolve_params({}))
    assert "Oracle" in p or "bases de datos" in p.lower() or "SGBD" in p or "Base de Datos" in p


def test_diploma_secundaria_sin_practica_profesional():
    spec = next(s for s in SPECS if s.rt == 10)
    p = spec.prompt("La fotosíntesis", CTX_SEC, spec.resolve_params({}))
    assert "profesional" not in p.lower().replace("no hables de práctica profesional", "")
    data = spec.sample("La fotosíntesis", spec.resolve_params({}))
    html = spec.render(data, RenderContext("La fotosíntesis", "evaluate", 10, spec.title, {}))
    assert "práctica profesional" not in html


@pytest.mark.parametrize("spec", [s for s in SPECS if s.normalize], ids=lambda s: s.key)
def test_normalize_recorta_si_hay_mas(spec):
    params = spec.resolve_params({})
    data = spec.sample("Tema", params)
    if spec.rt == 11:
        for k in data["banco"]:
            data["banco"][k] = data["banco"][k] * 2
        out = spec.normalize(data, params)
        assert all(len(v) == params["num_per_level"] for v in out["banco"].values())
        return
    (key,) = [k for k, v in data.items() if isinstance(v, list)][:1]
    data[key] = data[key] * 2
    out = spec.normalize(data, params)
    assert validate(out, spec.schema(params)) == []


def test_crucigrama_con_menos_terminos_ajusta_barra_y_contador():
    spec = next(s for s in SPECS if s.rt == 7)
    params = spec.resolve_params({"num_terms": 12})
    assert params["num_terms"] == 12
    data = spec.sample("Tema", spec.resolve_params({}))
    data["entradas"] = data["entradas"][:5]
    html = spec.render(data, RenderContext("Tema", "evaluate", 7, spec.title, params))
    total = re.search(r'<upao-progress id="prog" current="0" total="(\d+)"', html).group(1)
    assert int(total) <= 5 and total != "12"
    assert "words.length" in html  # el contador del JS usa el número real


def test_quiz_adaptativo_max_preguntas_configurable():
    spec = next(s for s in SPECS if s.rt == 11)
    prm = next(p for p in spec.params if p.name == "max_questions")
    assert (prm.min, prm.max, prm.default) == (4, 10, 6)
    params = spec.resolve_params({"max_questions": 10, "num_per_level": 4})
    p = spec.prompt("Tema", "", params)
    assert "máximo de 10 preguntas" in p
    data = spec.sample("Tema", params)
    html = spec.render(data, RenderContext("Tema", "evaluate", 11, spec.title, params))
    assert 'total="10"' in html
    # banco más chico que el máximo: el contador usa el real
    params = spec.resolve_params({"max_questions": 10, "num_per_level": 2})
    html = spec.render(spec.sample("Tema", params), RenderContext("Tema", "evaluate", 11, spec.title, params))
    assert 'total="6"' in html
