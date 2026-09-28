"""Paleta del docente («Personalizado» en «Estilo de mis OVAs»).

El docente elige solo dos colores, primario y acento. De ellos se derivan las
mismas variables :root que la paleta UPAO (tintes, hover, texto, bordes), así
la hoja base, los componentes UPAO y las reglas del prompt funcionan igual con
cualquier paleta. Los colores que llevan texto se oscurecen hasta cumplir el
contraste WCAG AA (4,5:1) sobre blanco: muchas paletas traen acentos claros
(celeste, menta, lavanda) que no sirven como fondo de un botón con texto blanco.
"""

from __future__ import annotations

import re

_HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
_WHITE = (255, 255, 255)
_BLACK = (0, 0, 0)
_AA = 4.5


def normalize_palette(raw: object) -> dict | None:
    """{"primary": "#RRGGBB", "accent": "#RRGGBB"} o None si no es una paleta válida."""
    if not isinstance(raw, dict):
        return None
    primary, accent = raw.get("primary"), raw.get("accent")
    if not (isinstance(primary, str) and _HEX.match(primary)):
        return None
    if not (isinstance(accent, str) and _HEX.match(accent)):
        return None
    name = raw.get("name")
    return {
        "name": name[:40] if isinstance(name, str) else "",
        "primary": primary.upper(),
        "accent": accent.upper(),
    }


def _rgb(color: str) -> tuple[int, int, int]:
    return int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)


def _hex(rgb: tuple[float, float, float]) -> str:
    return "#" + "".join(f"{round(max(0, min(255, c))):02X}" for c in rgb)


def _mix(color: str, other: tuple[int, int, int], amount: float) -> str:
    """`color` mezclado con `other` (0 = color, 1 = other)."""
    return _hex(tuple(c + (o - c) * amount for c, o in zip(_rgb(color), other, strict=True)))


def _luminance(color: str) -> float:
    def channel(c: int) -> float:
        s = c / 255
        return s / 12.92 if s <= 0.03928 else ((s + 0.055) / 1.055) ** 2.4

    r, g, b = (channel(c) for c in _rgb(color))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_on_white(color: str) -> float:
    return 1.05 / (_luminance(color) + 0.05)


def _readable(color: str) -> str:
    """`color` oscurecido lo justo para leerse sobre blanco (AA)."""
    amount = 0.0
    shade = color
    while contrast_on_white(shade) < _AA and amount < 1:
        amount += 0.05
        shade = _mix(color, _BLACK, amount)
    return shade


def palette_vars(palette: dict) -> dict:
    """Variables :root (mismas claves que UPAO_PALETTE) a partir de primario y acento."""
    primary = _readable(palette["primary"])
    accent = palette["accent"].upper()
    action = _readable(accent)
    text = _mix(primary, _BLACK, 0.55)
    r, g, b = _rgb(primary)
    return {
        "bg": _mix(primary, _WHITE, 0.97),
        "surface": "#FFFFFF",
        "surface_tint": _mix(primary, _WHITE, 0.9),
        "primary": primary,
        "primary_hover": _mix(primary, _BLACK, 0.2),
        "accent": accent,
        "accent_hover": _mix(accent, _BLACK, 0.12),
        "accent_tint": _mix(accent, _WHITE, 0.85),
        "action": action,
        "action_hover": _mix(action, _BLACK, 0.18),
        "text": text,
        "text_muted": _readable(_mix(text, _WHITE, 0.4)),
        "border": _mix(primary, _WHITE, 0.88),
        "success": "#146C49",
        "danger": "#B42332",
        "radius": "14px",
        "shadow": f"0 6px 20px rgba({r},{g},{b},.08)",
    }
