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
