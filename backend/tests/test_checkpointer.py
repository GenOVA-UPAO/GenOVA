"""Con OVA_PG_CHECKPOINT=1 un job nuevo no cierra el checkpointer de los que corren.

Antes cada get_checkpointer() abría otro PostgresSaver y reemplazaba el context
manager guardado; al soltar el anterior, CPython finalizaba su generador y el
`with Connection.connect(...)` cerraba la conexión del job que seguía en marcha.
"""

from contextlib import contextmanager

import pytest

import prometheus.engine.checkpointer as cp


class _FakeSaver:
    def setup(self):
        pass


@pytest.fixture()
def fake_pg(monkeypatch):
    from langgraph.checkpoint.postgres import PostgresSaver

    opened = []

    @contextmanager
    def fake_from_conn_string(conninfo):
        state = {"closed": False, "conninfo": conninfo}
        opened.append(state)
        try:
            yield _FakeSaver()
        finally:
            state["closed"] = True

    monkeypatch.setenv("OVA_PG_CHECKPOINT", "1")
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://u:p@db:5432/genova")
    monkeypatch.setattr(PostgresSaver, "from_conn_string", staticmethod(fake_from_conn_string))
    monkeypatch.setattr(cp, "_pg_cm", None)
    monkeypatch.setattr(cp, "_pg_saver", None, raising=False)
    return opened


def test_segundo_job_reutiliza_el_saver_sin_cerrar_el_primero(fake_pg):
    first = cp.get_checkpointer()
    second = cp.get_checkpointer()

    assert first is second
    assert len(fake_pg) == 1
    assert fake_pg[0]["closed"] is False
    assert fake_pg[0]["conninfo"] == "postgresql://u:p@db:5432/genova"


def test_sin_flag_no_hay_checkpointer(monkeypatch):
    # Un MemorySaver guardaba una copia del estado (HTML con medios en base64) en
    # cada paso del grafo y llevaba el proceso por encima de 512 MB en Render.
    monkeypatch.delenv("OVA_PG_CHECKPOINT", raising=False)
    assert cp.get_checkpointer() is None


def test_grafo_sin_checkpointer_no_retiene_copias_del_estado(monkeypatch):
    import operator
    from typing import Annotated, TypedDict

    from langgraph.graph import END, START, StateGraph

    class _S(TypedDict, total=False):
        results: Annotated[list, operator.add]

    g = StateGraph(_S)
    g.add_node("a", lambda s: {"results": ["x"]})
    g.add_node("b", lambda s: {"results": ["y"]})
    g.add_edge(START, "a")
    g.add_edge("a", "b")
    g.add_edge("b", END)
    monkeypatch.delenv("OVA_PG_CHECKPOINT", raising=False)
    compiled = g.compile(checkpointer=cp.get_checkpointer())
    out = compiled.invoke({"results": []}, {"configurable": {"thread_id": "t"}})
    assert out["results"] == ["x", "y"]
    assert compiled.checkpointer is None
