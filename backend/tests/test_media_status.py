"""Estado real de imagen, video y narración para la pestaña Plataforma (sin red)."""

from __future__ import annotations

import pytest

from llm.images import media_status as ms
from llm.utils import llm_config_store

OR = {"provider": "openrouter", "model_id": "google/veo-3.1-lite"}
GOOGLE = {"provider": "google", "model_id": "veo-3"}
IMG = {"provider": "openrouter", "model_id": "black-forest-labs/flux.2-klein-4b"}


@pytest.fixture(autouse=True)
def _catalogo(monkeypatch):
    labels = {"google/veo-3.1-lite": "Google: Veo 3.1 Lite", "openai/gpt-audio-mini": "OpenAI: GPT Audio Mini"}
    monkeypatch.setattr(
        "llm.images.media_models.media_entry",
        lambda p, m: {"label": labels[m]} if m in labels else None,
    )


def _setup(monkeypatch, stored, keys):
    monkeypatch.setattr(llm_config_store, "stored_cached", lambda: stored)
    monkeypatch.setattr(
        "llm.clients.key_resolver.resolve_key", lambda provider, user_keys, db, user_id=None: keys.get(provider)
    )
    monkeypatch.setattr("llm.clients.clients._get_provider_key", lambda provider: keys.get(provider))


def _stored(video_on=True, video=None, fallbacks=(), imagen=IMG):
    return {
        "generation_enabled": {"video": video_on, "imagen": True},
        "defaults": {k: v for k, v in {"video": video, "imagen": imagen}.items() if v},
        "fallbacks": {"video": list(fallbacks)},
    }


@pytest.mark.parametrize(
    ("stored", "keys", "state"),
    [
        (_stored(video_on=False, video=OR), {"openrouter": "k"}, "off"),
        (_stored(video=None), {"openrouter": "k"}, "no_model"),
        (_stored(video=GOOGLE), {"google": "k"}, "unsupported"),
        (_stored(video=OR), {}, "no_key"),
        # El principal no tiene Video API, pero el respaldo sí y hay clave.
        (_stored(video=GOOGLE, fallbacks=[OR]), {"openrouter": "k", "google": "g"}, "active"),
    ],
)
def test_estado_del_video(monkeypatch, stored, keys, state):
    _setup(monkeypatch, stored, keys)
    video = ms.media_status(db=None)["video"]
    assert video["state"] == state
    assert video["enabled"] is stored["generation_enabled"]["video"]


def test_video_activo_nombra_el_modelo_y_los_respaldos(monkeypatch):
    _setup(monkeypatch, _stored(video=OR, fallbacks=[OR]), {"openrouter": "k"})
    video = ms.media_status(db=None)["video"]
    assert video == {
        "state": "active",
        "enabled": True,
        "provider": "openrouter",
        "model_id": "google/veo-3.1-lite",
        "label": "Google: Veo 3.1 Lite",
        "fallbacks": 1,
        "has_key": True,
    }


def test_imagen_sin_clave(monkeypatch):
    _setup(monkeypatch, _stored(video=None), {})
    imagen = ms.media_status(db=None)["imagen"]
    assert imagen["state"] == "no_key" and imagen["label"] == IMG["model_id"]


def test_narracion_en_espanol_con_openrouter(monkeypatch):
    _setup(monkeypatch, _stored(), {"openrouter": "k", "groq": "g"})
    from llm.podcast.tts_openrouter import _MODEL

    assert ms.media_status(db=None)["audio"] == {
        "state": "active",
        "provider": "openrouter",
        "model_id": _MODEL,
        "label": "OpenAI GPT Audio Mini",
        "language": "es",
    }


def test_narracion_sin_catalogo_usa_un_nombre_legible(monkeypatch):
    _setup(monkeypatch, _stored(), {"openrouter": "k"})
    monkeypatch.setattr("llm.images.media_models.media_entry", lambda p, m: None)
    assert ms.audio_status()["label"] == "OpenAI GPT Audio Mini"


def test_narracion_solo_en_ingles_con_groq(monkeypatch):
    _setup(monkeypatch, _stored(), {"groq": "g"})
    audio = ms.audio_status()
    assert (audio["state"], audio["provider"], audio["label"], audio["language"]) == (
        "english_only",
        "groq",
        "Groq Orpheus",
        "en",
    )


def test_sin_claves_el_podcast_queda_en_texto(monkeypatch):
    _setup(monkeypatch, _stored(), {})
    assert ms.audio_status()["state"] == "off"


def test_la_capacidad_de_narracion_esta_en_la_plataforma():
    from prometheus.config.nodes_catalog import CAPABILITIES

    caps = {c["id"]: c for c in CAPABILITIES}
    assert caps["audio"]["media_task"] == "audio" and caps["audio"]["role"] == "Medios"
    assert "flag" not in caps["audio"] and not caps["audio"].get("configurable")
    assert {caps["images"]["media_task"], caps["video"]["media_task"]} == {"imagen", "video"}
