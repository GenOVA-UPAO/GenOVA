#!/usr/bin/env python3
"""Sincroniza/verifica los pines de dependencias directas entre
``backend/pyproject.toml`` (``[project].dependencies``) y ``backend/requirements.txt``.

``pyproject.toml`` es la FUENTE de verdad (uv lo lee para generar ``uv.lock``).
``requirements.txt`` se mantiene para usuarios de pip / deploys sin uv, pero debe
reflejar exactamente los mismos pines.

Uso (desde backend/):
  python scripts/sync_deps.py            # = --check
  python scripts/sync_deps.py --check    # CI/verify: sale 1 si difieren (no escribe)
  python scripts/sync_deps.py --write    # regenera requirements.txt desde pyproject

Flujo al actualizar versiones:
  1) editar los pines en pyproject.toml
  2) python scripts/sync_deps.py --write   (regenera requirements.txt)
  3) uv lock                               (regenera uv.lock)

No usa dependencias externas ni tomllib (corre en cualquier Python 3.8+).
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
PYPROJECT = BACKEND / "pyproject.toml"
REQUIREMENTS = BACKEND / "requirements.txt"

# nombre[+extras] seguido (opcional) del especificador de versión
_SPEC_RE = re.compile(
    r"^(?P<name>[A-Za-z0-9_.-]+(?:\[[A-Za-z0-9_,.\- ]+\])?)\s*(?P<ver>[<>=!~].*)?$"
)


def _norm(name: str) -> str:
    """Clave canónica PEP 503 conservando extras (p.ej. ``uvicorn[standard]``)."""
    base, sep, extras = name.partition("[")
    base = re.sub(r"[-_.]+", "-", base).lower()
    return f"{base}{sep}{extras}" if sep else base


def _parse_specs(lines: list[str]) -> tuple[dict[str, str], list[str]]:
    """Devuelve (mapa clave→spec, lista de specs en orden de aparición)."""
    deps: dict[str, str] = {}
    order: list[str] = []
    for raw in lines:
        spec = raw.split("#", 1)[0].strip()
        if not spec or spec.startswith("-"):  # ignora '-r', '-e', flags
            continue
        m = _SPEC_RE.match(spec)
        if not m:
            continue
        deps[_norm(m.group("name"))] = spec
        order.append(spec)
    return deps, order


def parse_pyproject() -> tuple[dict[str, str], list[str]]:
    txt = PYPROJECT.read_text(encoding="utf-8")
    # Cierra en el ']' del array (a inicio de línea), no en el de un extra
    # como 'uvicorn[standard]'.
    m = re.search(r"\ndependencies\s*=\s*\[(.*?)\n\s*\]", txt, re.DOTALL)
    if not m:
        sys.exit("ERROR: no se encontró [project].dependencies en pyproject.toml")
    quoted = re.findall(r'"([^"]+)"', m.group(1))
    return _parse_specs(quoted)


def parse_requirements() -> dict[str, str]:
    if not REQUIREMENTS.exists():
        return {}
    deps, _ = _parse_specs(REQUIREMENTS.read_text(encoding="utf-8").splitlines())
    return deps


def render_requirements(order: list[str]) -> str:
    header = (
        "# Auto-generado desde pyproject.toml — NO editar a mano.\n"
        "# Regenera con: python scripts/sync_deps.py --write\n"
    )
    return header + "\n".join(order) + "\n"


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else "--check"
    if mode not in ("--check", "--write"):
        sys.exit(f"Modo desconocido: {mode} (usa --check o --write)")

    pp, order = parse_pyproject()

    if mode == "--write":
        REQUIREMENTS.write_text(render_requirements(order), encoding="utf-8")
        print(f"OK: requirements.txt regenerado desde pyproject ({len(order)} deps).")
        print("Recuerda: 'uv lock' para sincronizar uv.lock.")
        return 0

    rq = parse_requirements()
    diffs = [
        (k, pp.get(k), rq.get(k))
        for k in sorted(set(pp) | set(rq))
        if pp.get(k) != rq.get(k)
    ]
    if diffs:
        print("DRIFT detectado entre pyproject.toml y requirements.txt:")
        for k, a, b in diffs:
            print(f"  {k}: pyproject={a or '—'}  requirements={b or '—'}")
        print("\nArréglalo con: python scripts/sync_deps.py --write")
        return 1
    print(f"OK: paridad correcta ({len(pp)} deps idénticas en ambos archivos).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
