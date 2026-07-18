"""OpenRouter image provider + catalog wiring."""

from __future__ import annotations

import json

import llm.images.image_openrouter as or_img
from llm.images.image_providers import IMAGE_PROVIDERS, get_image_data_uri


class _Resp:
    def __init__(self, status=200, json_data=None):
        self.status_code = status
        self._json = json_data or {}
        self.content = json.dumps(self._json).encode()
        self.headers = {"content-type": "application/json"}

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    def json(self):
        return self._json


def test_openrouter_in_image_providers():
    assert "openrouter" in IMAGE_PROVIDERS


def test_openrouter_returns_data_uri(monkeypatch):
    monkeypatch.setattr(
        or_img.httpx,
        "post",
        lambda *a, **k: _Resp(
            json_data={
                "data": [{"b64_json": "YWJj", "media_type": "image/jpeg"}],
            }
        ),
    )
    uri = or_img.generate_openrouter_image(
        "a cat", "sk-or-test", 512, 512, model="openai/gpt-image-1-mini"
    )
    assert uri == "data:image/jpeg;base64,YWJj"


def test_get_image_data_uri_routes_openrouter(monkeypatch):
    monkeypatch.setattr(
        or_img,
        "generate_openrouter_image",
        lambda *a, **k: "data:image/jpeg;base64,QQ==",
    )
    # get_image_data_uri imports via _openrouter → generate_openrouter_image
    import llm.images.image_providers as providers

    monkeypatch.setattr(
        providers,
        "_openrouter",
        lambda *a, **k: "data:image/jpeg;base64,QQ==",
    )
    assert get_image_data_uri("x", "openrouter", "sk", model="openai/gpt-image-1-mini") == (
        "data:image/jpeg;base64,QQ=="
    )


def test_openrouter_402_returns_none(monkeypatch):
    monkeypatch.setattr(or_img.httpx, "post", lambda *a, **k: _Resp(status=402, json_data={}))
    assert or_img.generate_openrouter_image("x", "sk", 512, 512) is None
