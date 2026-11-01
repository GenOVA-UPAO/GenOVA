"""El backend de compose se construye en linux/amd64 también en hosts ARM.

quickjs (validación JS de los OVAs) no publica wheel linux/aarch64 y la imagen
python slim no trae compilador: en Apple Silicon `pnpm dev:docker` /
`pnpm prod:docker` fallaban al instalar dependencias.
"""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parents[2]


def _backend_services(compose: str) -> list[dict]:
    data = yaml.safe_load((ROOT / compose).read_text(encoding="utf-8"))
    services = []
    for svc in (data.get("services") or {}).values():
        build = svc.get("build") or {}
        target = build if isinstance(build, str) else f"{build.get('context')}/{build.get('dockerfile')}"
        if "backend" in target:
            services.append(svc)
    return services


@pytest.mark.parametrize("compose", ["docker-compose.yml", "docker-compose.prod.yml"])
def test_backend_fija_plataforma_amd64(compose):
    services = _backend_services(compose)
    assert services
    assert all(svc.get("platform") == "linux/amd64" for svc in services)
