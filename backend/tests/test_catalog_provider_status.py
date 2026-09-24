"""Estado por proveedor del catálogo: «sin conectar» no es un fallo.

Un proveedor sin clave de plataforma no se consulta a propósito. Antes se
marcaba igual que una caída (`ok: False`) y la pantalla de Modelos avisaba en
rojo de que «no pudimos obtener sus modelos» aunque nada hubiera fallado.
"""

import pytest

from llm.catalog import catalog_gather, catalog_refresh
from llm.catalog.catalog_refresh_providers import ProviderNotConfiguredError


def _not_configured(provider: str):
    def fetch():
        raise ProviderNotConfiguredError(provider)

    return fetch


def _failing():
    return None


@pytest.fixture
def fetchers(monkeypatch):
    """Parchea los fetchers de gather: por defecto todos responden."""

    def install(**overrides):
        defaults = {
            "_fetch_openrouter": lambda: {"x/model": {"id": "x/model"}},
            "_fetch_groq": lambda: {"llama"},
            "_fetch_opencode": lambda: {"oc"},
            "_fetch_huggingface": lambda: {"hf"},
        }
        defaults.update(overrides)
        for name, fn in defaults.items():
            monkeypatch.setattr(catalog_gather, name, fn)
        monkeypatch.setattr(catalog_gather, "has_platform_key", lambda _p: True)
        monkeypatch.setattr(catalog_gather, "_load_cached", lambda _db, _p: None)

    return install


def test_provider_without_key_is_not_configured_but_not_failed_fetch(fetchers):
    fetchers(
        _fetch_groq=_not_configured("groq"),
        _fetch_huggingface=_not_configured("huggingface"),
    )
    data, sources, configured = catalog_gather._gather_provider_data(None, 1.0)

    assert configured == {
        "openrouter": True,
        "groq": False,
        "opencode": True,
        "huggingface": False,
    }
    assert sources["groq"] is None
    assert data["groq_ids"] is None
    assert sources["opencode"] == "api"


def test_real_failure_stays_configured(fetchers):
    fetchers(_fetch_opencode=_failing)
    _data, sources, configured = catalog_gather._gather_provider_data(None, 1.0)

    assert configured["opencode"] is True
    assert sources["opencode"] is None


def test_crashing_fetcher_does_not_break_the_others(fetchers):
    def boom():
        raise RuntimeError("db down")

    fetchers(_fetch_groq=boom)
    _data, sources, configured = catalog_gather._gather_provider_data(None, 1.0)

    assert sources["groq"] is None
    assert configured["groq"] is True
    assert sources["openrouter"] == "api"
    assert sources["huggingface"] == "api"


def test_openrouter_without_key_is_fetched_but_not_connected(fetchers, monkeypatch):
    fetchers()
    monkeypatch.setattr(catalog_gather, "has_platform_key", lambda _p: False)
    _data, sources, configured = catalog_gather._gather_provider_data(None, 1.0)

    assert sources["openrouter"] == "api"
    assert configured["openrouter"] is False


def test_unconfigured_provider_falls_back_to_cache(fetchers, monkeypatch):
    fetchers(_fetch_groq=_not_configured("groq"))
    monkeypatch.setattr(
        catalog_gather, "_load_cached", lambda _db, p: {"cached"} if p == "groq" else None
    )
    data, sources, configured = catalog_gather._gather_provider_data(None, 1.0)

    assert data["groq_ids"] == {"cached"}
    assert sources["groq"] == "cache"
    assert configured["groq"] is False


@pytest.fixture
def isolated_refresh(monkeypatch):
    """refresh_catalog sin tocar el estado global que usan otros tests."""
    for name in (
        "_merge_openrouter",
        "_merge_groq",
        "_merge_opencode",
        "_merge_huggingface",
        "_rebuild_catalog",
    ):
        monkeypatch.setattr(catalog_refresh, name, lambda *_a: None)
    monkeypatch.setattr(catalog_refresh, "_build_full_catalog", lambda *_a: [])
    monkeypatch.setattr(catalog_refresh, "_catalog", list(catalog_refresh._catalog))
    monkeypatch.setattr(catalog_refresh, "_full_catalog", list(catalog_refresh._full_catalog))
    monkeypatch.setattr(
        catalog_refresh,
        "_provider_status",
        {p: dict(st) for p, st in catalog_refresh._provider_status.items()},
    )
    monkeypatch.setattr(catalog_refresh, "_last_full_success", None)


@pytest.mark.usefixtures("isolated_refresh")
def test_refresh_reports_configured_flag(monkeypatch):
    data = {"or_data": {}, "groq_ids": None, "opencode_ids": {"oc"}, "hf_ids": None}
    sources = {"openrouter": "api", "groq": None, "opencode": "api", "huggingface": None}
    configured = {"openrouter": True, "groq": False, "opencode": True, "huggingface": True}
    monkeypatch.setattr(
        catalog_refresh,
        "_gather_provider_data",
        lambda _db, _t: (data, sources, configured),
    )

    catalog_refresh.refresh_catalog()
    status = catalog_refresh.get_provider_status()

    assert status["groq"]["configured"] is False
    assert status["groq"]["ok"] is False
    # HuggingFace tiene clave y aun así no respondió: ese sí es un fallo.
    assert status["huggingface"]["configured"] is True
    assert status["huggingface"]["ok"] is False
    assert status["opencode"]["ok"] is True
    assert status["opencode"]["configured"] is True
    # Groq sin clave no cuenta para «refrescado del todo», pero HuggingFace sí.
    assert catalog_refresh._last_full_success is None


@pytest.mark.usefixtures("isolated_refresh")
def test_refresh_is_fresh_when_every_connected_provider_answered(monkeypatch):
    data = {"or_data": {}, "groq_ids": None, "opencode_ids": {"oc"}, "hf_ids": {"hf"}}
    sources = {"openrouter": "api", "groq": None, "opencode": "api", "huggingface": "api"}
    configured = {"openrouter": True, "groq": False, "opencode": True, "huggingface": True}
    monkeypatch.setattr(
        catalog_refresh,
        "_gather_provider_data",
        lambda _db, _t: (data, sources, configured),
    )

    catalog_refresh.refresh_catalog()

    assert catalog_refresh._last_full_success is not None


@pytest.mark.usefixtures("isolated_refresh")
def test_force_refresh_skips_the_fresh_window(monkeypatch):
    """Tras conectar un proveedor hay que pedir su lista ya, aunque el último
    refresco completo sea de hace unos segundos."""
    calls = []
    data = {"or_data": {}, "groq_ids": {"llama"}, "opencode_ids": None, "hf_ids": None}
    sources = {"openrouter": "api", "groq": "api", "opencode": None, "huggingface": None}
    configured = {"openrouter": True, "groq": True, "opencode": False, "huggingface": False}

    def gather(_db, _t):
        calls.append(1)
        return data, sources, configured

    monkeypatch.setattr(catalog_refresh, "_gather_provider_data", gather)

    catalog_refresh.refresh_catalog()
    catalog_refresh.refresh_catalog()
    assert len(calls) == 1

    catalog_refresh.refresh_catalog(force=True)
    assert len(calls) == 2
