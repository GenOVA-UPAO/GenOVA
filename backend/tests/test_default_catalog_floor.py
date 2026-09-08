"""El desplegable de "Configuración de IA" nunca debe quedar vacío.

Bug: si el refresco de un proveedor falla (sin API key, caída), sus modelos se
marcan inactivos y el catálogo filtrado del GET quedaba sin ninguna opción — el
usuario veía "Elige un modelo" y nada que elegir. `default_catalog_floor()`
garantiza que los modelos por defecto del sistema siempre se ofrecen.
"""

from llm.catalog.model_catalog import DEFAULTS, default_catalog_floor


def test_floor_covers_every_default_model():
    floor = default_catalog_floor()
    offered = {(p, m["model_id"]) for p, entries in floor.items() for m in entries}
    for dflt in DEFAULTS.values():
        assert (dflt["provider"], dflt["model_id"]) in offered


def test_floor_entries_are_active_and_shaped():
    for entries in default_catalog_floor().values():
        for entry in entries:
            assert entry["active"] is True
            assert entry["provider"] and entry["model_id"]
            assert entry.get("label")
