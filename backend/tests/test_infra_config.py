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


# ── .dockerignore de los builds con contexto en la raíz ───────────────────────


def _dockerignore_regex(pattern: str) -> re.Pattern[str]:
    """Traduce un patrón de .dockerignore (sintaxis Go + `**`) a regex."""
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
    return re.compile(out + r"\Z")


def _docker_excluye(rules: list[str], path: str) -> bool:
    """Excluido si la última regla que casa con él o con un directorio padre excluye."""
    parts = path.split("/")
    candidates = ["/".join(parts[: n + 1]) for n in range(len(parts))]
    excluded = False
    for rule in rules:
        negated = rule.startswith("!")
        regex = _dockerignore_regex(rule.lstrip("!").strip("/"))
        if any(regex.match(c) for c in candidates):
            excluded = not negated
    return excluded


def _dockerignore_rules(dockerfile: str) -> list[str]:
    # BuildKit usa <Dockerfile>.dockerignore si existe; si no, el de la raíz.
    specific = REPO / f"{dockerfile}.dockerignore"
    source = specific if specific.exists() else REPO / ".dockerignore"
    lines = source.read_text(encoding="utf-8").splitlines()
    return [ln.strip() for ln in lines if ln.strip() and not ln.lstrip().startswith("#")]


def test_imagen_del_backend_no_lleva_secretos_ni_venv():
    for dockerfile in ("backend/Dockerfile.prod", "backend/Dockerfile.worker"):
        rules = _dockerignore_rules(dockerfile)
        for path in (
            "backend/.env",
            "backend/.env.local",
            "backend/.venv/bin/python",
            "backend/core/__pycache__/config.cpython-312.pyc",
        ):
            assert _docker_excluye(rules, path), f"{dockerfile}: {path} entra en la imagen"
        for path in ("backend/main.py", "backend/uploads/container.py", "backend/.env.example"):
            assert not _docker_excluye(rules, path), f"{dockerfile}: {path} queda fuera"


# ── render.yaml (Blueprint de producción) ─────────────────────────────────────


def _render_env(service: dict) -> dict[str, dict]:
    return {var["key"]: var for var in service.get("envVars", []) if "key" in var}


def test_render_fija_lti_tool_url_https_en_produccion():
    for service in yaml.safe_load(_read("render.yaml"))["services"]:
        env = _render_env(service)
        if env.get("ENV", {}).get("value") != "production":
            continue
        assert str(env.get("LTI_TOOL_URL", {}).get("value", "")).startswith("https://")


# ── Workflows de GitHub Actions ───────────────────────────────────────────────


def _run_steps(workflow: str):
    data = yaml.safe_load(_read(f".github/workflows/{workflow}"))
    defaults = (data.get("defaults") or {}).get("run", {}).get("shell")
    for job_name, job in data["jobs"].items():
        job_shell = (job.get("defaults") or {}).get("run", {}).get("shell", defaults)
        for step in job.get("steps", []):
            if "run" in step:
                yield job_name, step, step.get("shell", job_shell)


def _sin_pipefail(workflow: str) -> list[str]:
    """Pasos con tuberías cuyo estado es el del último comando (bash -e sin pipefail)."""
    malos = []
    for job_name, step, shell in _run_steps(workflow):
        script = step["run"]
        tuberia = "| tee" in script or re.search(r"\$\(curl[^)]*\|", script)
        if tuberia and shell != "bash" and "set -o pipefail" not in script:
            malos.append(f"{workflow}:{job_name}:{step.get('name', script[:40])}")
    return malos


def test_load_test_el_gate_rn001_puede_fallar():
    assert _sin_pipefail("load-test.yml") == []


def test_load_test_solo_exporta_variables_que_lee_el_locustfile():
    locustfile = _read("tests/load/locustfile.py")
    for _job, step, _shell in _run_steps("load-test.yml"):
        for var in step.get("env", {}):
            if var.startswith("LOAD_"):
                assert f'"{var}"' in locustfile, f"{var} no lo lee tests/load/locustfile.py"
