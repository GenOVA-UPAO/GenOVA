"""Tests unitarios para la validación y renderizado de créditos de imágenes.

Verifica:
1. Rechazo de créditos incompletos o con fallbacks inventados ("Autor", "Licencia libre", "web", "#").
2. No renderizar la imagen (retornar "") si el crédito de una foto de terceros está incompleto.
3. Exención de créditos para diagramas, logos con marca propia e imágenes generadas por IA.
4. Renderizado correcto de créditos cuando están completos y válidos.
"""

import pytest

from llm.images.image_enrich import format_credit_caption
from ova_engine.contract import RenderContext
from ova_engine.html import (
    is_generic_credit_value,
    is_valid_third_party_credit,
    render_credits_section,
    render_image_figure,
    render_item_figure,
)
from ova_engine.registry import all_specs


def test_is_generic_credit_value():
    # Valores genéricos inválidos que deben ser rechazados
    assert is_generic_credit_value("Autor") is True
    assert is_generic_credit_value("autor") is True
    assert is_generic_credit_value("Licencia libre") is True
    assert is_generic_credit_value("licencia libre") is True
    assert is_generic_credit_value("web") is True
    assert is_generic_credit_value("#") is True
    assert is_generic_credit_value("Desconocido") is True
    assert is_generic_credit_value("Wikimedia") is True
    assert is_generic_credit_value("Openverse") is True
    assert is_generic_credit_value("Colaborador de Wikimedia") is True
    assert is_generic_credit_value("Autor Openverse") is True
    assert is_generic_credit_value("") is True
    assert is_generic_credit_value(None) is True

    # Valores específicos legítimos
    assert is_generic_credit_value("Linus Torvalds") is False
    assert is_generic_credit_value("CC BY-SA 4.0") is False
    assert is_generic_credit_value("https://commons.wikimedia.org/wiki/File:Linux.jpg") is False


def test_is_valid_third_party_credit():
    # Crédito completo y legítimo
    assert is_valid_third_party_credit({
        "author": "Alice Smith",
        "license": "CC BY-SA 4.0",
        "url": "https://commons.wikimedia.org/wiki/File:Router.jpg",
    }) is True

    # Crédito incompleto: falta autor
    assert is_valid_third_party_credit({
        "author": "",
        "license": "CC BY 4.0",
        "url": "https://example.com/photo.jpg",
    }) is False

    # Crédito incompleto: falta licencia
    assert is_valid_third_party_credit({
        "author": "Bob Jones",
        "license": "",
        "url": "https://example.com/photo.jpg",
    }) is False

    # Crédito incompleto: falta url
    assert is_valid_third_party_credit({
        "author": "Bob Jones",
        "license": "CC BY 4.0",
        "url": "",
    }) is False

    # Crédito con valores genéricos o inventados
    assert is_valid_third_party_credit({
        "author": "Autor",
        "license": "CC BY 4.0",
        "url": "https://example.com/photo.jpg",
    }) is False

    assert is_valid_third_party_credit({
        "author": "Bob Jones",
        "license": "Licencia libre",
        "url": "https://example.com/photo.jpg",
    }) is False

    assert is_valid_third_party_credit({
        "author": "Bob Jones",
        "license": "CC BY 4.0",
        "url": "#",
    }) is False

    assert is_valid_third_party_credit({
        "author": "Colaborador de Wikimedia",
        "license": "CC BY-SA 4.0",
        "url": "https://commons.wikimedia.org/wiki/File:Foo.jpg",
    }) is False


def test_render_image_figure_incomplete_credit_returns_empty_string():
    """Si una imagen de terceros tiene créditos incompletos, NO se debe renderizar (retornar '')."""
    img_src = "https://example.com/images/server.jpg"

    # Caso 1: Sin crédito del todo
    html_no_credit = render_image_figure(
        src=img_src,
        alt="Servidor",
        credit=None,
        is_third_party=True,
    )
    assert html_no_credit == ""

    # Caso 2: Crédito con autor genérico 'Autor'
    html_generic_author = render_image_figure(
        src=img_src,
        alt="Servidor",
        credit={"author": "Autor", "license": "CC BY 4.0", "url": "https://example.com"},
        is_third_party=True,
    )
    assert html_generic_author == ""

    # Caso 3: Crédito con url '#'
    html_hash_url = render_image_figure(
        src=img_src,
        alt="Servidor",
        credit={"author": "John Doe", "license": "CC BY 4.0", "url": "#"},
        is_third_party=True,
    )
    assert html_hash_url == ""

    # Caso 4: Crédito con 'Licencia libre'
    html_generic_lic = render_image_figure(
        src=img_src,
        alt="Servidor",
        credit={"author": "John Doe", "license": "Licencia libre", "url": "https://example.com"},
        is_third_party=True,
    )
    assert html_generic_lic == ""


def test_render_image_figure_valid_credit_renders_figure():
    """Una imagen de terceros con crédito completo y válido se renderiza con su figcaption."""
    html = render_image_figure(
        src="https://example.com/images/antenna.jpg",
        alt="Antena de telecomunicación 5G",
        credit={
            "author": "Telecom Corp",
            "license": "CC BY-SA 3.0",
            "url": "https://commons.wikimedia.org/wiki/File:Antenna.jpg",
        },
        is_third_party=True,
    )
    assert "<figure" in html
    assert "<img" in html
    assert "https://example.com/images/antenna.jpg" in html
    assert "<figcaption" in html
    assert "Telecom Corp" in html
    assert "CC BY-SA 3.0" in html
    assert "https://commons.wikimedia.org/wiki/File:Antenna.jpg" in html


