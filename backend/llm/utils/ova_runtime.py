"""Runtime compartido de los OVAs: hoja base UPAO + librería de componentes.

El runtime (~30 KB) se inyecta en el HTML final, pero el LLM nunca debe
reescribirlo: si el refinador o la edición puntual reciben el documento con el
runtime dentro, tienen que devolverlo completo, lo que gasta tokens, alarga la
generación y trunca el JS del propio recurso cuando la salida llega al tope de
tokens. Por eso el modelo trabaja solo con el HTML "autorado" y el runtime se
quita antes de cada llamada y se vuelve a poner después.
"""

import re

from llm.ova_components import inject_components
from llm.utils.base_css import inject_base_css

_BASE_CSS = re.compile(r'\s*<style id="ova-base"[^>]*>[\s\S]*?</style>')
_PALETTE = re.compile(r'<style id="ova-base" data-palette="(#[0-9A-Fa-f]{6}),(#[0-9A-Fa-f]{6})"')
_COMPONENTS = re.compile(
    r"\s*<script>\s*(?:/\*[\s\S]*?\*/\s*)?[^<]{0,200}UPAO Components v[\s\S]*?</script>"
)


def strip_runtime(html: str) -> tuple[str, bool, bool]:
    """Quita el runtime inyectado. Devuelve (html_autorado, tenía_css, tenía_componentes)."""
    had_css = bool(_BASE_CSS.search(html))
    had_components = "UPAO Components v" in html
    authored = _BASE_CSS.sub("", html)
    if had_components:
        authored = _COMPONENTS.sub("", authored)
    return authored, had_css, had_components


def runtime_palette(html: str) -> dict | None:
    """La paleta del docente con la que se inyectó la hoja base, si la hubo."""
    match = _PALETTE.search(html or "")
    return {"primary": match.group(1), "accent": match.group(2)} if match else None


def theme_of(html: str) -> dict:
    """Tema con el que se generó un recurso, deducido de su runtime.

    Regenerar un recurso desde cero no conoce el tema del job original: sin
    esto, un OVA con colores libres o con la paleta del docente volvía a UPAO.
    """
    _, had_css, had_components = strip_runtime(html or "")
    palette = runtime_palette(html)
    if not (had_css or had_components):
        # Sin runtime no se distingue «libre» de un recurso anterior a la hoja
        # inyectada: se queda en UPAO, como hasta ahora.
        return {"color": "upao", "design": "upao"}
    theme: dict = {
        "color": "custom" if palette else ("upao" if had_css else "free"),
        "design": "upao" if had_components else "free",
    }
    if palette:
        theme["palette"] = palette
    return theme


def inject_runtime(
    html: str, *, css: bool, components: bool, palette: dict | None = None
) -> str:
    """Inyecta el runtime (idempotente) según el tema del recurso."""
    if css:
        html = inject_base_css(html, palette)
    if components:
        html = inject_components(html)
    return html
