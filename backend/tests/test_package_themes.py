"""Contraste real, compatibilidad HTML y tokens en los seis formatos offline."""

from io import BytesIO
from zipfile import ZipFile

import pytest

from core.educational_metadata import EducationalMetadata
from core.package_themes import (
    PACKAGE_THEMES,
    default_package_theme,
    inject_package_theme,
    theme_css,
)
from scorm import EXPORT_FORMATS, build_export


# «original» no inyecta variables (conserva la paleta del OVA): no tiene tokens que probar.
STYLED_THEMES = [theme for theme in PACKAGE_THEMES if theme != "original"]


def _luminance(color):
    channels = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
    return sum(c * weight for c, weight in zip(linear, (0.2126, 0.7152, 0.0722), strict=True))


def _contrast(a, b):
    light, dark = sorted((_luminance(a), _luminance(b)), reverse=True)
    return (light + 0.05) / (dark + 0.05)


@pytest.mark.parametrize("theme", STYLED_THEMES)
def test_complete_tokens_and_accessible_text(theme):
    tokens = PACKAGE_THEMES[theme]
    assert set(tokens) == set(PACKAGE_THEMES["upao"])
    assert {"font-body", "font-display", "font-mono", "muted", "focus", "space-6"} <= set(tokens)
    minimum = 7 if theme == "alto-contraste" else 4.5
    for foreground in ("text", "text-muted", "primary", "action", "success", "danger"):
        for background in ("bg", "surface", "surface-tint", "accent-tint"):
            ratio = _contrast(tokens[foreground], tokens[background])
            assert ratio >= minimum, (theme, foreground, background, ratio)
    for foreground, background in (
        ("on-primary", "primary"), ("on-primary", "primary-hover"),
        ("on-action", "action"), ("on-action", "action-hover"),
        ("text", "success-bg"), ("text", "danger-bg"),
        ("success", "success-bg"), ("danger", "danger-bg"),
    ):
        assert _contrast(tokens[foreground], tokens[background]) >= minimum
    assert "http" not in tokens["font-body"]


@pytest.mark.parametrize("theme", STYLED_THEMES)
@pytest.mark.parametrize("fmt", [fmt for fmt in EXPORT_FORMATS if fmt != "h5p"])
def test_every_export_contains_selected_tokens(theme, fmt):
    original = "<html><head><style>p{color:#123456}</style></head><body><p>Hola</p><script>window.x=1</script></body></html>"
    phases = [{"type": "engage", "order": 1, "content": original}]
    metadata = EducationalMetadata(author="Ana Integración", license="CC BY 4.0", language="es-PE")
    with ZipFile(BytesIO(build_export(fmt, "Curso", phases, theme=theme, metadata=metadata))) as package:
        if fmt == "epub":
            resource = "EPUB/recurso_1.xhtml"
            shell = "EPUB/nav.xhtml"
        elif fmt == "elpx":
            resource = "content/resources/genova/recurso_1.html"
            shell = resource
        else:
            resource = "resources/recurso_1.html"
            shell = "resources/styles.css"
        for path in (resource, shell):
            css = package.read(path).decode()
            for token, value in PACKAGE_THEMES[theme].items():
                assert f"--{token}:{value} !important;" in css
        html = package.read(resource).decode()
        assert "p{color:#123456}" in html
        assert "window.x=1" in html
        assert package.testzip() is None
        metadata_path = {
            "epub": "EPUB/package.opf", "elpx": "content.xml", "html": "index.html",
        }.get(fmt, "imsmanifest.xml")
        exported_metadata = package.read(metadata_path).decode()
        assert "Ana Integración" in exported_metadata
        assert "es-PE" in exported_metadata


@pytest.mark.parametrize("original", [
    "<HTML lang='es'><HEAD><title>X</title></HEAD><BODY>Antiguo</BODY></HTML>",
    "<!doctype html><html><body><p>Sin head</p></body></html>",
    "<p>Fragmento</p>",
])
def test_injection_preserves_content_and_replaces_previous_theme(original):
    themed = inject_package_theme(inject_package_theme(original, "infantil"), "oscuro")
    assert themed.count('id="genova-package-theme"') == 1
    assert "--bg:#000000" in themed
    assert "--bg:#FFFDF5" not in themed
    if "<body>" in original:
        assert original.split("<body>")[-1] in themed
    elif "Antiguo" in original:
        assert "<BODY>Antiguo</BODY>" in themed
    else:
        assert original in themed


