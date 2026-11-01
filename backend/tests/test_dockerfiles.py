"""Endurecimiento de las imágenes de producción (web y worker arq).

Builds reproducibles (sin `:latest`), sin caché de wheels en la capa, sin correr
como root y con la misma versión de Python que prueba CI.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
PROD_IMAGES = ["Dockerfile.prod", "Dockerfile.worker"]


def _instructions(name: str) -> list[str]:
    lines = (BACKEND / name).read_text(encoding="utf-8").splitlines()
    return [ln.strip() for ln in lines if ln.strip() and not ln.strip().startswith("#")]


@pytest.mark.parametrize("name", ["Dockerfile", *PROD_IMAGES])
def test_sin_imagenes_latest(name):
    lines = _instructions(name)
    images = [ln.split()[1] for ln in lines if ln.startswith("FROM ")]
    images += re.findall(r"--from=(\S+)", "\n".join(lines))
    assert images
    assert all(":" in img and not img.endswith(":latest") for img in images), images


@pytest.mark.parametrize("name", PROD_IMAGES)
def test_imagen_de_produccion_endurecida(name):
    lines = _instructions(name)
    installs = [ln for ln in lines if "uv pip install" in ln]
    assert installs and all("--no-cache" in ln for ln in installs)
    users = [ln for ln in lines if ln.startswith("USER ")]
    assert users and users[-1] not in ("USER root", "USER 0")
    # El usuario sin root se fija antes del CMD.
    cmd_at = next(i for i, ln in enumerate(lines) if ln.startswith("CMD"))
    assert lines.index(users[-1]) < cmd_at


@pytest.mark.parametrize("name", PROD_IMAGES)
def test_python_de_la_imagen_es_el_de_ci(name):
    ci = (BACKEND.parent / ".github" / "workflows" / "ci.yml").read_text(encoding="utf-8")
    ci_versions = set(re.findall(r"python-version:\s*'([\d.]+)'", ci))
    base = next(ln for ln in _instructions(name) if ln.startswith("FROM"))
    assert re.search(r"python:([\d.]+)", base).group(1) in ci_versions
