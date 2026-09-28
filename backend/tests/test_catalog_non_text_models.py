"""Modelos que no escriben texto fuera de las tareas de texto.

En la interfaz aparecían Orpheus (voz) y Llama Prompt Guard (clasificador) de
Groq como modelos de texto «Gratis, 128k», y Nano Banana (genera imágenes) en el
selector de Código y en «Recomendados», con precio por imagen. Estos tests fijan
la categorización a partir de los datos del catálogo (modalidades de entrada y
salida, presencia en el listado de imágenes) y, como último recurso, del id.
"""

from types import SimpleNamespace

import pytest

from llm.catalog import catalog_cache, catalog_gather, provider_listing
from llm.catalog.catalog_aptitudes import parse_modality
from llm.catalog.catalog_builder import _build_full_catalog, groq_modality
from llm.catalog.catalog_categorize import categorize_model
from llm.catalog.catalog_media import merge_media_entries
from llm.catalog.catalog_refresh_providers import _load_cached
from users.domain.llm_settings import add_own_provider_pools

# Lo que devuelve hoy GET https://api.groq.com/openai/v1/models (recortado).
GROQ_META = {
    "canopylabs/orpheus-v1-english": {
        "name": "Canopy Labs Orpheus V1 English",
        "input_modalities": ["text"],
        "output_modalities": ["speech"],
        "context_length": 4000,
    },
    "whisper-large-v3": {
        "name": "Whisper",
        "input_modalities": ["audio"],
        "output_modalities": ["transcription"],
        "context_length": 448,
    },
    "meta-llama/llama-prompt-guard-2-86m": {
        "name": "Prompt Guard 2 86M",
        "input_modalities": ["text"],
        "output_modalities": ["text"],
        "context_length": 512,
    },
    "openai/gpt-oss-120b": {
        "name": "GPT OSS 120B",
        "input_modalities": ["text"],
        "output_modalities": ["text"],
        "context_length": 131072,
    },
    "qwen/qwen3.8-27b": {
        "name": "Qwen/Qwen3.8-27B",
        "input_modalities": ["text", "image"],
        "output_modalities": ["text"],
        "context_length": 131072,
    },
}

_TEXT = {"texto", "codigo", "orquestador", "razonamiento"}


def _rows(**kwargs):
    return {e["model_id"]: e for e in _build_full_catalog(**kwargs)}


@pytest.mark.parametrize(
    ("modality", "expected"),
    [
        ("text->speech", "audio"),  # Orpheus (TTS de Groq)
        ("audio->transcription", "audio"),  # Whisper
        ("text+audio->text+audio", "audio"),  # GPT Audio: su salida principal es voz
        ("text+image->text+audio", "audio"),  # Lyria: música
        ("audio->text", "audio"),  # transcripción que no lee texto
        ("text+image+file+audio+video->text+image", "multimodal"),  # Auto Router
        ("text+image+audio->text", "multimodal"),
        ("text->text", "text"),
    ],
)
def test_la_salida_principal_decide_la_modalidad(modality, expected):
    assert parse_modality({"architecture": {"modality": modality}}) == expected


@pytest.mark.parametrize(
    "model_id",
    [
        "meta-llama/llama-prompt-guard-2-22m",
        "meta-llama/llama-guard-4-12b",
        "openai/gpt-oss-safeguard-20b",
        "ibm-granite/granite-guardian-3.3-8b",
    ],
)
def test_los_clasificadores_de_seguridad_son_de_moderacion(model_id):
    entry = {"id": model_id, "architecture": {"modality": "text+image->text"}}
    assert categorize_model(entry) == "moderacion"


def test_guard_solo_cuenta_como_segmento_del_id():
    # «vanguard» no es un clasificador.
    assert categorize_model({"id": "acme/vanguard-7b", "architecture": {"modality": "text->text"}}) == "texto"


def test_groq_con_sus_datos_separa_voz_transcripcion_y_clasificadores():
    rows = _rows(or_data={}, groq_ids=GROQ_META)

    assert rows["canopylabs/orpheus-v1-english"]["aptitudes"] == ["audio"]
    assert rows["canopylabs/orpheus-v1-english"]["context_length"] == 4000
    assert rows["whisper-large-v3"]["aptitudes"] == ["audio"]
    assert rows["meta-llama/llama-prompt-guard-2-86m"]["aptitudes"] == ["moderacion"]
    assert _TEXT & set(rows["openai/gpt-oss-120b"]["aptitudes"])
    # Visión: lee imágenes y escribe texto; sirve para texto, no para generar imágenes.
    qwen = rows["qwen/qwen3.8-27b"]
    assert qwen["modality"] == "text+image->text" and "imagen" not in qwen["aptitudes"]
    assert "texto" in qwen["aptitudes"]
    # Nombre del proveedor, no el id.
    assert rows["whisper-large-v3"]["label"] == "Whisper"


