"""Planner por atributos: normalización, perfil (Laya mockeado), tabla y selección."""

from __future__ import annotations

import pytest

from ova_engine import planner
from ova_engine import planner_attrs as pa
from ova_engine.planner_table import ATTRS, TABLE

PHASES = pa.PHASES


def _prof(**kw) -> dict[str, float]:
    return {a: kw.get(a, 0.0) for a in ATTRS}


# ---------------------------------------------------------------- normalización


def test_normalize_quita_preambulo_y_detecta_nivel():
    core, adv = pa.normalize_topic(
        "Para mis alumnos de 5to ciclo que ya vieron transacciones, quiero que diagnostiquen bloqueos en produccion"
    )
    assert core == "diagnostiquen bloqueos en produccion"
    assert adv is True


def test_normalize_tema_simple_intacto():
    assert pa.normalize_topic("Flashback: consultas y tabla") == ("Flashback: consultas y tabla", False)


# ---------------------------------------------------------------- perfil


class _Resp:
    def __init__(self, answers):
        self._a = answers

    def raise_for_status(self):
        pass

    def json(self):
        return {"answers": self._a}


def test_profile_laya_una_llamada_batch(monkeypatch):
    calls = []

    def fake_post(url, json=None, **kw):
        calls.append(json)
        return _Resp({a: {"type": "noul", "noul": 0.9 if a == "historico" else 0.1} for a in pa.ATTRIBUTES})

    monkeypatch.setattr(pa.httpx, "post", fake_post)
    prof = pa.profile_laya("Historia de los modelos", advanced=True)
    assert len(calls) == 1 and set(calls[0]["questions"]) == set(pa.ATTRIBUTES)
    assert prof["historico"] == pytest.approx(0.8) and prof["compara"] == 0.0 and prof["avanzado"] == 1.0


def test_profile_laya_falla_devuelve_none(monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("down")

    monkeypatch.setattr(pa.httpx, "post", boom)
    assert pa.profile_laya("x") is None
    assert pa.plan_by_attributes("Historia de los modelos", mode="laya") is None
    # hibrido degrada a keywords: nunca bloquea
    plan = pa.plan_by_attributes("Historia de los modelos", mode="hibrido")
    assert plan and 7 in plan["explain"]


def test_profile_keywords():
    p = pa.profile_keywords("Historia y evolución de X vs Y")
    assert p["historico"] == 1.0 and p["compara"] == 1.0 and p["etico"] == 0.0


# ---------------------------------------------------------------- tabla


def test_tabla_cubre_los_50_recursos():
    for ph in PHASES:
        assert sorted(TABLE[ph]) == list(range(1, 11))
        for res in TABLE[ph].values():
            assert 1 <= res.nivel <= 5
            for a in [*res.aff, *res.req, *res.req_any]:
                assert a in ATTRS


def test_tabla_coincide_con_catalogo_real():
    cat = planner._catalog()
    for ph in PHASES:
        assert set(cat[ph]) == set(TABLE[ph])


def test_cada_atributo_tiene_pregunta():
    assert set(pa.ATTRIBUTES) == set(ATTRS) - {"avanzado"}


# ---------------------------------------------------------------- selección


def test_seleccion_determinista_y_tres_por_fase():
    prof = _prof(fallo=0.7, diagnostico=0.4)
    a, b = pa.select_plan(prof), pa.select_plan(dict(prof))
    assert a == b
    assert all(len(v) == 3 and len(set(v)) == 3 for v in a.values())


def test_diversidad_de_familias():
    for prof in (_prof(), _prof(historico=1.0), _prof(codigo=1.0, procedimiento=1.0), _prof(tuning=1.0)):
        plan = pa.select_plan(prof)
        for ph, ids in plan.items():
            modals = [TABLE[ph][n].modal for n in ids]
            assert max(modals.count(m) for m in set(modals)) < 3, (ph, modals)


def test_sin_inadecuados_por_requisito():
    plan = pa.select_plan(_prof())  # tema sin histórico, ético ni comparativo
    assert 7 not in plan["explain"] and 9 not in plan["explain"]
    assert 8 not in plan["engage"] and 5 not in plan["engage"]


def test_requisitos_se_activan_con_el_perfil():
    assert 7 in pa.select_plan(_prof(historico=1.0))["explain"]
    assert 8 in pa.select_plan(_prof(historico=1.0))["engage"]
    assert 9 in pa.select_plan(_prof(compara=1.0))["explain"]
    assert 5 in pa.select_plan(_prof(etico=1.0))["engage"]
    assert 6 in pa.select_plan(_prof(tuning=1.0))["explore"]
    assert 7 in pa.select_plan(_prof(codigo=1.0))["elaborate"]


def test_orden_por_progresion_cognitiva():
    plan = pa.select_plan(_prof(fallo=1.0))
    for ph, ids in plan.items():
        niveles = [TABLE[ph][n].nivel for n in ids]
        assert niveles == sorted(niveles)


# ---------------------------------------------------------------- interfaz plan_ova


def test_plan_ova_backend_atributos(monkeypatch):
    monkeypatch.setenv("OVA_DECISION_BACKEND", "planner-atributos")
    monkeypatch.setattr(pa, "profile_laya", lambda *a, **k: _prof(historico=1.0))
    plan = planner.plan_ova("Historia de las bases de datos", "")
    assert set(plan) == set(PHASES) and 7 in plan["explain"]


def test_plan_ova_rules_sin_red(monkeypatch):
    monkeypatch.setenv("OVA_DECISION_BACKEND", "rules")
    monkeypatch.setattr(pa.httpx, "post", lambda *a, **k: pytest.fail("no debe usar red"))
    assert planner.plan_ova("x") is None
