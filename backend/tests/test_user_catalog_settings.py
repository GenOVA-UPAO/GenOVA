"""Ajustes LLM con catálogo propio: los selectores ofrecen los modelos de los
proveedores con clave del usuario y el PUT acepta los de su lista, aunque la
plataforma no tenga clave para ese proveedor."""

import pytest

from llm.catalog import user_catalog
from llm.catalog.model_catalog import DEFAULTS, sanitize_settings
from llm.catalog.user_catalog import load_user_catalog
from users.domain.llm_settings import add_own_provider_pools
from users.interface.http import settings_enabled_models_router as enabled_router
from users.interface.http.settings_llm_settings_router import (
    _choosable_catalog,
    _own_catalog_keys,
    _user_catalog,
)

PLATFORM_FULL = [
    {"provider": "openrouter", "model_id": "x/modelo", "active": True, "curated": False},
]
GROQ_IDS = {"llama-3.3-70b-versatile", "moonshotai/kimi-k2-instruct"}


class _User:
    def __init__(self, keys=None, settings=None, *, admin=False, uid="u-docente"):
        self.id = uid
        self.user_api_keys = keys or {}
        self.llm_settings = settings or {}
        self.enabled_models = []
        self.admin_flag_cached = admin


@pytest.fixture(autouse=True)
def groq_lister(monkeypatch):
    user_catalog.clear_user_catalog_cache()
    calls = []

    def lister(provider, api_key):
        calls.append(provider)
        return None if provider == "openrouter" else set(GROQ_IDS)

    monkeypatch.setattr(user_catalog, "list_models_with_key", lister)
    yield calls
    user_catalog.clear_user_catalog_cache()


def test_con_clave_de_groq_el_selector_ofrece_sus_modelos():
    uc = load_user_catalog("u1", {"groq": "gsk_docente_123456"})
    merged = uc.merge_full(PLATFORM_FULL)
    catalog = _choosable_catalog(uc, merged, [], set())
    assert {m["model_id"] for m in catalog["groq"]} == GROQ_IDS


def test_si_activo_modelos_de_ese_proveedor_solo_salen_esos():
    uc = load_user_catalog("u1", {"groq": "gsk_docente_123456"})
    merged = uc.merge_full(PLATFORM_FULL)
    enabled = {("groq", "moonshotai/kimi-k2-instruct")}
    catalog = _choosable_catalog(uc, merged, [], enabled)
    assert [m["model_id"] for m in catalog["groq"]] == ["moonshotai/kimi-k2-instruct"]


def test_los_modelos_base_activados_no_cuentan_como_eleccion():
    """Guardar favoritos añade siempre los modelos base: eso no debe vaciar la
    lista de OpenRouter de quien tiene su clave."""
    full = [
        {"provider": "openrouter", "model_id": "a", "active": True},
        {"provider": "openrouter", "model_id": "b", "active": True},
    ]
    pools = add_own_provider_pools({}, full, {"openrouter"}, set())
    assert {m["model_id"] for m in pools["openrouter"]} == {"a", "b"}


def test_el_put_acepta_un_modelo_de_su_lista_de_groq():
    user = _User({"groq": "gsk_docente_123456"})
    uc = _user_catalog(user)
    keys = _own_catalog_keys(user, uc, uc.merge_full(PLATFORM_FULL))
    elegido = {"provider": "groq", "model_id": "moonshotai/kimi-k2-instruct"}
    clean = sanitize_settings({"texto": elegido}, extra_keys=keys)
    assert clean["texto"]["model_id"] == "moonshotai/kimi-k2-instruct"


def test_el_put_rechaza_un_modelo_que_no_esta_en_su_lista():
    user = _User({"groq": "gsk_docente_123456"})
    uc = _user_catalog(user)
    keys = _own_catalog_keys(user, uc, uc.merge_full(PLATFORM_FULL))
    with pytest.raises(ValueError, match="Modelo no permitido"):
        sanitize_settings({"texto": {"provider": "groq", "model_id": "inventado"}}, extra_keys=keys)


def test_si_no_se_pudo_comprobar_su_lista_lo_guardado_sigue_valiendo(monkeypatch):
    def down(_provider, _key):
        import httpx

        raise httpx.ConnectError("sin red")

    monkeypatch.setattr(user_catalog, "list_models_with_key", down)
    saved = {"texto": {"provider": "groq", "model_id": "guardado-antes", "fallbacks": []}}
    user = _User({"groq": "gsk_docente_123456"}, saved)
    uc = _user_catalog(user)
    keys = _own_catalog_keys(user, uc, uc.merge_full(PLATFORM_FULL))
    assert ("groq", "guardado-antes") in keys


def test_el_admin_no_usa_catalogo_propio(groq_lister):
    admin = _User({"groq": "gsk_admin_123456789"}, admin=True)
    uc = _user_catalog(admin)
    assert uc.listings == {}
    assert groq_lister == []


def test_puede_activar_en_el_catalogo_un_modelo_de_su_lista(monkeypatch):
    monkeypatch.setattr(enabled_router, "get_full_catalog_entries", lambda: PLATFORM_FULL)
    user = _User({"groq": "gsk_docente_123456"})
    clean = enabled_router._validate_enabled_models(
        [{"provider": "groq", "model_id": "moonshotai/kimi-k2-instruct"}], user
    )
    assert {"provider": "groq", "model_id": "moonshotai/kimi-k2-instruct"} in clean
    # Sin su clave, ese modelo no existe para la plataforma.
    with pytest.raises(ValueError, match="Modelo no reconocido"):
        enabled_router._validate_enabled_models(
            [{"provider": "groq", "model_id": "moonshotai/kimi-k2-instruct"}], _User()
        )


def test_los_defaults_siguen_en_el_suelo_del_selector():
    uc = load_user_catalog("u1", {})
    catalog = _choosable_catalog(uc, PLATFORM_FULL, [], set())
    for d in DEFAULTS.values():
        assert d["model_id"] in {m["model_id"] for m in catalog[d["provider"]]}
