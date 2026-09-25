"""Catálogo por usuario: la lista de un proveedor se pide con la clave propia.

Un docente con su clave de Groq veía un solo modelo en el selector si la
plataforma no tenía clave de Groq: el catálogo solo se pedía con la clave de
plataforma. Estos tests fijan la caché por usuario y proveedor, el aislamiento
entre usuarios y con la plataforma, el estado ante una clave inválida y la
invalidación al cambiar la clave.
"""

import httpx
import pytest
from structlog.testing import capture_logs

from llm.catalog import provider_listing, user_catalog
from llm.catalog.provider_listing import ProviderListingError, classify_error
from llm.catalog.user_catalog import (
    get_provider_listing,
    invalidate_user_catalog,
    load_user_catalog,
)

GROQ_KEY_A = "gsk_usuario_a_1234567890"
GROQ_KEY_B = "gsk_usuario_b_0987654321"

PLATFORM_FULL = [
    {"provider": "openrouter", "model_id": "x/modelo", "label": "X", "active": True, "curated": False},
    {"provider": "groq", "model_id": "plataforma-groq", "label": "P", "active": True, "curated": False},
]


class _Lister:
    """Sustituye a la API del proveedor: cuenta llamadas y responde por clave."""

    def __init__(self, by_key=None, error=None):
        self.calls: list[tuple[str, str]] = []
        self.by_key = by_key or {}
        self.error = error

    def __call__(self, provider, api_key):
        self.calls.append((provider, api_key))
        if self.error is not None:
            raise self.error
        if provider == "openrouter":
            return None
        return set(self.by_key.get(api_key, {"llama-3.3-70b-versatile"}))


@pytest.fixture(autouse=True)
def _clean_cache():
    user_catalog.clear_user_catalog_cache()
    yield
    user_catalog.clear_user_catalog_cache()


@pytest.fixture
def lister(monkeypatch):
    fake = _Lister(
        by_key={
            GROQ_KEY_A: {"llama-3.3-70b-versatile", "solo-de-a"},
            GROQ_KEY_B: {"solo-de-b"},
        }
    )
    monkeypatch.setattr(user_catalog, "list_models_with_key", fake)
    return fake


def _ids(entries, provider):
    return {e["model_id"] for e in entries if e["provider"] == provider}


def _active_ids(entries, provider):
    """Los que se pueden elegir: con la clave rechazada quedan filas inactivas
    de la plataforma, solo para nombrar los modelos que ya se usan."""
    return {e["model_id"] for e in entries if e["provider"] == provider and e.get("active", True)}


# ── Caché ──────────────────────────────────────────────────────────────────────


def test_la_lista_se_pide_una_vez_y_luego_sale_de_cache(lister):
    load_user_catalog("u1", {"groq": GROQ_KEY_A})
    load_user_catalog("u1", {"groq": GROQ_KEY_A})
    assert lister.calls == [("groq", GROQ_KEY_A)]


def test_caducada_la_entrada_se_vuelve_a_pedir(lister, monkeypatch):
    monkeypatch.setattr(user_catalog, "USER_CATALOG_TTL_S", 0.0)
    load_user_catalog("u1", {"groq": GROQ_KEY_A})
    load_user_catalog("u1", {"groq": GROQ_KEY_A})
    assert len(lister.calls) == 2


def test_cambiar_de_clave_no_reutiliza_la_lista_de_la_anterior(lister):
    first = load_user_catalog("u1", {"groq": GROQ_KEY_A}).merge_full(PLATFORM_FULL)
    second = load_user_catalog("u1", {"groq": GROQ_KEY_B}).merge_full(PLATFORM_FULL)
    assert "solo-de-a" in _ids(first, "groq")
    assert _ids(second, "groq") == {"solo-de-b"}
    assert len(lister.calls) == 2


def test_invalidar_obliga_a_pedirla_otra_vez_solo_para_ese_usuario(lister):
    load_user_catalog("u1", {"groq": GROQ_KEY_A})
    load_user_catalog("u2", {"groq": GROQ_KEY_B})
    invalidate_user_catalog("u1", {"groq"})
    load_user_catalog("u1", {"groq": GROQ_KEY_A})
    load_user_catalog("u2", {"groq": GROQ_KEY_B})
    assert lister.calls.count(("groq", GROQ_KEY_A)) == 2
    assert lister.calls.count(("groq", GROQ_KEY_B)) == 1


