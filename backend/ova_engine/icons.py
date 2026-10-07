"""Iconos SVG en línea para las plantillas (en lugar de emoji).

Los emoji dependen de una fuente del sistema: sin ella (Linux, algunos Android)
salen como un cuadro vacío, y el tema de paquete no puede colorearlos. Estos
iconos heredan `currentColor`, escalan con el texto y van con `aria-hidden`.
Mismo patrón que `llm/ova_components/upao_components.js` (`svgIcon`).
"""

from __future__ import annotations

import re

# Trazados de 24x24, rellenos con la regla par-impar (los subtrazados interiores
# hacen de hueco).
PATHS: dict[str, str] = {
    "clock": "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm-1 3v6l4.5 2.7.8-1.3-3.8-2.2V7z",
    "eye": "M12 5C7 5 2.7 8.1 1 12c1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7zm0 11.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
    "film": "M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm1 2v2h2V6zm4 0v2h2V6zm4 0v2h2V6zm4 0v2h2V6zM5 16v2h2v-2zm4 0v2h2v-2zm4 0v2h2v-2zm4 0v2h2v-2zM5 10v4h14v-4z",
    "mic": "M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zM6 11h2a4 4 0 0 0 8 0h2a6 6 0 0 1-5 5.9V20h3v2H8v-2h3v-3.1A6 6 0 0 1 6 11z",
    "clipboard": "M9 2h6v2h4a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h4zm1.5 1.5v2h3v-2zM7 10h10v1.6H7zm0 4h10v1.6H7zm0 4h6v1.6H7z",
    "play": "M7 4v16l13-8z",
    "pause": "M6 4h4v16H6zm8 0h4v16h-4z",
    "prev": "M6 5h2.5v14H6zm3.5 7L19 5v14z",
    "next": "M15.5 5H18v14h-2.5zM5 5l9.5 7L5 19z",
    "bolt": "M13 2 4 14h6l-1 8 9-12h-6z",
    "scale": "M11 4h2v1.5h6V7h-1.3l2.8 6.5a3.5 3.5 0 0 1-7 0L16.3 7H13v12h4v2H7v-2h4V7H7.7l2.8 6.5a3.5 3.5 0 0 1-7 0L6.3 7H5V5.5h6z",
    "bulb": "M12 2a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2zM9 20h6v2H9z",
    "building": "M4 3h11v6h5v12H4zm2.5 2.5v2h2v-2zm4 0v2h2v-2zm-4 4v2h2v-2zm4 0v2h2v-2zm-4 4v2h2v-2zm4 0v2h2v-2zM17 11.5v2h1.5v-2zm0 4v2h1.5v-2z",
    "user": "M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0 2c-4.4 0-8 2.2-8 5v2h16v-2c0-2.8-3.6-5-8-5z",
    "folder": "M3 5a1 1 0 0 1 1-1h5.5l2 2H20a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z",
    "folder-open": "M4 4h5.5l2 2H19a1 1 0 0 1 1 1v2H8.2a1 1 0 0 0-.95.68L4 19.5zM9.2 11H22l-3 8.3a1 1 0 0 1-.95.7H4z",
    "link": "M7.8 16.2a3.5 3.5 0 0 1 0-5l2-2 1.4 1.4-2 2a1.5 1.5 0 0 0 2.1 2.1l2-2 1.4 1.4-2 2a3.5 3.5 0 0 1-4.9.1zm8.4-8.4a3.5 3.5 0 0 1 0 5l-2 2-1.4-1.4 2-2a1.5 1.5 0 0 0-2.1-2.1l-2 2-1.4-1.4 2-2a3.5 3.5 0 0 1 4.9-.1zM9.8 14.2l4.4-4.4 1 1-4.4 4.4z",
    "lock": "M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V7a3 3 0 0 0-6 0zm3 3.5a1.5 1.5 0 0 0-1 2.6V18h2v-1.9a1.5 1.5 0 0 0-1-2.6z",
    "unlock": "M7 10V7a5 5 0 0 1 9.6-2l-1.9.7A3 3 0 0 0 9 7v3h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm5 3.5a1.5 1.5 0 0 0-1 2.6V18h2v-1.9a1.5 1.5 0 0 0-1-2.6z",
    "star": "M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.1 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z",
    "door": "M5 3h14v18h-2V5H7v16H5zm8 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM9 6h6v15H9z",
    "tools": "M21.7 18.6l-7.3-7.3a5.5 5.5 0 0 0-6.9-6.9l3.4 3.4-2.4 2.4L5 6.8a5.5 5.5 0 0 0 6.9 6.9l7.3 7.3a1.5 1.5 0 0 0 2.1 0l.4-.4a1.5 1.5 0 0 0 0-2.1z",
    "trophy": "M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V17h3v2H8v-2h3v-2.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3zM6 7v1a2 2 0 0 0 1 1.7V7zm11 0v2.7A2 2 0 0 0 18 8V7z",
    "search": "M10 3a7 7 0 1 0 4.2 12.6l5.1 5.1 1.4-1.4-5.1-5.1A7 7 0 0 0 10 3zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z",
    "question": "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 15h2v2h-2zm1-11a3.5 3.5 0 0 1 1.4 6.7c-.6.3-.9.7-.9 1.3h-2c0-1.4.8-2.2 1.6-2.7A1.5 1.5 0 1 0 10.5 9.5h-2A3.5 3.5 0 0 1 12 6z",
    "book": "M5 3h13a1 1 0 0 1 1 1v14H7a1 1 0 0 0 0 2h12v2H7a3 3 0 0 1-3-3V4a1 1 0 0 1 1-1zm2 2v10.2a3 3 0 0 1 1-.2h9V5z",
    "key": "M7 14a5 5 0 1 1 4.6-3.1L21 20.4V22h-3.5v-1.5H16V19h-1.5v-1.5H13L10.9 15.4A5 5 0 0 1 7 14zm0-7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
    "database": "M12 3c-4.4 0-8 1.3-8 3v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6c0-1.7-3.6-3-8-3zm0 2c3.7 0 6 .9 6 1s-2.3 1-6 1-6-.9-6-1 2.3-1 6-1zm0 14c-3.7 0-6-.9-6-1v-2.8c1.5.8 3.7 1.3 6 1.3s4.5-.5 6-1.3V18c0 .1-2.3 1-6 1zm0-4.5c-3.7 0-6-.9-6-1V10.7c1.5.8 3.7 1.3 6 1.3s4.5-.5 6-1.3V13.5c0 .1-2.3 1-6 1z",
    "gear": "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM10.5 2h3l.5 2.6 1.6.7 2.2-1.5 2.1 2.1-1.5 2.2.7 1.6 2.6.5v3l-2.6.5-.7 1.6 1.5 2.2-2.1 2.1-2.2-1.5-1.6.7-.5 2.6h-3l-.5-2.6-1.6-.7-2.2 1.5-2.1-2.1 1.5-2.2-.7-1.6L2.3 13.5v-3L4.9 10l.7-1.6-1.5-2.2 2.1-2.1 2.2 1.5L10 4.9z",
    "bricks": "M3 5h18v4H3zm0 5h8v4H3zm9 0h9v4h-9zM3 15h5v4H3zm6 0h9v4H9zm10 0h2v4h-2z",
    "chart": "M4 20V4h2v14h14v2zm4-4v-5h3v5zm5 0V7h3v9zm5 0v-3h3v3z",
    "shield": "M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5z",
    "puzzle": "M10 3a2 2 0 1 1 4 0v2h4a1 1 0 0 1 1 1v4h-2a2 2 0 1 0 0 4h2v4a1 1 0 0 1-1 1h-4v-2a2 2 0 1 0-4 0v2H6a1 1 0 0 1-1-1v-4h2a2 2 0 1 0 0-4H5V6a1 1 0 0 1 1-1h4z",
    "map": "M3 5.5l6-2.5 6 2.5 6-2.5v15.5l-6 2.5-6-2.5-6 2.5zm7 .1V17l4 1.7V7.3z",
    "tag": "M3 4a1 1 0 0 1 1-1h7.6a1 1 0 0 1 .7.3l8.4 8.4a1 1 0 0 1 0 1.4l-7.6 7.6a1 1 0 0 1-1.4 0L3.3 12.3a1 1 0 0 1-.3-.7zm4.5 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z",
    "circle": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 2a7 7 0 1 1 0 14 7 7 0 0 1 0-14z",
    "bot": "M11 2h2v3h4a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h4zM8.5 10a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM9 15v2h6v-2z",
    "chat": "M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 0-1z",
    "brain": "M9 3a3.5 3.5 0 0 0-3.4 2.7A3.5 3.5 0 0 0 4 9a3.5 3.5 0 0 0 1 2.4A3.5 3.5 0 0 0 5 16a3.5 3.5 0 0 0 4 2.9V21h2V4.5A1.5 1.5 0 0 0 9 3zm6 0a1.5 1.5 0 0 0-2 1.5V21h2v-2.1A3.5 3.5 0 0 0 19 16a3.5 3.5 0 0 0 0-4.6A3.5 3.5 0 0 0 20 9a3.5 3.5 0 0 0-1.6-3.3A3.5 3.5 0 0 0 15 3z",
    "trend": "M3.5 18.5 9 13l4 4 7.2-8.3L22 10V4h-6l1.8 1.7L12.9 11l-4-4L2 14z",
    "target": "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 2.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z",
    "microscope": "M8 2h4l1 2-1 .5V11l-3 1V4.5L8 4zM6 20h12v2H6zm1-3a5 5 0 0 1 5-5 5 5 0 0 1 5 5h-2a3 3 0 0 0-6 0z",
    "warning": "M12 2 1 21h22zM11 9h2v6h-2zm0 8h2v2h-2z",
    "flask": "M9 2h6v2h-1v5.3l5.6 9.7A1.5 1.5 0 0 1 18.3 21H5.7a1.5 1.5 0 0 1-1.3-2.3L10 9.3V4H9zm2 2v6l-1.2 2h4.4L13 10V4z",
}

