"""Cobertura del pipeline moderno `generate_resource`.

Verifica generación por plantillas (ova_engine), podcast (engage:3) y modo LLM_FAKE.
"""

import prometheus.plans.generate as gen
from core.config import settings


def test_template_generation_returns_html_and_json(monkeypatch):
    monkeypatch.setattr(settings, "llm_fake", True)
    r = gen.generate_resource("evaluate", 1, "Tema de prueba")
    assert r.html
    assert 'id="ova-base"' in r.html or "<!DOCTYPE html>" in r.html
    assert r.raw_json is not None
    assert r.defects == []


def test_podcast_returns_player_and_monologue(monkeypatch):
    monkeypatch.setattr("llm.router.generar_texto", lambda *a, **k: "monólogo del podcast")
    monkeypatch.setattr("llm.podcast.podcast.podcast_audio", lambda text: None)
    r = gen.generate_resource("engage", 3, "tema")
    assert r.raw_json == {"monologue": "monólogo del podcast"}
    assert r.html and r.defects == []


def test_llm_fake_skips_providers_and_injects_runtime(monkeypatch):
    monkeypatch.setattr(settings, "llm_fake", True)
    calls: list[object] = []
    monkeypatch.setattr("llm.router.generar_texto", lambda *a, **k: calls.append(1) or "no-llm")

    result = gen.generate_resource("explore", 1, "Fotosíntesis")

    assert calls == []
    assert "Fotosíntesis" in result.html
    assert result.raw_json is not None
    assert result.defects == []