def test_force_salta_la_cache(lister):
    load_user_catalog("u1", {"groq": GROQ_KEY_A})
    load_user_catalog("u1", {"groq": GROQ_KEY_A}, force=True)
    assert len(lister.calls) == 2


# ── Aislamiento ────────────────────────────────────────────────────────────────


def test_cada_usuario_ve_su_lista_y_la_de_plataforma_no_cambia(lister):
    platform_before = [dict(e) for e in PLATFORM_FULL]
    a = load_user_catalog("u1", {"groq": GROQ_KEY_A}).merge_full(PLATFORM_FULL)
    b = load_user_catalog("u2", {"groq": GROQ_KEY_B}).merge_full(PLATFORM_FULL)

    assert _ids(a, "groq") == {"llama-3.3-70b-versatile", "solo-de-a"}
    assert _ids(b, "groq") == {"solo-de-b"}
    # La lista de plataforma de Groq no se mezcla con la del usuario...
    assert "plataforma-groq" not in _ids(a, "groq")
    # ...ni se modifica: la lista original sigue intacta.
    assert platform_before == PLATFORM_FULL
    # Los proveedores sin clave propia siguen con la lista de plataforma.
    assert _ids(a, "openrouter") == {"x/modelo"}


def test_sin_claves_propias_el_catalogo_es_el_de_plataforma(lister):
    uc = load_user_catalog("u1", {"groq": "   ", "runware": "rw_imagen_123"})
    assert uc.merge_full(PLATFORM_FULL) is PLATFORM_FULL
    assert lister.calls == []
    assert all(s["state"] == "not_connected" for s in uc.status(PLATFORM_FULL).values())


def test_no_escribe_en_la_cache_de_plataforma(lister, monkeypatch):
    from llm.catalog import catalog_cache

    def boom(*_a, **_k):
        raise AssertionError("el catálogo por usuario no debe tocar catalog_cache")

    monkeypatch.setattr(catalog_cache, "save_to_cache", boom)
    load_user_catalog("u1", {"groq": GROQ_KEY_A}).merge_full(PLATFORM_FULL)


def test_curados_activos_segun_la_lista_del_usuario(lister):
    curated = [
        {"provider": "groq", "model_id": "llama-3.3-70b-versatile", "active": False},
        {"provider": "groq", "model_id": "no-esta", "active": True},
        {"provider": "openrouter", "model_id": "x/modelo", "active": True},
    ]
    adjusted = load_user_catalog("u1", {"groq": GROQ_KEY_A}).adjust_curated(curated)
    assert [e["active"] for e in adjusted] == [True, False, True]
    # Copias: el catálogo curado global no cambia.
    assert curated[0]["active"] is False


# ── Estado y errores ───────────────────────────────────────────────────────────


def _http_error(status: int) -> httpx.HTTPStatusError:
    request = httpx.Request("GET", "https://api.example/models")
    return httpx.HTTPStatusError("x", request=request, response=httpx.Response(status, request=request))


def test_clave_invalida_da_error_con_motivo_y_ningun_modelo(monkeypatch):
    monkeypatch.setattr(user_catalog, "list_models_with_key", _Lister(error=_http_error(401)))
    uc = load_user_catalog("u1", {"groq": GROQ_KEY_A})
    merged = uc.merge_full(PLATFORM_FULL)

    assert _active_ids(merged, "groq") == set()
    status = uc.status(merged)
    assert status["groq"]["state"] == "error"
    assert status["groq"]["error"] == "invalid_key"
    assert status["groq"]["models"] == 0
    assert status["opencode"]["state"] == "not_connected"
    assert uc.model_keys(merged) == set()


def test_fallo_pasajero_conserva_la_ultima_lista_buena(monkeypatch):
    ok = _Lister(by_key={GROQ_KEY_A: {"llama-3.3-70b-versatile"}})
    monkeypatch.setattr(user_catalog, "list_models_with_key", ok)
    load_user_catalog("u1", {"groq": GROQ_KEY_A})

    monkeypatch.setattr(user_catalog, "list_models_with_key", _Lister(error=_http_error(503)))
    uc = load_user_catalog("u1", {"groq": GROQ_KEY_A}, force=True)
    merged = uc.merge_full(PLATFORM_FULL)

    assert uc.status(merged)["groq"]["error"] == "unreachable"
    assert _ids(merged, "groq") == {"llama-3.3-70b-versatile"}
    assert uc.unverified_providers() == set()


