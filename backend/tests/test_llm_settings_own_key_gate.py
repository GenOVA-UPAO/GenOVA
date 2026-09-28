"""Los modelos fuera del catálogo curado exigen API key propia.

`enabled_models` la controla el propio usuario (`PUT /me/enabled-models`), así que
si se honra sin más deja elegir cualquier modelo del catálogo completo —incluidos
los caros— pagando con la key de la plataforma. Estos tests fijan la regla: sin
key propia, el usuario se queda con los modelos que fijó el administrador.
"""

import pytest

from llm.catalog.model_catalog import DEFAULTS, sanitize_settings
from users.interface.http.settings_llm_settings_router import _own_model_keys

CARO = {"provider": "openrouter", "model_id": "openai/o1-pro"}


class _User:
    def __init__(self, enabled):
        self.enabled_models = enabled


def _default_texto():
    d = DEFAULTS["texto"]
    return {"provider": d["provider"], "model_id": d["model_id"]}


def test_sin_key_propia_ignora_los_modelos_habilitados_por_el_usuario():
    user = _User([CARO])
    assert _own_model_keys(user, has_key=False) == set()


def test_con_key_propia_respeta_los_modelos_habilitados_por_el_usuario():
    user = _User([CARO])
    assert _own_model_keys(user, has_key=True) == {(CARO["provider"], CARO["model_id"])}


def test_sin_key_propia_no_puede_fijar_un_modelo_fuera_del_catalogo_curado():
    user = _User([CARO])
    ek = _own_model_keys(user, has_key=False)
    with pytest.raises(ValueError, match="Modelo no permitido"):
        sanitize_settings({"texto": CARO}, extra_keys=ek)


def test_con_key_propia_si_puede_fijarlo():
    user = _User([CARO])
    ek = _own_model_keys(user, has_key=True)
    clean = sanitize_settings({"texto": CARO}, extra_keys=ek)
    assert clean["texto"]["model_id"] == CARO["model_id"]


def test_sin_key_propia_el_modelo_del_administrador_sigue_permitido():
    """La restricción no debe dejar al usuario sin poder guardar nada."""
    user = _User([])
    ek = _own_model_keys(user, has_key=False)
    clean = sanitize_settings({"texto": _default_texto()}, extra_keys=ek)
    assert clean["texto"]["model_id"] == DEFAULTS["texto"]["model_id"]


def test_enabled_models_vacio_o_ausente_no_revienta():
    assert _own_model_keys(_User([]), has_key=True) == set()
    assert _own_model_keys(_User(None), has_key=True) == set()


def test_la_vista_del_usuario_recibe_la_configuracion_efectiva_de_la_plataforma(monkeypatch):
    """Sin clave propia se genera con la config del admin, no con la semilla:
    `platform` es lo que la vista de solo lectura debe mostrar."""
    import llm.router
    from users.interface.http.settings_llm_settings_router import _platform_config

    efectiva = {
        "defaults": {"texto": {"provider": "openrouter", "model_id": "admin/elegido", "extra": {}}},
        "fallbacks": {"texto": [{"provider": "openrouter", "model_id": "admin/respaldo", "extra": {}}]},
        "generation_enabled": {"imagen": True},
    }
    monkeypatch.setattr(llm.router, "effective_llm_config", lambda: efectiva)
    assert _platform_config() == efectiva


def test_la_vista_marca_la_eleccion_propia_y_en_el_resto_muestra_la_plataforma():
    from users.interface.http.settings_llm_settings_router import settings_view

    merged = {
        "texto": {"provider": "openrouter", "model_id": "mio/elegido", "timeout_s": 90, "fallbacks": []},
        "codigo": {**DEFAULTS["codigo"], "timeout_s": 120, "fallbacks": []},
    }
    honored = {"texto": {"provider": "openrouter", "model_id": "mio/elegido"}}
    platform = {"codigo": {"provider": "openrouter", "model_id": "admin/codigo"}}
    view = settings_view(merged, honored, platform)
    assert view["texto"]["override"] is True
    assert view["texto"]["model_id"] == "mio/elegido"
    assert view["codigo"]["override"] is False
    assert view["codigo"]["model_id"] == "admin/codigo"


def test_no_se_puede_guardar_un_modelo_de_un_proveedor_sin_clave_propia():
    from users.interface.http.settings_llm_settings_router import _providers_without_own_key

    class _U:
        admin_flag_cached = False
        user_api_keys = {"openrouter": "sk-or-x"}

    clean = {
        "texto": {
            "provider": "openrouter",
            "model_id": "a",
            "fallbacks": [{"provider": "groq", "model_id": "b"}],
        }
    }
    assert _providers_without_own_key(clean, _U()) == ["groq"]
    _U.admin_flag_cached = True
    assert _providers_without_own_key(clean, _U()) == []