def test_groq_sin_datos_sigue_como_antes():
    rows = _rows(or_data={}, groq_ids={"llama-3.3-70b-versatile"})
    row = rows["llama-3.3-70b-versatile"]
    assert row["modality"] == "text" and row["context_length"] == 128000
    assert "texto" in row["aptitudes"]


def test_groq_modality():
    assert groq_modality(None) == "text"
    assert groq_modality({"input_modalities": ["audio"], "output_modalities": ["transcription"]}) == (
        "audio->transcription"
    )


def test_un_modelo_del_listado_de_imagenes_no_sirve_para_texto():
    """Nano Banana: su fila de chat («text+image->text+image») es de texto, pero
    estar en el listado de imágenes dice que su salida principal es la imagen."""
    chat = {
        "provider": "openrouter",
        "model_id": "google/gemini-2.5-flash-image",
        "modality": "text+image->text+image",
        "aptitudes": ["texto"],
        "curated": False,
    }
    media = {
        "provider": "openrouter",
        "model_id": "google/gemini-2.5-flash-image",
        "modality": "text->image",
        "category": "imagen",
        "aptitudes": ["imagen"],
        "curated": True,
        "media": {"kind": "image"},
    }
    fused = merge_media_entries([chat], [media])[0]
    assert fused["aptitudes"] == ["imagen"]
    assert fused["via_chat"] is True  # la tarea Imagen lo sigue usando por chat


def test_el_auto_router_sigue_siendo_de_texto():
    or_data = {
        "openrouter/auto": {
            "id": "openrouter/auto",
            "name": "Auto Router",
            "architecture": {"modality": "text+image+file+audio+video->text+image"},
        }
    }
    row = _rows(or_data=or_data, groq_ids=set())["openrouter/auto"]
    assert "texto" in row["aptitudes"]


def test_los_pools_propios_no_ofrecen_modelos_que_no_escriben():
    full = [
        {"provider": "groq", "model_id": "voz", "aptitudes": ["audio"], "active": True},
        {"provider": "groq", "model_id": "guard", "aptitudes": ["moderacion"], "active": True},
        {"provider": "groq", "model_id": "llm", "aptitudes": ["texto"], "active": True},
        {"provider": "groq", "model_id": "inactivo", "aptitudes": ["texto"], "active": False},
    ]
    pools = add_own_provider_pools({}, full, {"groq"}, set())
    assert [e["model_id"] for e in pools["groq"]] == ["llm"]


def test_list_groq_ids_guarda_nombre_modalidades_y_contexto(monkeypatch):
    class _Model(SimpleNamespace):
        def model_dump(self):
            return dict(vars(self))

    data = [
        _Model(id="canopylabs/orpheus-v1-english", object="model", owned_by="Canopy Labs",
               **GROQ_META["canopylabs/orpheus-v1-english"]),
        _Model(id="", object="model"),
    ]

    class _Groq:
        def __init__(self, **_kwargs):
            self.models = SimpleNamespace(list=lambda: SimpleNamespace(data=data))

    import groq

    monkeypatch.setattr(groq, "Groq", _Groq)
    listed = provider_listing.list_groq_ids("gsk_x")
    assert listed == {"canopylabs/orpheus-v1-english": GROQ_META["canopylabs/orpheus-v1-english"]}


def test_la_cache_de_groq_conserva_los_datos(monkeypatch):
    saved: dict = {}
    monkeypatch.setattr(catalog_cache, "save_to_cache", lambda _db, p, raw: saved.update({p: raw}))
    sources = dict.fromkeys(("openrouter", "opencode", "huggingface"))
    sources["groq"] = "api"
    data = {"or_data": {}, "groq_ids": GROQ_META, "opencode_ids": None, "hf_ids": None}
    catalog_gather._persist_api_cache(object(), sources, data)
    assert saved["groq"]["meta"] == GROQ_META

    monkeypatch.setattr(catalog_cache, "load_from_cache", lambda _db, _p: saved["groq"])
    assert _load_cached(object(), "groq") == GROQ_META
    # Una caché de antes (solo ids) sigue valiendo.
    monkeypatch.setattr(catalog_cache, "load_from_cache", lambda _db, _p: {"models": ["a", "b"]})
    assert _load_cached(object(), "groq") == {"a", "b"}
