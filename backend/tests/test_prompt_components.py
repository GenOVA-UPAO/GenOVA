"""Offline contracts for every 5E resource, including legacy two-step routes."""

import importlib
import re
from string import Template

import pytest

from prometheus.prompts._loader import _phase
from tests.prompt_component_metrics import DIRECT, PHASES, instruction_size

CONCEPT = "Circuitos: corriente y resistencia"
CONTEXT = "Estudiantes de primer ciclo"
DS = "DESIGN_SYSTEM_SENTINEL"
PAYLOAD = '{"contenido": "PAYLOAD_SENTINEL"}'
COMMON = {"upao-header", "upao-objective", "upao-figure", "upao-example", "upao-summary"}
# Additional primitives required by each activity, not by the injected design system.
EXPECTED = {
    "engage": {
        1: "comic-panel nav progress", 2: "steps", 3: "podcast", 4: "timer question choice score",
        5: "reveal", 6: "reveal", 7: "reveal", 8: "node nav progress",
        9: "question choice status nav", 10: "status",
    },
    "explore": {
        1: "reveal status progress", 2: "question reveal progress", 3: "drag-item drop-zone status score",
        4: "steps nav question reveal", 5: "question reveal", 6: "status reveal",
        7: "steps question reveal", 8: "question choice nav score", 9: "drag-item drop-zone reveal",
        10: "status progress reveal",
    },
    "explain": {
        1: "steps", 2: "node question reveal progress", 3: "node", 4: "node progress",
        5: "steps status", 6: "node", 7: "node nav progress", 8: "", 9: "", 10: "reveal progress",
    },
    "elaborate": {
        1: "question reveal progress", 2: "node steps reveal status nav", 3: "node status",
        4: "status progress", 5: "question choice reveal", 6: "status reveal",
        7: "steps status reveal", 8: "node reveal", 9: "score status", 10: "node reveal",
    },
    "evaluate": {
        1: "question choice progress score nav", 2: "score status",
        3: "timer question choice score progress", 4: "question nav score",
        5: "question status score progress", 6: "drag-item drop-zone status score",
        7: "status progress", 8: "question reveal", 9: "status score", 10: "",
    },
}
CASES = [(phase, n) for phase in PHASES for n in range(1, 11)]


def module(phase):
    return importlib.import_module(f"prometheus.prompts.{phase}_prompts")


def html_prompt(phase, n, *, legacy=False, config=None):
    mod = module(phase)
    if n in DIRECT[phase] and not legacy:
        return mod.prompt_codigo(n, CONCEPT, CONTEXT, DS, config)
    return mod.prompt_html(n, CONCEPT, PAYLOAD, CONTEXT, DS)


def assert_components(prompt, phase, n):
    tags = set(re.findall(r"upao-[a-z-]+", prompt))
    assert tags >= COMMON
    assert {f"upao-{name}" for name in EXPECTED[phase][n].split()} <= tags
    for instruction in ("objetivo de aprendizaje", "al menos un", "propio", "porqué", "consolide"):
        assert instruction in prompt
    assert "sin redefinir tokens" in prompt
    assert not re.search(r":root|--[a-z]+\s*:|#[0-9a-fA-F]{6}|[Mm][íi]nimo \d+ l[íi]neas", prompt)


@pytest.mark.parametrize(("phase", "n"), CASES)
def test_all_production_resources_render_with_components(phase, n):
    prompt = html_prompt(phase, n)
    assert_components(prompt, phase, n)
    assert CONCEPT in prompt and CONTEXT in prompt and DS in prompt
    assert "<!DOCTYPE html>" in prompt and "sin markdown" in prompt
    assert "${" not in prompt
    if n not in DIRECT[phase]:
        assert PAYLOAD in prompt


TEXT_CASES = [(phase, int(n)) for phase in PHASES for n in _phase(phase).get("texto", {})]


@pytest.mark.parametrize(("phase", "n"), TEXT_CASES)
def test_text_and_legacy_html_routes_preserve_contracts(phase, n):
    mod = module(phase)
    entry = _phase(phase)["texto"][str(n)]
    prompt = mod.prompt_texto(n, CONCEPT, CONTEXT)
    assert "${" not in prompt
    assert CONCEPT in prompt and CONTEXT in prompt
    assert "[SALIDA]" in prompt
    assert "JSON puro" in prompt or (phase, n) == ("engage", 3)
    # HTML primitives belong to the rendering stage, never to the JSON/TTS payload.
    assert "upao-" not in prompt
    assert_components(html_prompt(phase, n, legacy=True), phase, n)
    config = dict.fromkeys(entry["defaults"], 17)
    configured = mod.prompt_texto(n, CONCEPT, CONTEXT, config)
    assert "17" in configured and "${" not in configured
    for name in Template(entry["template"]).get_identifiers():
        if name.endswith("_plus2"):
            assert "19" in configured


@pytest.mark.parametrize(("phase", "n"), [(p, n) for p in PHASES for n in sorted(DIRECT[p])])
def test_direct_resource_configuration_and_derived_variables(phase, n):
    data = _phase(phase)
    entry = data["simulador"] if (phase, n) == ("engage", 10) else data["codigo"][str(n)]
    prompt = html_prompt(phase, n, config=dict.fromkeys(entry["defaults"], 17))
    assert "17" in prompt and "${" not in prompt
    if any(name.endswith("_plus1") for name in Template(entry["template"]).get_identifiers()):
        assert "18" in prompt


@pytest.mark.parametrize("phase", PHASES)
def test_unknown_resources_and_public_metadata(phase):
    mod = module(phase)
    assert set(mod.RECURSOS_META) == set(range(1, 11))
    assert mod.prompt_texto(99, CONCEPT) == ""
    assert mod.prompt_codigo(99, CONCEPT) == ""
    assert DS in mod.prompt_html(99, CONCEPT, PAYLOAD, design_system=DS)


def test_choices_do_not_replace_editable_exam_or_subjective_decisions():
    for phase, n in (("engage", 5), ("engage", 7), ("elaborate", 6), ("evaluate", 4)):
        assert "upao-choice" not in html_prompt(phase, n)
    assert "solo al entregar" in html_prompt("evaluate", 4)
    assert "requestAnimationFrame" in html_prompt("explain", 5)
    assert "setInterval" not in html_prompt("evaluate", 3)
    assert "window.print" in html_prompt("evaluate", 10)


@pytest.mark.parametrize("phase", PHASES)
def test_instruction_budget_does_not_grow(phase):
    # Fixed pre-migration budgets, independent of the repository's current HEAD.
    budgets = {
        "engage": 20868, "explore": 14250, "explain": 9135, "elaborate": 10206, "evaluate": 9524,
    }
    assert instruction_size(phase, _phase(phase)) <= budgets[phase]
