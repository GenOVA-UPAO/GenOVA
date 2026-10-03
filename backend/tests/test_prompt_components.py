"""Pruebas de contratos de metadatos 5E y prompt de micro-podcast (engage:3)."""

import importlib

import pytest

PHASES = ("engage", "explore", "explain", "elaborate", "evaluate")
CONCEPT = "Circuitos: corriente y resistencia"
CONTEXT = "Estudiantes de primer ciclo"


@pytest.mark.parametrize("phase", PHASES)
def test_all_phases_have_complete_recursos_meta(phase):
    mod = importlib.import_module(f"prometheus.prompts.{phase}_prompts")
    assert set(mod.RECURSOS_META) == set(range(1, 11))
    for n in range(1, 11):
        meta = mod.RECURSOS_META[n]
        assert "tipo" in meta and meta["tipo"]
        assert "duracion" in meta and meta["duracion"]
        assert "interactividad" in meta and meta["interactividad"]
        assert "emoji" in meta and meta["emoji"]


def test_engage_podcast_prompt():
    from prometheus.prompts.engage_prompts import prompt_texto

    prompt = prompt_texto(3, CONCEPT, CONTEXT)
    assert CONCEPT in prompt
    assert CONTEXT in prompt
    assert "micro-podcasts" in prompt
    assert "${" not in prompt