def test_existing_upao_components_get_semantic_feedback_and_header_tokens():
    from pathlib import Path

    source = (Path(__file__).parents[1] / "llm/ova_components/upao_components.js").read_text()
    html = f"<html><head><style>p{{color:#166534}}</style></head><body><script>{source}</script></body></html>"
    themed = inject_package_theme(html, "alto-contraste")
    assert "successBg: 'var(--success-bg,#DCFCE7)'" in themed
    assert "dangerBg:  'var(--danger-bg,#FEE2E2)'" in themed
    assert "color:var(--on-primary,#fff);text-transform" in themed
    assert "color:rgba(255,255,255,.72)" not in themed
    assert "color:var(--success,#166534)" in themed
    assert "p{color:#166534}" in themed
    assert "success: [T.success, 'var(--success-bg,#EAF7F1)'" in themed
    assert ".time.warn{color:${T.action}}" in themed
    # Un script ajeno con esos mismos literales mantiene su contenido.
    custom = "<html><head></head><body><script>const css='color:#166534'</script></body></html>"
    assert "const css='color:#166534'" in inject_package_theme(custom, "oscuro")


def test_inject_is_idempotent_and_handles_unusual_script_end_tags():
    from core.package_themes import RESOURCE_THEME_REPLACEMENTS, THEME_START, inject_package_theme

    old, new = RESOURCE_THEME_REPLACEMENTS[0]
    html = (
        "<html><head></head><body>"
        f"<script>/* UPAO Components v1.0 */ {old}</SCRIPT\t>"
        f"<script>{old}</script>"
        "</body></html>"
    )
    once = inject_package_theme(html, "oscuro")
    twice = inject_package_theme(once, "claro")
    assert twice.count(THEME_START) == 1
    assert f"/* UPAO Components v1.0 */ {new}" in twice
    assert f"<script>{old}</script>" in twice  # solo se toca el script de componentes UPAO


def test_el_tema_original_no_pisa_la_paleta_del_recurso():
    html = "<html><head><style>:root{--primary:#14532D}</style></head><body>Hola</body></html>"
    assert theme_css("original") == ""
    assert inject_package_theme(html, "original") == html
    # Si venía de otro tema, el bloque anterior se quita.
    themed = inject_package_theme(html, "oscuro")
    assert "genova-package-theme" in themed
    assert "genova-package-theme" not in inject_package_theme(themed, "original")
    assert "--primary:#14532D" in inject_package_theme(themed, "original")


@pytest.mark.parametrize(
    ("ova_theme", "expected"),
    [
        (None, "upao"),
        ({"color": "upao", "design": "upao"}, "upao"),
        ({"color": "upao", "design": "free"}, "upao"),
        ({"color": "free", "design": "free"}, "original"),
        ({"color": "custom", "design": "upao", "palette": {"primary": "#14532D"}}, "original"),
    ],
)
def test_el_tema_de_paquete_por_defecto_respeta_la_paleta_elegida(ova_theme, expected):
    assert default_package_theme(ova_theme) == expected


@pytest.mark.parametrize("fmt", [fmt for fmt in EXPORT_FORMATS if fmt != "h5p"])
def test_exportar_con_el_tema_original_no_inyecta_variables(fmt):
    html = "<html><head><style>:root{--primary:#14532D}</style></head><body><p>Hola</p></body></html>"
    phases = [{"type": "engage", "order": 1, "content": html}]
    with ZipFile(BytesIO(build_export(fmt, "Curso", phases, theme="original"))) as package:
        assert not any(
            "--primary:#0A3D91 !important" in package.read(name).decode(errors="ignore")
            for name in package.namelist()
        )


@pytest.mark.parametrize(
    ("theme", "expected"),
    [({"color": "custom", "design": "upao"}, "original"), ({"color": "upao", "design": "upao"}, "upao")],
)
def test_crear_el_ova_en_generacion_fija_el_tema_de_paquete_segun_la_paleta(theme, expected):
    import uuid
    from unittest.mock import MagicMock

    from generation.jobs.jobs_service import create_job
    from models import Ova

    db = MagicMock()
    create_job(
        db,
        user_id=uuid.uuid4(),
        prompt="Derivadas",
        params={"theme": theme},
        resources=[{"phase_type": "engage", "phase_order": 1, "resource_type": "1"}],
    )
    ovas = [call.args[0] for call in db.add.call_args_list if isinstance(call.args[0], Ova)]
    assert [ova.package_theme for ova in ovas] == [expected]
