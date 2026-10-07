"""Plantillas elaborate: el prompt respeta el dominio (A1) y el badge usa el nombre del catálogo (B3)."""

import re

import pytest

from ova_engine.contract import RenderContext
from ova_engine.registry import all_specs

SPECS = sorted((s for s in all_specs().values() if s.phase == "elaborate"), key=lambda s: s.rt)
PROHIBIDO = re.compile(r"oracle|sgbd|\bdba\b|\bsql\b|base de datos|bases de datos|tablespace", re.I)
PEDIDO = "Pedido del docente (respeta su objetivo y nivel): {t}. Nivel educativo: secundaria."


@pytest.mark.parametrize("spec", SPECS, ids=lambda s: s.key)
@pytest.mark.parametrize("tema", ["La fotosíntesis", "Derivadas como razón de cambio"])
def test_prompt_sin_oracle_en_temas_ajenos(spec, tema):
    p = spec.prompt(tema, PEDIDO.format(t=tema), spec.resolve_params({}))
    assert tema in p
    assert not PROHIBIDO.search(p), PROHIBIDO.search(p).group(0)
    assert "secundaria" in p


@pytest.mark.parametrize("spec", SPECS, ids=lambda s: s.key)
def test_prompt_conserva_oracle_en_temas_de_bd(spec):
    tema = "Tablespaces en Oracle"
    p = spec.prompt(tema, "", spec.resolve_params({}))
    assert "Oracle" in p


def test_badge_ejercicio_guiado_usa_nombre_del_catalogo():
    spec = all_specs()["elaborate:2"]
    params = spec.resolve_params({})
    ctx = RenderContext("Derivadas", spec.phase, spec.rt, spec.title, params)
    html = spec.render(spec.sample("Derivadas", params), ctx)
    assert "LABORATORIO GUIADO" not in html
    assert spec.title.upper() in html