# Texto de apoyo para el tema: `icono` y `emoji` ya no los redacta el LLM; las
# plantillas con iconos por ítem toman estos nombres por orden.
CYCLE_GLOSSARY = ("book", "key", "database", "gear", "search", "bricks", "chart", "shield", "clock", "puzzle")
CYCLE_INFOGRAPHIC = ("brain", "database", "bolt", "lock", "trend", "puzzle")


def icon(name: str, size: str = "1.1em") -> str:
    """SVG en línea (decorativo): hereda el color del texto."""
    return (
        f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" fill="currentColor" fill-rule="evenodd" '
        f'aria-hidden="true" focusable="false" style="vertical-align:-.15em"><path d="{PATHS[name]}"/></svg>'
    )


_JS_CALL = re.compile(r"ovaIcon\(\s*'([a-z-]+)'\s*\)")


def js_prelude(js: str) -> str:
    """Define `ovaIcon(nombre)` en el JS de una plantilla, solo con los iconos
    que ese JS pide (no se embebe el catálogo completo en cada recurso)."""
    names = sorted(set(_JS_CALL.findall(js)))
    if not names:
        return ""
    table = ",".join(f"'{n}':'{icon(n).replace(chr(39), chr(34))}'" for n in names)
    return f"var OVA_ICONS={{{table}}};function ovaIcon(n){{return OVA_ICONS[n]||'';}}\n"
