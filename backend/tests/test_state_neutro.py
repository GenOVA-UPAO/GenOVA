"""El `state` del motor de decisión y del planner usa el DomainContext (sin «SGBD» fijo)."""

from __future__ import annotations

import re

from ova_engine.decision import build_state
from ova_engine.domain_context import area_scope
from ova_engine.registry import all_specs

_BD = re.compile(r"sgbd|oracle|base de datos|bases de datos", re.IGNORECASE)


def _capture_planner_state(monkeypatch, concept, contexto=""):
    import ova_engine.planner as pl

    seen = {}

    class R:
        def raise_for_status(self):
            pass

        def json(self):
            return {"answers": {}}

    def post(url, json, **kw):
        seen["state"] = json["state"]
        return R()

    monkeypatch.setenv("OVA_DECISION_BACKEND", "laya")
    monkeypatch.setattr(pl.httpx, "post", post)
    pl.plan_ova_global(concept, contexto)
    return seen["state"]


def _spec():
    return next(iter(all_specs().values()))


def test_decision_state_sin_area_y_biologia_es_neutro():
    assert not _BD.search(build_state(_spec(), "La fotosíntesis"))
    with area_scope("Biología celular"):
        s = build_state(_spec(), "La fotosíntesis")
    assert not _BD.search(s) and "Biología celular" in s


def test_decision_state_con_area_bd():
    with area_scope("Bases de datos"):
        s = build_state(_spec(), "Índices")
    assert _BD.search(s) and "Oracle" not in s
    with area_scope("Oracle Database"):
        assert "Oracle" in build_state(_spec(), "Índices")


def test_planner_state_neutro_y_con_bd(monkeypatch):
    s = _capture_planner_state(monkeypatch, "La fotosíntesis")
    assert not _BD.search(s)
    with area_scope("Biología"):
        s = _capture_planner_state(monkeypatch, "La fotosíntesis")
    assert not _BD.search(s) and "Biología" in s
    with area_scope("Bases de datos"):
        s = _capture_planner_state(monkeypatch, "Índices")
    assert _BD.search(s)


def test_nivel_en_el_state():
    s = build_state(_spec(), "Células", "Pedido del docente: Nivel educativo: Secundaria")
    assert "secundaria" in s
