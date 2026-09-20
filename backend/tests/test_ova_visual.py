"""Contract, runtime roundtrip and AA palette regressions (no provider calls)."""

import re
from pathlib import Path

import pytest

from llm.ova_components import get_component_script
from llm.utils.ova_runtime import inject_runtime, strip_runtime
from llm.utils.themes import UPAO_PALETTE, build_design_system

COMPONENTS = Path(__file__).resolve().parents[1] / "llm/ova_components"
FIXTURE = Path(__file__).parent / "fixtures/ova-visual.html"
NEW_TAGS = {
    "upao-header",
    "upao-objective",
    "upao-steps",
    "upao-example",
    "upao-figure",
    "upao-question",
    "upao-summary",
    "upao-status",
}


def test_every_registered_element_has_catalog_entry_and_design_guidance():
    registered = set(re.findall(r"\['(upao-[a-z-]+)',\s*\w+\]", get_component_script()))
    catalog = (COMPONENTS / "component_catalog.md").read_text(encoding="utf-8")
    documented = set(re.findall(r"^## (upao-[a-z-]+)", catalog, re.M))
    documented.update(re.findall(r"^## upao-[a-z-]+ \+ (upao-[a-z-]+)", catalog, re.M))
    assert registered == documented
    assert registered >= NEW_TAGS
    assert all(tag in build_design_system() for tag in registered)


def test_visual_fixture_survives_runtime_replacement_without_changing_content():
    html = FIXTURE.read_text(encoding="utf-8")
    injected = inject_runtime(html, css=True, components=True)
    authored, css, components = strip_runtime(injected)
    assert css and components
    assert authored.strip() == html.strip()
    updated = inject_runtime(authored, css=css, components=components)
    assert inject_runtime(updated, css=True, components=True) == updated
    assert updated.count("UPAO Components v") == 1
    assert updated.count('id="ova-base"') == 1


def test_free_layout_does_not_require_custom_elements():
    for color in ("upao", "free"):
        assert "<upao-" not in build_design_system(color, "free")


def luminance(hex_color):
    rgb = [int(hex_color[i : i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in rgb]
    return sum(v * weight for v, weight in zip(linear, (0.2126, 0.7152, 0.0722), strict=True))


@pytest.mark.parametrize(
    ("foreground", "background"),
    [
        ("text", "bg"),
        ("text_muted", "bg"),
        ("text_muted", "surface_tint"),
        ("primary", "surface"),
        ("action", "surface"),
        ("action_hover", "accent_tint"),
        ("surface", "action"),
        ("surface", "action_hover"),
        ("success", "surface"),
        ("danger", "surface"),
    ],
)
def test_palette_text_pairs_meet_wcag_aa(foreground, background):
    light, dark = sorted(
        (luminance(UPAO_PALETTE[foreground]), luminance(UPAO_PALETTE[background])), reverse=True
    )
    assert (light + 0.05) / (dark + 0.05) >= 4.5
