"""El .dockerignore de la raíz deja fuera los secretos y datos locales del backend.

backend/Dockerfile.prod y Dockerfile.worker se construyen con la raíz del repo como
contexto (render.yaml, docker-compose.prod.yml) y hacen `COPY backend/ .`: Docker
solo lee el .dockerignore del contexto, no backend/.dockerignore, así que
backend/.env (DATABASE_URL, JWT_SECRET, claves LLM…) acababa dentro de la imagen.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]


def _rules() -> list[tuple[bool, re.Pattern[str]]]:
    rules = []
    for raw in (ROOT / ".dockerignore").read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        negate = line.startswith("!")
        pattern = line[1:] if negate else line
        rules.append((negate, re.compile(_to_regex(pattern.strip("/")))))
    return rules


def _to_regex(pattern: str) -> str:
    """Patrón de .dockerignore (Go filepath.Match + `**`) → regex de ruta completa."""
    out, i = "", 0
    while i < len(pattern):
        if pattern.startswith("**/", i):
            out, i = out + "(?:.*/)?", i + 3
        elif pattern.startswith("**", i):
            out, i = out + ".*", i + 2
        elif pattern[i] == "*":
            out, i = out + "[^/]*", i + 1
        elif pattern[i] == "?":
            out, i = out + "[^/]", i + 1
        else:
            out, i = out + re.escape(pattern[i]), i + 1
    return f"^{out}$"


def _excluded(path: str) -> bool:
    """Como Docker: gana la última regla que case; un directorio excluido arrastra su
    contenido."""
    parts = path.split("/")
    prefixes = ["/".join(parts[: n + 1]) for n in range(len(parts))]
    excluded = False
    for negate, rx in _rules():
        if any(rx.match(p) for p in prefixes):
            excluded = not negate
    return excluded


@pytest.mark.parametrize(
    "path",
    [
        "backend/.env",
        "backend/.env.local",
        "backend/.venv/lib/python3.12/site-packages/x.py",
        "backend/ova/scorm_output/abc.zip",
        "backend/tmp/upload.pdf",
        "backend/tests/conftest.py",
        "backend/core/__pycache__/config.cpython-312.pyc",
    ],
)
def test_contexto_raiz_excluye(path):
    assert _excluded(path)


@pytest.mark.parametrize(
    "path",
    ["backend/main.py", "backend/requirements.txt", "backend/core/config.py", "backend/.env.example"],
)
def test_contexto_raiz_conserva_el_codigo(path):
    assert not _excluded(path)
