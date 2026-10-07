"""El dominio del motor no está fijado a Oracle: se deriva del tema y del nivel (A1 del QA)."""

import re

import pytest

from ova_engine import text as text_mod
from ova_engine.domain_context import detect_level, domain_for, is_db_text
from ova_engine.registry import all_specs

SPECS = sorted(all_specs().values(), key=lambda s: (s.phase, s.rt))
_PROHIBIDAS_RE = re.compile(r"\b(oracle|sgbd|dba|tablespaces?|sql|pl/sql)\b|bases? de datos")


def _halladas(texto: str) -> list[str]:
    return [m.group(0) for m in _PROHIBIDAS_RE.finditer(texto.lower())]
TEMAS_NO_BD = [
    ("La fotosíntesis", "Pedido del docente (respeta su objetivo y nivel): La fotosíntesis. Nivel educativo: secundaria."),
    ("Derivadas como razón de cambio", "Pedido del docente (respeta su objetivo y nivel): Derivadas. Nivel educativo: universitario (ciclos iniciales)."),
]


@pytest.mark.parametrize("tema", ["tablespaces en Oracle", "Índices B-tree", "Consultas SQL con JOIN", "Bases de datos relacionales", "PL/SQL: cursores"])
def test_detecta_temas_de_bd(tema):
    assert is_db_text(tema)
    assert domain_for(tema).is_db


@pytest.mark.parametrize("tema", ["La fotosíntesis", "Derivadas como razón de cambio", "La Revolución Francesa", "Índice de masa corporal"])
def test_temas_ajenos_no_son_bd(tema):
    assert not domain_for(tema).is_db


def test_nivel_educativo():
    assert detect_level("X. Nivel educativo: secundaria.") == "secundaria"
    assert detect_level("Nivel educativo: universitario (ciclos iniciales).") == "universitario"
    assert detect_level("Nivel educativo: posgrado") == "posgrado"
    assert detect_level("sin nivel") == "general"
    assert "profesional" not in domain_for("La fotosíntesis", TEMAS_NO_BD[0][1]).practica


@pytest.mark.parametrize("spec", SPECS, ids=lambda s: s.key)
@pytest.mark.parametrize("concept,contexto", TEMAS_NO_BD, ids=["fotosintesis", "derivadas"])
def test_prompt_de_tema_ajeno_no_menciona_oracle(spec, concept, contexto):
    params = spec.resolve_params({})
    prompt = spec.prompt(concept, contexto, params)
    full = text_mod._full_prompt(prompt, spec.schema(params), domain_for(concept, contexto).is_db)
    halladas = _halladas(full)
    assert not halladas, (spec.key, halladas)
    assert "Hechos de Oracle" not in full


@pytest.mark.parametrize("spec", SPECS, ids=lambda s: s.key)
def test_prompt_de_tema_bd_conserva_el_dominio(spec):
    params = spec.resolve_params({})
    prompt = spec.prompt("tablespaces en Oracle", "", params)
    assert "tablespaces en Oracle" in prompt


def test_hechos_de_oracle_solo_si_se_nombra_oracle():
    schema = {"type": "object"}
    assert "Hechos de referencia de Oracle" in text_mod._full_prompt("Explica tablespaces en Oracle", schema)
    assert "Hechos de referencia de Oracle" not in text_mod._full_prompt("Explica la fotosíntesis", schema)
    # Un tema de BD sin Oracle (tarea 36) tampoco lleva los hechos.
    assert "Hechos de referencia de Oracle" not in text_mod._full_prompt("Explica los índices en bases de datos", schema)
    assert "Hechos de referencia de Oracle" in text_mod._full_prompt("x", schema, db_facts=True)
    assert "Hechos de referencia de Oracle" not in text_mod._full_prompt("Oracle", schema, db_facts=False)


def test_podcast_no_hereda_el_curso_de_oracle():
    from prometheus.prompts.engage_prompts import prompt_texto

    pedido = "La fotosíntesis. Nivel educativo: secundaria."
    p = prompt_texto(3, pedido, "")
    assert not _halladas(p), p
    assert "estudiantes de secundaria" in p
    db = prompt_texto(3, "Tablespaces en Oracle", "")
    assert "Oracle" in db


@pytest.mark.parametrize(
    "tema",
    [
        # Palabras que contienen un término de BD como subcadena (QA 2026-10-06:
        # «transforman» contiene «rman» y la fotosíntesis salía con Oracle).
        "La fotosíntesis: cómo las plantas transforman la luz en energía",
        "Ecuaciones de primer grado y su comprobación",
        "Transformaciones geométricas en el plano",
        "Dibujo técnico: vistas y cotas",
    ],
)
def test_subcadenas_no_activan_el_dominio_bd(tema):
    assert not domain_for(tema).is_db


@pytest.mark.parametrize("tema", ["Copias de seguridad con RMAN", "Consultas SQL con JOIN", "Índices B-tree en Oracle"])
def test_terminos_completos_si_activan_el_dominio_bd(tema):
    assert domain_for(tema).is_db
