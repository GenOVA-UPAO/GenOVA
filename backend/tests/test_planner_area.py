"""El área temática inclina el planner determinista; los recursos a mano mandan."""

from __future__ import annotations

import ova_engine.planner_attrs as pa
from ova_engine.domain_context import area_scope
from ova_engine.planner_table import ATTRS, TABLE


def _flat() -> dict[str, float]:
    return {a: 0.0 for a in ATTRS}


def test_sin_area_el_plan_no_cambia():
    assert pa.select_plan(_flat()) == pa.select_plan(_flat(), area="")
    assert pa.select_plan(_flat()) == pa.select_plan(_flat(), area="Cocina y gastronomía")
    assert pa.area_bonus(None) == {} and pa.area_bonus("  ") == {}


def test_area_bd_favorece_laboratorios_y_simuladores():
    area = "Sistemas de gestión de bases de datos"
    plan = pa.select_plan(_flat(), area=area)
    assert 7 in plan["elaborate"]  # Lab de Código
    assert {1, 7} & set(plan["explore"])


def test_area_ml_favorece_slider_y_diagrama():
    plan = pa.select_plan(_flat(), area="Machine Learning")
    assert 6 in plan["explore"] and 8 in plan["explain"]
    assert 6 not in pa.select_plan(_flat())["explore"]


def test_el_area_no_salta_requisitos_duros():
    # Timeline (req histórico) y Dilema ético (req ético) no entran por el área.
    for area in ("bases de datos", "machine learning", "programación"):
        plan = pa.select_plan(_flat(), area=area)
        assert 8 not in plan["engage"] and 5 not in plan["engage"] and 7 not in plan["explain"]


def test_bonus_solo_referencia_recursos_existentes():
    for area in ("bases de datos", "machine learning", "programación"):
        for phase, n in pa.area_bonus(area):
            assert n in TABLE[phase]


def test_plan_by_attributes_lee_el_area_del_scope():
    base = pa.plan_by_attributes("Introducción", mode="keywords")
    with area_scope("Machine Learning"):
        ml = pa.plan_by_attributes("Introducción", mode="keywords")
    assert ml != base and 6 in ml["explore"]


def test_autoplan_pasa_el_area_y_respeta_recursos_manuales(monkeypatch):
    import ova_engine.planner as planner
    from generation.jobs.jobs_helpers import ResourceRequest, StartJobRequest, autoplan_resources
    from ova_engine.domain_context import current_area

    seen = []
    monkeypatch.setattr(planner, "plan_ova", lambda prompt, contexto="": seen.append(current_area()) or {"engage": [2]})
    p = StartJobRequest(prompt="Árboles")
    autoplan_resources(p, "bases de datos")
    assert seen == ["bases de datos"] and len(p.resources) == 1
    manual = StartJobRequest(prompt="Árboles", resources=[ResourceRequest(phase_type="evaluate", resource_type="1"), ResourceRequest(phase_type="engage", resource_type="2")])
    autoplan_resources(manual, "bases de datos")
    assert seen == ["bases de datos"] and [r.resource_type for r in manual.resources] == ["1", "2"]
