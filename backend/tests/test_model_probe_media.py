"""«Probar» con modelos de imagen y video."""

from __future__ import annotations

import pytest

from llm.images import image_openrouter
from llm.images.image_openrouter import ImageRequestError
from llm.utils import model_probe


@pytest.fixture(autouse=True)
def _sin_fake(monkeypatch):
    monkeypatch.setattr(model_probe.settings, "llm_fake", False)


def _kind(monkeypatch, kind):
    monkeypatch.setattr(model_probe, "_media_kind", lambda p, m: kind)


def test_imagen_genera_una_miniatura(monkeypatch):
    _kind(monkeypatch, "image")
    monkeypatch.setattr(image_openrouter, "request_openrouter_image", lambda *a, **k: "data:image/png;base64,AAA")
    r = model_probe.probe_model("openrouter", "google/gemini-2.5-flash-image", "k", key_source="platform")
    assert r["ok"] and r["image"] == "data:image/png;base64,AAA"


def test_imagen_sin_credito(monkeypatch):
    _kind(monkeypatch, "image")

    def sin_credito(*a, **k):
        raise ImageRequestError(402, "Insufficient credits")

    monkeypatch.setattr(image_openrouter, "request_openrouter_image", sin_credito)
    r = model_probe.probe_model("openrouter", "black-forest-labs/flux.2-klein-4b", "k", key_source="platform")
    assert r["code"] == model_probe.NO_CREDIT


def test_imagen_sin_respuesta_a_tiempo(monkeypatch):
    _kind(monkeypatch, "image")

    def lenta(*a, **k):
        raise ImageRequestError(None, "timeout", timed_out=True)

    monkeypatch.setattr(image_openrouter, "request_openrouter_image", lenta)
    r = model_probe.probe_model("openrouter", "x/y", "k", key_source="platform")
    assert r["code"] == model_probe.TIMEOUT


def test_video_no_se_prueba(monkeypatch):
    _kind(monkeypatch, "video")
    r = model_probe.probe_model("openrouter", "alibaba/wan-3.0", "k", key_source="platform")
    assert r["code"] == model_probe.NOT_TESTABLE and not r["ok"]
