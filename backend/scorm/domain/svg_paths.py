"""Corrección de trazados SVG mal formados antes de empaquetar.

El modelo a veces deja un `<path d="…">` cortado: el valor del atributo `d` se
mezcla con el texto de la página (p. ej. `d="M11 4h2… a3.5 3.5 a la trazabilidad…"`).
El navegador dibuja el icono hasta el primer error, pero registra
`Error: <path> attribute d: Expected number` en la consola, y eso incumple el
criterio de ejecución sin errores. Aquí se recorta cada `d` estático hasta el último
comando completo; los trazados correctos y los generados por JS (`${…}`) no cambian.
"""

from __future__ import annotations

import re

# Argumentos por comando de trazado SVG; Z no lleva ninguno.
_ARGS_PER_COMMAND = {
    "m": 2, "l": 2, "h": 1, "v": 1, "c": 6, "s": 4, "q": 4, "t": 2, "a": 7, "z": 0,
}
_NUMBER = re.compile(r"[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?")
_ARC_FLAG = re.compile(r"[01]")
_SEPARATORS = re.compile(r"[\s,]*")
_PATH_D = re.compile(
    r"""(?P<head><path\b[^>]*?\sd\s*=\s*)(?P<q>["'])(?P<d>.*?)(?P=q)""",
    re.IGNORECASE | re.DOTALL,
)


def valid_path_prefix(d: str) -> str:
    """Devuelve la parte inicial de `d` formada solo por comandos completos y válidos."""
    pos, size, last_good = 0, len(d), 0
    command = ""
    while True:
        pos = _SEPARATORS.match(d, pos).end()
        if pos >= size:
            return d[:last_good].strip()
        char = d[pos]
        if char.lower() in _ARGS_PER_COMMAND:
            command = char
            pos += 1
            if char.lower() == "z":
                last_good = pos
                continue
        elif not command or command.lower() == "z":
            # Número sin comando previo (o tras Z): no es un trazado válido.
            return d[:last_good].strip()
        # Un grupo de argumentos del comando actual (los comandos se pueden repetir
        # sin volver a escribir la letra).
        count = _ARGS_PER_COMMAND[command.lower()]
        cursor = pos
        for index in range(count):
            cursor = _SEPARATORS.match(d, cursor).end()
            is_flag = command.lower() == "a" and index in (3, 4)
            match = (_ARC_FLAG if is_flag else _NUMBER).match(d, cursor)
            if match is None:
                return d[:last_good].strip()
            cursor = match.end()
        pos = last_good = cursor


def repair_svg_paths(html: str) -> str:
    """Recorta los atributos `d` inválidos de los `<path>` estáticos del HTML."""

    def fix(match: re.Match) -> str:
        d = match.group("d")
        if "${" in d or "{{" in d:
            return match.group(0)  # trazado armado por JS o por plantilla
        clean = valid_path_prefix(d)
        if clean == d.strip():
            return match.group(0)
        q = match.group("q")
        return f"{match.group('head')}{q}{clean}{q}"

    return _PATH_D.sub(fix, html)
