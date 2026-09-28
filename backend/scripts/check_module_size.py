#!/usr/bin/env python3
"""Aviso (no bloqueante) de módulos `.py` demasiado grandes.

Convención de tamaño (readme §Convenciones): un archivo entre 200 y 400 líneas de
código está bien; por encima de 400 suele tener demasiadas responsabilidades.
No rompe el build — imprime los infractores para disparar una revisión.
Uso: `python scripts/check_module_size.py` desde `backend/`.
"""

from __future__ import annotations

import sys
from pathlib import Path

MAX_LINES = 400
EXCLUDE_DIRS = {".venv", "venv", "migrations", "tests", "scripts", "__pycache__"}
EXCLUDE_GLOBS = ("prometheus/prompts/*", "**/*_data.py", "llm/catalog/providers_data.py")


def code_lines(path: Path) -> int:
    n = 0
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        s = raw.strip()
        if s and not s.startswith("#"):
            n += 1
    return n


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    offenders: list[tuple[str, int]] = []
    for path in sorted(root.rglob("*.py")):
        rel = path.relative_to(root)
        if EXCLUDE_DIRS & set(rel.parts):
            continue
        if any(rel.match(g) for g in EXCLUDE_GLOBS):
            continue
        n = code_lines(path)
        if n > MAX_LINES:
            offenders.append((rel.as_posix(), n))

    if offenders:
        print(f"[check-module-size] {len(offenders)} módulo(s) > {MAX_LINES} líneas de código (revisar, no bloquea):")
        for name, n in offenders:
            print(f"  {n:4d}  {name}")
    else:
        print(f"[check-module-size] OK — ningún módulo supera {MAX_LINES} líneas de código.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
