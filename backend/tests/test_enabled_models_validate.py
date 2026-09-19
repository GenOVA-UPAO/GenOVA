"""HU-034 R7 — enable/disable validation against the unified catalog."""

import pytest

from llm.catalog.model_catalog import DEFAULTS
from users.interface.http.settings_enabled_models_router import _validate_enabled_models


def _fake_full_catalog():
    defaults = [
        {"provider": d["provider"], "model_id": d["model_id"], "category": "texto"}
        for d in DEFAULTS.values()
    ]
    image = [
        {
            "provider": "siliconflow",
            "model_id": "black-forest-labs/FLUX.1-schnell",
            "category": "imagen",
            "active": True,
        },
        {
            "provider": "runware",
            "model_id": "runware:100@1",
            "category": "imagen",
            "active": True,
        },
    ]
    return defaults + image


def test_validate_accepts_unified_image_model(monkeypatch):
    monkeypatch.setattr(
        "users.interface.http.settings_enabled_models_router.get_full_catalog_entries",
        _fake_full_catalog,
    )
    clean = _validate_enabled_models(
        [{"provider": "siliconflow", "model_id": "black-forest-labs/FLUX.1-schnell"}]
    )
    keys = {(e["provider"], e["model_id"]) for e in clean}
    assert ("siliconflow", "black-forest-labs/FLUX.1-schnell") in keys
    # Defaults always re-injected (cannot be disabled).
    for d in DEFAULTS.values():
        assert (d["provider"], d["model_id"]) in keys


def test_validate_omits_disabled_non_default(monkeypatch):
    monkeypatch.setattr(
        "users.interface.http.settings_enabled_models_router.get_full_catalog_entries",
        _fake_full_catalog,
    )
    # Only enable siliconflow — runware stays out (disabled).
    clean = _validate_enabled_models(
        [{"provider": "siliconflow", "model_id": "black-forest-labs/FLUX.1-schnell"}]
    )
    keys = {(e["provider"], e["model_id"]) for e in clean}
    assert ("runware", "runware:100@1") not in keys


def test_validate_rejects_unknown_model(monkeypatch):
    monkeypatch.setattr(
        "users.interface.http.settings_enabled_models_router.get_full_catalog_entries",
        _fake_full_catalog,
    )
    with pytest.raises(ValueError, match="Modelo no reconocido"):
        _validate_enabled_models([{"provider": "falai", "model_id": "does-not-exist"}])


def test_validate_reinjects_defaults_when_omitted(monkeypatch):
    monkeypatch.setattr(
        "users.interface.http.settings_enabled_models_router.get_full_catalog_entries",
        _fake_full_catalog,
    )
    clean = _validate_enabled_models([])
    keys = {(e["provider"], e["model_id"]) for e in clean}
    for d in DEFAULTS.values():
        assert (d["provider"], d["model_id"]) in keys