def test_fallo_pasajero_sin_lista_previa_deja_el_proveedor_sin_verificar(monkeypatch):
    monkeypatch.setattr(user_catalog, "list_models_with_key", _Lister(error=httpx.ConnectError("x")))
    uc = load_user_catalog("u1", {"groq": GROQ_KEY_A})
    assert uc.unverified_providers() == {"groq"}


def test_un_error_se_cachea_menos_que_una_lista_buena(monkeypatch):
    failing = _Lister(error=_http_error(503))
    monkeypatch.setattr(user_catalog, "list_models_with_key", failing)
    monkeypatch.setattr(user_catalog, "_TRANSIENT_ERROR_TTL_S", 0.0)
    load_user_catalog("u1", {"groq": GROQ_KEY_A})
    load_user_catalog("u1", {"groq": GROQ_KEY_A})
    assert len(failing.calls) == 2


def test_openrouter_usa_la_lista_publica_y_con_clave_invalida_ninguna(monkeypatch):
    monkeypatch.setattr(user_catalog, "list_models_with_key", _Lister())
    uc = load_user_catalog("u1", {"openrouter": "sk-or-v1-abcdef123456"})
    merged = uc.merge_full(PLATFORM_FULL)
    assert _ids(merged, "openrouter") == {"x/modelo"}
    assert uc.status(merged)["openrouter"] == {
        "state": "connected",
        "error": None,
        "checked_at": uc.listings["openrouter"].checked_at,
        "models": 1,
    }

    user_catalog.clear_user_catalog_cache()
    monkeypatch.setattr(user_catalog, "list_models_with_key", _Lister(error=_http_error(401)))
    uc = load_user_catalog("u1", {"openrouter": "sk-or-v1-abcdef123456"})
    merged = uc.merge_full(PLATFORM_FULL)
    assert _active_ids(merged, "openrouter") == set()
    assert uc.status(merged)["openrouter"]["models"] == 0


@pytest.mark.parametrize(
    ("exc", "code"),
    [
        (_http_error(401), "invalid_key"),
        (_http_error(403), "invalid_key"),
        (_http_error(429), "rate_limited"),
        (_http_error(502), "unreachable"),
        (httpx.ReadTimeout("x"), "unreachable"),
        (ProviderListingError(401), "invalid_key"),
        (ValueError("x"), "error"),
    ],
)
def test_clasificacion_de_errores(exc, code):
    assert classify_error(exc) == code


def test_la_clave_no_aparece_en_logs_ni_en_el_estado(monkeypatch):
    secreto = "gsk_SECRETO_no_debe_salir_987"
    # El mensaje de la excepción lleva la clave, como hacen algunos SDK.
    error = ProviderListingError(401)
    error.args = (f"Incorrect API key provided: {secreto}",)
    monkeypatch.setattr(user_catalog, "list_models_with_key", _Lister(error=error))
    with capture_logs() as logs:
        uc = load_user_catalog("u1", {"groq": secreto})
    assert secreto not in repr(logs)
    assert secreto not in repr(uc.status(PLATFORM_FULL))
    assert secreto not in repr(user_catalog._cache)


# ── Modo LLM_FAKE ──────────────────────────────────────────────────────────────


def test_llm_fake_con_clave_fake_devuelve_una_lista_fija(monkeypatch):
    from core.config import settings

    monkeypatch.setattr(settings, "llm_fake", True)
    listing = get_provider_listing("u1", "groq", "fake-groq-usuario")
    assert listing.state == "connected"
    assert "llama-3.3-70b-versatile" in listing.ids
    assert get_provider_listing("u1", "groq", "fake-groq-usuario").ids == listing.ids

    bad = get_provider_listing("u1", "opencode", "fake-invalid-clave")
    assert (bad.state, bad.error) == ("error", "invalid_key")


def test_sin_llm_fake_una_clave_fake_va_a_la_api_real(monkeypatch):
    from core.config import settings

    monkeypatch.setattr(settings, "llm_fake", False)
    called = []
    monkeypatch.setattr(provider_listing, "list_groq_ids", lambda key: called.append(key) or {"m"})
    assert provider_listing.list_models_with_key("groq", "fake-groq-usuario") == {"m"}
    assert called == ["fake-groq-usuario"]


def test_los_modelos_curados_de_su_lista_llevan_su_nombre(lister):
    merged = load_user_catalog("u1", {"groq": GROQ_KEY_A}).merge_full(PLATFORM_FULL)
    labels = {e["model_id"]: e["label"] for e in merged if e["provider"] == "groq"}
    assert labels["llama-3.3-70b-versatile"] == "Llama 3.3 70B (Groq)"
    assert labels["solo-de-a"] == "solo-de-a"


