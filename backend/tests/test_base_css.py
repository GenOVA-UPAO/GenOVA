"""F1.2 — hoja base UPAO inyectada server-side."""

from llm.ova_components import get_component_script, inject_components
from llm.utils.base_css import OVA_BASE_CSS, inject_base_css
from llm.utils.themes import build_design_system


def test_inject_into_head():
    html = "<!DOCTYPE html><html><head><title>x</title></head><body>hola</body></html>"
    out = inject_base_css(html)
    assert 'id="ova-base"' in out
    assert out.index("ova-base") < out.index("<title>")
    # idempotente
    assert inject_base_css(out).count('id="ova-base"') == 1


def test_base_css_has_contract_classes():
    for cls in [".ova-card", ".ova-btn", ".ova-option", ".ova-feedback--ok",
                ".ova-progress", ".ova-grid", "--primary:#0A3D91"]:
        assert cls in OVA_BASE_CSS, cls


def test_design_system_upao_references_injected_base():
    ds = build_design_system("upao", "upao")
    assert "NO LA REESCRIBAS" in ds
    assert ".ova-btn" in ds
    # ya no pide definir el :root a mano
    assert "Define EXACTAMENTE estas variables" not in ds
    # badge del esqueleto: tipo de actividad, no jerga 5E
    assert "FASE · TIPO DE RECURSO" not in ds
    assert "[TIPO DE ACTIVIDAD]" in ds
    assert "ENGAGE" in ds  # aparece en la lista de PROHIBIDO
    assert "jerga interna 5E" in ds


def test_design_system_free_keeps_manual_css():
    ds = build_design_system("free", "free")
    assert "Reset CSS al inicio" in ds
    assert "TIPOGRAF" in ds


def test_inject_components_even_if_llm_used_tags():
    """Regresión: el early-return por 'upao-card' dejaba tags sin registrar."""
    html = "<html><head></head><body><upao-card title='x'>y</upao-card></body></html>"
    out = inject_components(html)
    assert "UPAO Components v" in out
    # y sigue idempotente con el script oficial presente
    assert inject_components(out).count(get_component_script()[:40]) == 1
