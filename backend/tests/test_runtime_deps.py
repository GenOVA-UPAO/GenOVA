"""Cada import de terceros del código de producción sale de requirements.txt.

Las imágenes Docker instalan solo requirements.txt; un paquete declarado solo en el
extra ``dev`` (como pasó con beautifulsoup4 y el editor visual) arranca bien en CI
y en local pero rompe en producción con ModuleNotFoundError al primer uso.
"""

from __future__ import annotations

import ast
import re
import sys
from importlib import metadata
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
# Fuera de la imagen de producción.
_NOT_RUNTIME = {"tests", "scripts", "tools", "migrations", ".venv"}
# Opcionales a propósito (requirements-clip.txt / embedder local): se importan dentro
# de un try y la función se desactiva si faltan.
_OPTIONAL = {"torch", "open_clip", "sentence_transformers"}


def _norm(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


def _base_name(spec: str) -> str:
    return _norm(re.split(r"[\[<>=!~ ;(]", spec.strip(), maxsplit=1)[0])


def _runtime_closure() -> set[str]:
    """Distribuciones de requirements.txt más sus dependencias (sin extras)."""
    lines = (BACKEND / "requirements.txt").read_text(encoding="utf-8").splitlines()
    pending = [_base_name(s) for s in (ln.split("#", 1)[0] for ln in lines) if s.strip()]
    pending = [p for p in pending if p and not p.startswith("-")]
    seen: set[str] = set()
    while pending:
        name = pending.pop()
        if name in seen:
            continue
        seen.add(name)
        try:
            requires = metadata.requires(name) or []
        except metadata.PackageNotFoundError:
            continue
        pending.extend(_base_name(r) for r in requires if "extra ==" not in r)
    return seen


def _top_level_imports(path: Path) -> set[str]:
    tops: set[str] = set()
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
        if isinstance(node, ast.Import):
            tops.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
            tops.add(node.module.split(".")[0])
    return tops


def _missing_runtime_imports() -> dict[str, list[str]]:
    closure = _runtime_closure()
    dists_by_module = metadata.packages_distributions()
    local = {p.name for p in BACKEND.iterdir() if p.is_dir()} | {
        p.stem for p in BACKEND.glob("*.py")
    }
    missing: dict[str, list[str]] = {}
    for path in BACKEND.rglob("*.py"):
        rel = path.relative_to(BACKEND)
        if rel.parts[0] in _NOT_RUNTIME:
            continue
        for top in _top_level_imports(path):
            if top in sys.stdlib_module_names or top in local or top in _OPTIONAL:
                continue
            if not {_norm(d) for d in dists_by_module.get(top, [])} & closure:
                missing.setdefault(top, []).append(str(rel))
    return missing


def test_bs4_es_dependencia_de_runtime():
    # ova_engine/block_parser.py (editor visual por bloques) hace `from bs4 import ...`.
    assert "beautifulsoup4" in _runtime_closure()


def test_imports_de_produccion_cubiertos_por_requirements():
    assert _missing_runtime_imports() == {}
