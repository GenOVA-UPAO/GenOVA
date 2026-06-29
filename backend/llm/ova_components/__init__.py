"""UPAO Web Components — inline script injection for generated OVA HTML."""

from pathlib import Path

_JS_PATH = Path(__file__).parent / "upao_components.js"
_SCRIPT_CACHE: str | None = None


def get_component_script() -> str:
    """Return the full <script> block for upao_components.js (cached)."""
    global _SCRIPT_CACHE
    if _SCRIPT_CACHE is None:
        _SCRIPT_CACHE = "<script>\n" + _JS_PATH.read_text(encoding="utf-8") + "\n</script>"
    return _SCRIPT_CACHE


def inject_components(html: str) -> str:
    """Inject the UPAO component library before </body> in generated HTML.

    Safe to call multiple times — won't double-inject if already present.
    """
    if "upao-card" in html or "customElements.define" in html:
        return html
    script = get_component_script()
    lower = html.lower()
    idx = lower.rfind("</body>")
    if idx != -1:
        return html[:idx] + "\n" + script + "\n" + html[idx:]
    return html + "\n" + script
