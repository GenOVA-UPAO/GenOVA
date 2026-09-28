"""Paleta del docente («Personalizado»): derivación, prompt, runtime y petición."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from generation.jobs.jobs_helpers import ThemeRequest
from llm.utils.base_css import inject_base_css
from llm.utils.ova_runtime import inject_runtime, runtime_palette, strip_runtime, theme_of
from llm.utils.palette import contrast_on_white, normalize_palette, palette_vars
from llm.utils.themes import build_design_system, theme_design_system

# Las 8 paletas que ofrece «Estilo de mis OVAs» (ova-palettes.ts).
PALETTES = [
    ("#0A3D91", "#F47A20"),
    ("#164E63", "#38BDF8"),
    ("#14532D", "#86EFAC"),
    ("#7F1D1D", "#FCA5A5"),
    ("#4C1D95", "#C4B5FD"),
    ("#78350F", "#FCD34D"),
    ("#1E293B", "#94A3B8"),
    ("#831843", "#F9A8D4"),
]
OCEANO = {"name": "Oceano", "primary": "#164E63", "accent": "#38BDF8"}


def test_normaliza_solo_paletas_validas():
    assert normalize_palette(OCEANO) == {"name": "Oceano", "primary": "#164E63", "accent": "#38BDF8"}
    assert normalize_palette({"primary": "#164e63", "accent": "#38bdf8"})["primary"] == "#164E63"
    assert normalize_palette({"primary": "red", "accent": "#38BDF8"}) is None
    assert normalize_palette({"primary": "#164E63"}) is None
    assert normalize_palette(None) is None


@pytest.mark.parametrize(("primary", "accent"), PALETTES)
def test_los_colores_con_texto_cumplen_aa_en_todas_las_paletas(primary, accent):
    v = palette_vars({"primary": primary, "accent": accent})
    for key in ("primary", "action", "text", "text_muted"):
        assert contrast_on_white(v[key]) >= 4.5, (key, v[key])
    # El acento se respeta tal cual: solo se usa en separadores y gráficos.
    assert v["accent"] == accent


def test_el_prompt_usa_la_paleta_del_docente():
    ds = build_design_system("custom", "upao", OCEANO)
    assert "PALETA DEL DOCENTE OBLIGATORIA" in ds
    assert "#164E63" in ds and "#38BDF8" in ds
    assert "PALETA UPAO OBLIGATORIA" not in ds
    assert "Paleta fija UPAO" not in ds


def test_custom_sin_paleta_vuelve_a_upao():
    assert build_design_system("custom", "upao", None) == build_design_system("upao", "upao")
    assert theme_design_system({"color": "custom"}) == build_design_system("upao", "upao")


def test_la_hoja_base_lleva_la_paleta_y_se_puede_leer():
    html = inject_base_css("<html><head></head><body></body></html>", OCEANO)
    assert 'data-palette="#164E63,#38BDF8"' in html
    assert "--primary:#164E63" in html
    assert runtime_palette(html) == {"primary": "#164E63", "accent": "#38BDF8"}
    assert strip_runtime(html)[1] is True


def test_sin_paleta_la_hoja_base_es_la_de_upao():
    html = inject_base_css("<html><head></head><body></body></html>")
    assert "data-palette" not in html
    assert "--primary:#0A3D91" in html


def test_la_edicion_conserva_la_paleta():
    """El editor quita el runtime y lo vuelve a poner: la paleta no se pierde."""
    original = inject_runtime(
        "<html><head></head><body><h1>x</h1></body></html>",
        css=True,
        components=True,
        palette=OCEANO,
    )
    authored, had_css, had_components = strip_runtime(original)
    again = inject_runtime(
        authored, css=had_css, components=had_components, palette=runtime_palette(original)
    )
    assert runtime_palette(again) == {"primary": "#164E63", "accent": "#38BDF8"}


def test_regenerar_desde_cero_respeta_el_tema_del_recurso():
    doc = "<html><head></head><body><h1>x</h1></body></html>"
    custom = inject_runtime(doc, css=True, components=True, palette=OCEANO)
    assert theme_of(custom) == {
        "color": "custom",
        "design": "upao",
        "palette": {"primary": "#164E63", "accent": "#38BDF8"},
    }
    assert theme_of(inject_runtime(doc, css=False, components=True)) == {
        "color": "free",
        "design": "upao",
    }
    # Sin runtime no se distingue «libre» de un recurso antiguo: UPAO, como antes.
    assert theme_of(doc) == {"color": "upao", "design": "upao"}


def test_la_peticion_valida_la_paleta():
    theme = ThemeRequest(color="custom", palette=OCEANO)
    assert theme.model_dump()["palette"]["primary"] == "#164E63"
    assert ThemeRequest(color="custom").color == "upao"
    assert ThemeRequest(color="upao", palette=OCEANO).palette is None
    with pytest.raises(ValidationError):
        ThemeRequest(color="custom", palette={"primary": "azul", "accent": "#38BDF8"})
