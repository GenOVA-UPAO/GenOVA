"""OPENROUTER_API_BASE: todo lo de OpenRouter puede ir a un servidor local."""

from __future__ import annotations

import pytest

from core import openrouter
from core.config import settings


@pytest.fixture
def local_base(monkeypatch):
    monkeypatch.setattr(settings, "openrouter_api_base", "http://localhost:8300/api/v1/")


def test_por_defecto_es_openrouter():
    assert openrouter.api_url("images") == "https://openrouter.ai/api/v1/images"
    assert openrouter.origin() == "https://openrouter.ai"


def test_la_base_se_puede_cambiar(local_base):
    assert openrouter.api_url("/videos/abc") == "http://localhost:8300/api/v1/videos/abc"
    assert openrouter.origin() == "http://localhost:8300"


def test_la_clave_solo_va_al_host_de_la_api(local_base):
    assert openrouter.is_api_url("http://localhost:8300/api/v1/videos/x/content")
    assert openrouter.is_api_url("https://openrouter.ai/api/v1/videos/x")
    assert not openrouter.is_api_url("http://openrouter.ai/api/v1/videos/x")
    assert not openrouter.is_api_url("https://openrouter.ai.evil.com/api/v1/videos/x")
    assert not openrouter.is_api_url("http://cdn.example.com/video.mp4")


def test_http_solo_para_una_api_local(monkeypatch):
    monkeypatch.setattr(settings, "openrouter_api_base", "http://proxy.interno/api/v1")
    assert not openrouter.is_api_url("http://proxy.interno/api/v1/videos/x")