# ── Nombres del catálogo de plataforma ─────────────────────────────────────────

PLATFORM_NAMED = [
    {
        "provider": "openrouter",
        "model_id": "deepseek/deepseek-v4.1-flash",
        "label": "DeepSeek: DeepSeek V4.1 Flash",
        "pricing": "$0.10/$0.40 por 1M tokens",
        "aptitudes": ["texto", "orquestador", "razonamiento"],
        "active": True,
        "curated": True,
    },
    {
        "provider": "groq",
        "model_id": "openai/gpt-oss-120b",
        "label": "GPT OSS 120B",
        "category": "razonamiento",
        "aptitudes": ["razonamiento", "texto"],
        "active": True,
        "curated": False,
    },
]


def test_clave_rechazada_conserva_nombres_y_precios_de_la_plataforma(monkeypatch):
    """Con la clave de OpenRouter rechazada la UI mostraba ids en todas partes
    (también en la configuración de plataforma): el catálogo quedaba en ~12
    modelos y sin los de OpenRouter no había de dónde sacar el nombre."""
    monkeypatch.setattr(user_catalog, "list_models_with_key", _Lister(error=_http_error(401)))
    uc = load_user_catalog("u1", {"openrouter": "sk-or-v1-abcdef123456"})
    merged = uc.merge_full(PLATFORM_NAMED)

    row = next(e for e in merged if e["model_id"] == "deepseek/deepseek-v4.1-flash")
    assert row["label"] == "DeepSeek: DeepSeek V4.1 Flash"
    assert row["pricing"] == "$0.10/$0.40 por 1M tokens"
    # No se puede elegir: se pagaría con la clave rechazada.
    assert row["active"] is False
    assert uc.model_keys(merged) == set()
    assert uc.status(merged)["openrouter"]["models"] == 0
    # El catálogo de plataforma no se toca.
    assert PLATFORM_NAMED[0]["active"] is True


def test_proveedor_sin_respuesta_ni_lista_previa_conserva_los_nombres(monkeypatch):
    monkeypatch.setattr(user_catalog, "list_models_with_key", _Lister(error=httpx.ConnectError("x")))
    uc = load_user_catalog("u1", {"groq": GROQ_KEY_A})
    merged = uc.merge_full(PLATFORM_NAMED)
    row = next(e for e in merged if e["model_id"] == "openai/gpt-oss-120b")
    assert (row["label"], row["active"]) == ("GPT OSS 120B", False)


def test_la_lista_propia_toma_nombre_y_aptitudes_de_la_plataforma(monkeypatch):
    lister = _Lister(by_key={GROQ_KEY_A: {"openai/gpt-oss-120b", "solo-del-usuario"}})
    monkeypatch.setattr(user_catalog, "list_models_with_key", lister)
    uc = load_user_catalog("u1", {"groq": GROQ_KEY_A})
    merged = uc.merge_full(PLATFORM_NAMED)

    known = next(e for e in merged if e["model_id"] == "openai/gpt-oss-120b")
    assert known["label"] == "GPT OSS 120B"
    assert known["category"] == "razonamiento" and known["active"] is True
    only_user = next(e for e in merged if e["model_id"] == "solo-del-usuario")
    assert only_user["label"] == "solo-del-usuario" and only_user["active"] is True
    assert uc.status(merged)["groq"]["models"] == 2


def test_la_lista_propia_de_groq_usa_sus_modalidades(monkeypatch):
    """Groq declara modalidades por modelo: la voz (Orpheus) no se ofrece como
    modelo de texto aunque la plataforma no tenga clave de Groq."""

    def lister(provider, api_key):
        return {
            "canopylabs/orpheus-v1-english": {
                "name": "Canopy Labs Orpheus V1 English",
                "input_modalities": ["text"],
                "output_modalities": ["speech"],
                "context_length": 4000,
            },
        }

    monkeypatch.setattr(user_catalog, "list_models_with_key", lister)
    uc = load_user_catalog("u1", {"groq": GROQ_KEY_A})
    row = next(e for e in uc.merge_full([]) if e["provider"] == "groq")
    assert row["label"] == "Canopy Labs Orpheus V1 English"
    assert row["category"] == "audio" and row["aptitudes"] == ["audio"]
    assert row["context_length"] == 4000
