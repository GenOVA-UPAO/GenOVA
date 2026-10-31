"""El worker arq carga el catálogo de modelos al arrancar (parámetros por modelo)."""

import asyncio

import worker


def _quiet_startup(monkeypatch):
    monkeypatch.setattr(worker, "_start_late_videos", lambda: None)
    monkeypatch.setattr(worker, "_recover_regen", lambda: None)
    monkeypatch.setattr(worker, "_find_orphans_to_requeue", lambda: [])


def test_on_startup_refresca_el_catalogo(monkeypatch):
    calls = []
    _quiet_startup(monkeypatch)
    monkeypatch.setattr(
        "llm.catalog.catalog_refresh.refresh_catalog", lambda db=None, **k: calls.append(db)
    )
    asyncio.run(worker.WorkerSettings.on_startup({}))
    assert len(calls) == 1


def test_on_startup_sigue_si_el_catalogo_falla(monkeypatch):
    _quiet_startup(monkeypatch)
    seen = []

    def boom(db=None, **k):
        raise RuntimeError("sin red ni BD")

    monkeypatch.setattr("llm.catalog.catalog_refresh.refresh_catalog", boom)
    monkeypatch.setattr(worker, "_find_orphans_to_requeue", lambda: seen.append(1) or [])
    asyncio.run(worker.WorkerSettings.on_startup({}))
    assert seen == [1]
