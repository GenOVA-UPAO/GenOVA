"""Configuración de despliegue y CI del repositorio (fuera del código Python).

Pruebas estáticas sobre ficheros que ningún otro test toca: nginx del
`pnpm prod:docker`, .dockerignore, render.yaml, workflows y hooks de git. Cada
una fija un fallo real que pasó desapercibido porque el despliegue o el job
«parecía» funcionar.

Uso:  pytest tests/test_infra_config.py -v
"""

import re
from pathlib import Path

import yaml

REPO = Path(__file__).resolve().parents[2]


def _read(rel: str) -> str:
    return (REPO / rel).read_text(encoding="utf-8")


# ── Gateway nginx de `pnpm prod:docker` ───────────────────────────────────────


def _nginx_locations(conf: str) -> dict[str, str]:
    """Devuelve {cabecera de location: cuerpo} (sin bloques anidados)."""
    return {
        m.group(1).strip(): m.group(2) for m in re.finditer(r"location\s+([^{]+)\{([^}]*)\}", conf)
    }


def test_nginx_enruta_api_al_backend():
    locations = _nginx_locations(_read("frontend/nginx.conf"))
    proxied = {
        head: body for head, body in locations.items() if "proxy_pass http://backend:8000" in body
    }
    # Las rutas que el SPA llama deben llegar al backend, no al fallback SPA.
    for path in ("/api/auth/login", "/api/jobs/1/stream", "/lti/launch", "/auth/login"):
        assert any(
            head.startswith("~") and re.search(head.split(None, 1)[1], path) for head in proxied
        ), f"{path} no se reenvía al backend"
    assert "= /health" in proxied


def test_backend_de_prod_docker_no_se_publica_fuera_del_gateway():
    backend = yaml.safe_load(_read("docker-compose.prod.yml"))["services"]["backend"]
    assert all(str(port).startswith("127.0.0.1:") for port in backend.get("ports", []))
