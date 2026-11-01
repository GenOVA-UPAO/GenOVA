"""Configuración de despliegue y CI del repositorio (fuera del código Python).

Pruebas estáticas sobre ficheros que ningún otro test toca: nginx del
`pnpm prod:docker`, .dockerignore, render.yaml, workflows y hooks de git. Cada
una fija un fallo real que pasó desapercibido porque el despliegue o el job
«parecía» funcionar.

Uso:  pytest tests/test_infra_config.py -v
"""

import json
import re
import subprocess
import sys
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
        tuberia = "| tee" in script or re.search(r"\$\(curl[^)]*(?<!\|)\|(?!\|)", script)
        if tuberia and shell != "bash" and "set -o pipefail" not in script:
            malos.append(f"{workflow}:{job_name}:{step.get('name', script[:40])}")
    return malos


def test_ningun_paso_con_tuberia_oculta_su_fallo():
    workflows = sorted(p.name for p in (REPO / ".github/workflows").glob("*.yml"))
    assert "load-test.yml" in workflows and "ci.yml" in workflows
    assert [paso for w in workflows for paso in _sin_pipefail(w)] == []


def test_api_contract_falla_si_el_login_seed_no_da_token():
    auth = next(
        step
        for job, step, _shell in _run_steps("ci.yml")
        if job == "api-contract" and step.get("id") == "auth"
    )
    assert '"$TOKEN" != null' in auth["run"] and "exit 1" in auth["run"]


def test_load_test_solo_exporta_variables_que_lee_el_locustfile():
    locustfile = _read("tests/load/locustfile.py")
    for _job, step, _shell in _run_steps("load-test.yml"):
        for var in step.get("env", {}):
            if var.startswith("LOAD_"):
                assert f'"{var}"' in locustfile, f"{var} no lo lee tests/load/locustfile.py"


# ── Hook pre-push: fronteras de arquitectura ──────────────────────────────────


def test_pre_push_import_linter_falla_con_un_contrato_roto(tmp_path):
    hook = _read(".husky/pre-push")
    assert "-m importlinter" not in hook and "run_backend_tool importlinter" not in hook
    match = re.search(r"^run_backend_python importlinter -c '([^']+)'$", hook, re.M)
    assert match, "el pre-push no ejecuta import-linter"

    # Paquete de juguete con una importación prohibida por su propio contrato.
    pkg = tmp_path / "juguete"
    (pkg / "dominio").mkdir(parents=True)
    (pkg / "__init__.py").write_text("")
    (pkg / "infra.py").write_text("")
    (pkg / "dominio" / "__init__.py").write_text("from juguete import infra  # noqa\n")
    (tmp_path / ".importlinter").write_text(
        "[importlinter]\nroot_package = juguete\n\n"
        "[importlinter:contract:dominio-puro]\nname = dominio puro\ntype = forbidden\n"
        "source_modules = juguete.dominio\nforbidden_modules = juguete.infra\n"
    )
    result = subprocess.run(
        [sys.executable, "-c", match.group(1)],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert result.returncode != 0, result.stdout + result.stderr
    assert "BROKEN" in result.stdout


def test_render_despliega_main_solo_si_pasan_los_checks():
    for service in yaml.safe_load(_read("render.yaml"))["services"]:
        if service.get("branch") == "main":
            assert service.get("autoDeployTrigger") == "checksPass", service["name"]


# ── `pnpm dev:docker` ─────────────────────────────────────────────────────────


def test_dev_docker_renueva_el_node_modules_anonimo():
    # Compose conserva los volúmenes anónimos al recrear: sin -V el node_modules
    # viejo tapa las dependencias recién instaladas en la imagen.
    frontend = yaml.safe_load(_read("docker-compose.yml"))["services"]["frontend"]
    if "/app/node_modules" in frontend.get("volumes", []):
        script = json.loads(_read("package.json"))["scripts"]["dev:docker"]
        assert "--renew-anon-volumes" in script or " -V" in script
