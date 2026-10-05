"""Temas de presentación offline, independientes del tema de generación de la IA."""

from __future__ import annotations

import re
from typing import Literal

PackageThemeId = Literal["upao", "claro", "oscuro", "alto-contraste", "infantil"]

_BASE = {
    "bg": "#F7F9FC", "surface": "#FFFFFF", "surface-tint": "#EAF0FB",
    "primary": "#0A3D91", "primary-hover": "#072C6B",
    "accent": "#F47A20", "accent-hover": "#D9650F", "accent-tint": "#FDEEE0",
    "action": "#B84B00", "action-hover": "#923B00",
    "text": "#15233B", "text-muted": "#52617A", "border": "#94A3B8",
    "success": "#146C49", "danger": "#B42332", "radius": "14px",
    "success-bg": "#EAF7F1", "danger-bg": "#FBEDED",
    "shadow": "0 6px 20px rgba(10,61,145,.08)",
    "font-body": 'system-ui,-apple-system,"Segoe UI",Arial,sans-serif',
    "font-display": "var(--font-body)",
    "font-mono": "ui-monospace,Menlo,monospace",
    "on-primary": "#FFFFFF", "on-action": "#FFFFFF",
    **{f"space-{i}": f"{size}px" for i, size in enumerate((8, 12, 16, 24, 32, 48), 1)},
}

THEME_LABELS = {
    "upao": "UPAO", "claro": "Claro", "oscuro": "Oscuro",
    "alto-contraste": "Alto contraste", "infantil": "Infantil",
}

# --primary se usa tanto en texto como en fondos con letras blancas en recursos
# antiguos. El gris del tema oscuro conserva AA en ambos usos sobre negro.
PACKAGE_THEMES = {
    "upao": dict(_BASE),
    "claro": {
        **_BASE, "bg": "#FFFFFF", "surface-tint": "#F1F5F9",
        "primary": "#334155", "primary-hover": "#1E293B", "radius": "8px",
        "shadow": "none", "accent": "#64748B", "accent-tint": "#F1F5F9",
    },
    "oscuro": {
        **_BASE, "bg": "#000000", "surface": "#000000", "surface-tint": "#000000",
        "primary": "#767676", "primary-hover": "#767676",
        "action": "#767676", "action-hover": "#767676",
        "text": "#FFFFFF", "text-muted": "#CCCCCC", "border": "#888888",
        "accent": "#FFAE60", "accent-hover": "#FFAE60", "accent-tint": "#000000",
        "success": "#767676", "danger": "#767676", "shadow": "none",
        "success-bg": "#000000", "danger-bg": "#000000",
    },
    "alto-contraste": {
        **_BASE, "bg": "#FFFFFF", "surface-tint": "#FFFFFF", "accent-tint": "#FFFFFF",
        "text": "#000000", "text-muted": "#000000", "primary": "#000000",
        "primary-hover": "#000000", "action": "#000000", "action-hover": "#000000",
        "accent": "#000000", "accent-hover": "#000000", "border": "#000000",
        "success": "#000000", "danger": "#000000", "radius": "0px", "shadow": "none",
        "success-bg": "#FFFFFF", "danger-bg": "#FFFFFF",
    },
    "infantil": {
        **_BASE, "bg": "#FFFDF5", "surface-tint": "#F0ECFF", "accent-tint": "#FFF2D6",
        "primary": "#6330A0", "primary-hover": "#492078",
        "action": "#A33C00", "action-hover": "#802D00", "accent": "#FFB800",
        "accent-hover": "#FFB800", "radius": "24px",
        "font-body": 'ui-rounded,"Arial Rounded MT Bold","Trebuchet MS",system-ui,sans-serif',
    },
}
for _tokens in PACKAGE_THEMES.values():
    _tokens["muted"] = _tokens["text-muted"]
    _tokens["focus"] = _tokens["primary"]

# Compatibilidad con la librería UPAO ya embebida en OVAs guardadas: sus fondos
# de feedback y subtítulos eran literales. Solo se adapta su firma conocida,
# nunca colores arbitrarios del HTML del docente. El catálogo comparte estas
# sustituciones con la vista previa (sin persistir ni regenerar el recurso).
RESOURCE_THEME_REPLACEMENTS = [
    ("successBg: '#DCFCE7'", "successBg: 'var(--success-bg,#DCFCE7)'"),
    ("dangerBg:  '#FEE2E2'", "dangerBg:  'var(--danger-bg,#FEE2E2)'"),
    ("color:#166534", "color:var(--success,#166534)"),
    ("color:#991b1b", "color:var(--danger,#991b1b)"),
    ("color:${T.accent};text-transform", "color:var(--on-primary,#fff);text-transform"),
    ("color:rgba(255,255,255,.72)", "color:var(--on-primary,#fff)"),
    ("color:rgba(255,255,255,.65)", "color:var(--on-primary,#fff)"),
    ("success: [T.success, '#EAF7F1'", "success: [T.success, 'var(--success-bg,#EAF7F1)'"),
    ("error: [T.danger, '#FBEDED'", "error: [T.danger, 'var(--danger-bg,#FBEDED)'"),
    (".time.warn{color:${T.accent}}", ".time.warn{color:${T.action}}"),
]


def theme_css(theme: str = "upao") -> str:
    tokens = PACKAGE_THEMES[theme]
    # Important solo en tokens: prevalece sobre :root generado, sin sustituir los
    # colores literales o estilos específicos de documentos antiguos.
    declarations = "".join(f"--{name}:{value} !important;" for name, value in tokens.items())
    return (
        f":root{{{declarations}}}"
        "body{font-family:var(--font-body)}"
        ".ova-option.is-correct,.ova-feedback--ok{background:var(--success-bg)}"
        ".ova-option.is-wrong,.ova-feedback--bad{background:var(--danger-bg)}"
    )


def inject_package_theme(html: str, theme: str = "upao") -> str:
    """Añade tokens al final del head, manteniendo scripts y markup originales."""
    html = re.sub(
        r'<style\b[^>]*\bid=[\'"]genova-package-theme[\'"][^>]*>.*?</style\s*>',
        "", html, flags=re.IGNORECASE | re.DOTALL,
    )
    def upgrade_component_script(match: re.Match) -> str:
        script = match.group(0)
        if "UPAO Components v1.0" in script:
            for old, new in RESOURCE_THEME_REPLACEMENTS:
                script = script.replace(old, new)
        return script

    html = re.sub(
        r"<script\b[^>]*>.*?</script\s*>", upgrade_component_script, html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    style = f'<style id="genova-package-theme">{theme_css(theme)}</style>'
    close_head = re.search(r"</head\s*>", html, re.IGNORECASE)
    if close_head:
        return html[:close_head.start()] + style + html[close_head.start():]
    root = re.search(r"<html\b[^>]*>", html, re.IGNORECASE)
    if root:
        return html[:root.end()] + f"<head>{style}</head>" + html[root.end():]
    return style + html


def theme_catalog() -> list[dict]:
    return [
        {
            "id": theme, "label": THEME_LABELS[theme], "tokens": tokens,
            "css": theme_css(theme), "replacements": RESOURCE_THEME_REPLACEMENTS,
        }
        for theme, tokens in PACKAGE_THEMES.items()
    ]