def test_render_image_figure_exemptions_diagram_logo_generated():
    """Diagramas, logos e imágenes generadas NO requieren crédito y deben renderizarse normalmente."""
    # Diagrama
    html_diag = render_image_figure(
        src="data:image/svg+xml;base64,PHN2Z...",
        alt="Diagrama de arquitectura",
        credit=None,
        is_diagram=True,
    )
    assert "<figure" in html_diag
    assert "<img" in html_diag
    assert "<figcaption" not in html_diag

    # Logo
    html_logo = render_image_figure(
        src="/static/logos/python.svg",
        alt="Logo de Python",
        credit=None,
        is_logo=True,
    )
    assert "<figure" in html_logo
    assert "<img" in html_logo
    assert "<figcaption" not in html_logo

    # Generada por IA
    html_gen = render_image_figure(
        src="data:image/webp;base64,UklGR...",
        alt="Ilustración de red neuronal",
        credit=None,
        is_generated=True,
    )
    assert "<figure" in html_gen
    assert "<img" in html_gen
    assert "<figcaption" not in html_gen


def test_render_credits_section_filters_invalid_items():
    credits = [
        # Válido
        {"author": "Jane Doe", "license": "CC BY 4.0", "url": "https://example.com/img1.jpg", "title": "Router"},
        # Inválido (autor genérico)
        {"author": "Autor", "license": "CC BY 4.0", "url": "https://example.com/img2.jpg"},
        # Inválido (sin url)
        {"author": "John Doe", "license": "CC BY 4.0", "url": ""},
    ]
    html = render_credits_section(credits)
    assert "Jane Doe" in html
    assert "https://example.com/img1.jpg" in html
    assert "Autor" not in html
    assert "img2.jpg" not in html


def test_format_credit_caption():
    # Crédito válido
    valid_cred = {"author": "Carlos Vega", "license": "CC BY-SA 4.0", "url": "https://commons.wikimedia.org/wiki/File:Switch.jpg"}
    caption = format_credit_caption(valid_cred)
    assert "Carlos Vega" in caption
    assert "CC BY-SA 4.0" in caption
    assert "https://commons.wikimedia.org/wiki/File:Switch.jpg" in caption

    # Crédito inválido / genérico -> retorna ""
    invalid_cred = {"author": "Autor", "license": "Licencia libre", "url": "#"}
    assert format_credit_caption(invalid_cred) == ""
    assert format_credit_caption({}) == ""


# --- La fuente real (image_source) decide si hace falta crédito ---------------------
# Regresión: una 'foto' que el decisor resolvió generándola con IA no tiene crédito de
# terceros; si la plantilla no pasa la fuente, render_image_figure la descartaba.

_VALID_CREDIT = {
    "author": "Jane Doe",
    "license": "CC BY-SA 4.0",
    "license_url": "https://creativecommons.org/licenses/by-sa/4.0/",
    "source_url": "https://commons.wikimedia.org/wiki/File:Antenna.jpg",
    "provider": "wikimedia",
}


def _enriched_item(source: str, *, tipo: str | None = "foto", credit: dict | None = None) -> dict:
    """Ítem tal como lo deja ``image_enrich.enrich_with_images`` tras resolver la imagen."""
    imagen = {"descripcion": "Antena de telefonía 5G"}
    if tipo:
        imagen["tipo"] = tipo
    return {
        "imagen": imagen,
        "image_placeholder": "__IMG_1__",
        "image_credit": credit,
        "image_source": source,
    }


@pytest.mark.parametrize("tipo", ["foto", None])
def test_generated_image_without_credit_renders_figure(tipo):
    html = render_item_figure(_enriched_item("generada", tipo=tipo))
    assert '<figure class="ova-image-figure"' in html
    assert 'src="__IMG_1__"' in html
    assert "<figcaption" not in html


def test_search_image_without_credit_is_dropped():
    assert render_item_figure(_enriched_item("busqueda")) == ""


def test_search_image_with_valid_credit_renders_caption():
    html = render_item_figure(_enriched_item("busqueda", credit=_VALID_CREDIT))
    assert 'src="__IMG_1__"' in html
    assert "Jane Doe" in html


@pytest.mark.parametrize("tipo", ["logo", "escena", "diagrama"])
def test_known_search_source_overrides_exempt_tipo_hint(tipo):
    """La pista 'tipo' del LLM no exime del crédito si la imagen vino de búsqueda web."""
    assert render_item_figure(_enriched_item("busqueda", tipo=tipo)) == ""


def test_render_item_figure_without_image_returns_empty():
    assert render_item_figure(None) == ""
    assert render_item_figure({"imagen": {"tipo": "foto"}}) == ""


_IMAGE_TEMPLATES = (
    "elaborate:1", "engage:5", "engage:6", "explain:2", "explain:6",
    "explain:8", "explain:9", "explain:10", "explore:5",
)


@pytest.mark.parametrize("key", _IMAGE_TEMPLATES)
def test_templates_keep_generated_foto_and_drop_uncredited_search(key):
    spec = all_specs()[key]
    params = spec.resolve_params({})
    ctx = RenderContext(concept="Redes de computadoras", phase=spec.phase, rt=spec.rt, title=spec.title, params=params)
    data = spec.sample(ctx.concept, params)
    data["imagen"] = {**data["imagen"], "tipo": "foto"}
    data.update(image_placeholder="__IMG_1__", image_credit=None, image_source="generada")
    assert 'class="ova-figure-img" src="__IMG_1__"' in spec.render(data, ctx)

    data["image_source"] = "busqueda"
    assert 'class="ova-figure-img"' not in spec.render(data, ctx)

