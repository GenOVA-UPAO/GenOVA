"""Imágenes de OpenRouter por chat (Gemini Image, GPT Image) cuando /images no sirve."""

from __future__ import annotations

import pytest

from llm.catalog.catalog_media import merge_media_entries
from llm.images import image_openrouter, media_models
from llm.images.media_models import generates_via_chat


def _entries(monkeypatch, entries):
    monkeypatch.setattr(media_models, "media_entry", lambda p, m: next((e for e in entries if e["model_id"] == m), None))


def test_la_fusion_marca_los_modelos_que_tambien_generan_por_chat():
    chat = {"provider": "openrouter", "model_id": "google/gemini-2.5-flash-image", "modality": "text+image->text+image", "aptitudes": ["texto"]}
    media = {"provider": "openrouter", "model_id": "google/gemini-2.5-flash-image", "modality": "text->image", "aptitudes": ["imagen"], "curated": False, "media": {"kind": "image"}}
    merged = merge_media_entries([chat], [media])
    assert merged[0]["via_chat"] is True


@pytest.mark.parametrize(
    ("entry", "esperado"),
    [
        ({"model_id": "google/gemini-2.5-flash-image", "via_chat": True, "media": {"kind": "image"}}, True),
        ({"model_id": "black-forest-labs/flux.2-klein-4b", "via_chat": False, "media": {"kind": "image"}}, False),
        ({"model_id": "openai/gpt-5-image-mini", "modality": "text+image->text+image"}, True),
        # Catálogo guardado antes de existir `via_chat`: se decide por el id.
        ({"model_id": "google/gemini-3.1-flash-image", "media": {"kind": "image"}}, True),
    ],
)
def test_elige_la_via_de_chat(monkeypatch, entry, esperado):
    _entries(monkeypatch, [{"provider": "openrouter", **entry}])
    assert generates_via_chat("openrouter", entry["model_id"]) is esperado


class _Resp:
    def __init__(self, status, body):
        self.status_code, self._body, self.text = status, body, str(body)

    def json(self):
        return self._body


def test_la_via_de_chat_devuelve_la_imagen(monkeypatch):
    enviado = {}

    def post(url, headers, json, timeout):
        enviado.update(url=url, json=json)
        return _Resp(200, {"choices": [{"message": {"images": [{"image_url": {"url": "data:image/png;base64,AAA"}}]}}]})

    monkeypatch.setattr(image_openrouter.httpx, "post", post)
    monkeypatch.setattr(media_models, "media_entry", lambda p, m: None)
    url = image_openrouter.generate_openrouter_image("café", "sk-or-x", 1024, 768, "google/gemini-2.5-flash-image")
    assert url == "data:image/png;base64,AAA"
    assert enviado["url"].endswith("/chat/completions")
    assert enviado["json"]["modalities"] == ["image", "text"]
    assert enviado["json"]["image_config"] == {"aspect_ratio": "4:3"}


def test_si_el_chat_no_trae_imagen_devuelve_none(monkeypatch):
    monkeypatch.setattr(image_openrouter.httpx, "post", lambda *a, **k: _Resp(200, {"choices": [{"message": {"content": "no"}}]}))
    monkeypatch.setattr(media_models, "media_entry", lambda p, m: None)
    assert image_openrouter.generate_openrouter_image("café", "k", 512, 512, "google/gemini-2.5-flash-image") is None


def test_el_precio_de_los_modelos_por_chat_sale_de_image_output():
    chat = {
        "provider": "openrouter",
        "model_id": "google/gemini-2.5-flash-image",
        "modality": "text+image->text+image",
        "aptitudes": [],
        "pricing_detail": {"input": 0.3, "output": 2.5, "image_output": 30.0},
    }
    media = {
        "provider": "openrouter",
        "model_id": "google/gemini-2.5-flash-image",
        "aptitudes": ["imagen"],
        "curated": False,
        "media": {"kind": "image"},
        "media_pricing": {"unit": "token", "usd": 15e-6, "from": False, "estimate_usd": 0.019},
    }
    row = merge_media_entries([chat], [media])[0]
    assert row["media_pricing"]["estimate_usd"] == pytest.approx(0.0387, abs=1e-4)
    assert row["pricing"] == "$30.00/1M tokens de imagen"
