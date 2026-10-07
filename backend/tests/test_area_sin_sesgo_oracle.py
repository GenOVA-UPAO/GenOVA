"""Un área de BD no implica Oracle ni transacciones (tarea 36), sin LLM real."""

import re

import pytest

from ova_engine import pipeline
from ova_engine.domain_context import area_scope, domain_for, with_area
from ova_engine.registry import all_specs
from ova_engine.text import ORACLE_FACTS, _full_prompt

AREA_BD = "bases de datos"
AREA_BD_LARGA = "Sistemas y gestión de base de datos"
AREA_ORACLE = "Sistemas de gestión de bases de datos con Oracle"
_SIN_ORACLE = re.compile(r"oracle|\bsga\b|tablespace|\brman\b|\bv\$|ora-\d|plsql|pl/sql|redo log|buffer cache", re.I)


def _prompt_final(tema: str, area: str, contexto: str = "") -> str:
    d = domain_for(tema, contexto, area=area)
    return _full_prompt(with_area(d.rules(), tema, area=area), {"type": "object"}, d.is_oracle)


def test_area_bd_con_seguridad_no_lleva_hechos_ni_oracle():
    full = _prompt_final("Seguridad", AREA_BD)
    assert ORACLE_FACTS not in full
    assert "oracle" not in full.lower()
    assert "FOCO" in full  # ancla de tema


def test_area_bd_larga_con_seguridad_tampoco():
    d = domain_for("Seguridad", "", area=AREA_BD_LARGA)
    assert d.is_db and not d.is_oracle
    assert d.motor != "Oracle"
    assert "Oracle" not in d.curso


def test_area_oracle_con_seguridad_si_lleva_hechos_con_el_tema_manda():
    d = domain_for("Seguridad", "", area=AREA_ORACLE)
    assert d.is_oracle and d.motor == "Oracle"
    full = _prompt_final("Seguridad", AREA_ORACLE)
    assert ORACLE_FACTS in full
    assert "el tema manda" in full
    assert "Oracle" in d.curso


def test_sin_area_tablespaces_en_oracle_sigue_siendo_oracle():
    d = domain_for("tablespaces en Oracle", "")
    assert d.is_db and d.is_oracle
    assert ORACLE_FACTS in _full_prompt("x", {"type": "object"}, d.is_oracle)


def test_tablespace_o_plsql_solos_son_oracle_y_sql_no():
    assert domain_for("Tablespace", "").is_oracle
    assert domain_for("Cursores en PL/SQL", "").is_oracle
    assert not domain_for("Consultas SQL", "").is_oracle
    assert not domain_for("Normalización", "", area=AREA_BD).is_oracle
    assert not domain_for("Fotosíntesis", "").is_oracle


def test_hechos_por_defecto_se_detectan_en_el_prompt():
    assert ORACLE_FACTS in _full_prompt("[ÁREA] Oracle", {})
    assert ORACLE_FACTS not in _full_prompt("[ÁREA] bases de datos", {})


@pytest.mark.parametrize("spec", sorted(all_specs().values(), key=lambda s: (s.phase, s.rt)), ids=lambda s: s.key)
def test_ninguna_plantilla_nombra_oracle_con_area_bd_generica(spec, monkeypatch):
    seen = {}

    def fake(prompt, *_a, **k):
        seen["prompt"], seen["db_facts"] = prompt, k.get("db_facts")
        raise RuntimeError("stop")

    monkeypatch.setattr(pipeline, "generate_json", fake)
    monkeypatch.setattr(pipeline, "_params", lambda s, *_a, **_k: s.resolve_params({}))
    with area_scope(AREA_BD), pytest.raises(RuntimeError):
        pipeline.generate_with_template(spec, "Árboles")
    m = _SIN_ORACLE.search(seen["prompt"])
    assert m is None, f"{spec.key}: «{m.group(0)}» en el prompt: ...{seen['prompt'][max(0, m.start() - 60):m.end() + 60]}..."
    assert seen["db_facts"] is False
    assert ORACLE_FACTS not in _full_prompt(seen["prompt"], {}, seen["db_facts"])


@pytest.mark.parametrize("spec", sorted(all_specs().values(), key=lambda s: (s.phase, s.rt)), ids=lambda s: s.key)
def test_con_oracle_en_el_tema_las_plantillas_siguen_con_oracle(spec, monkeypatch):
    seen = {}

    def fake(prompt, *_a, **k):
        seen["db_facts"] = k.get("db_facts")
        raise RuntimeError("stop")

    monkeypatch.setattr(pipeline, "generate_json", fake)
    monkeypatch.setattr(pipeline, "_params", lambda s, *_a, **_k: s.resolve_params({}))
    with pytest.raises(RuntimeError):
        pipeline.generate_with_template(spec, "tablespaces en Oracle")
    assert seen["db_facts"] is True
