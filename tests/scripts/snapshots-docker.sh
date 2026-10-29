#!/usr/bin/env bash
# Regenera las capturas de referencia de tests/templates en la MISMA imagen que usa CI
# (mcr.microsoft.com/playwright:v1.63.0-noble), para que no dependan del SO del que las
# genera. Sin bind mounts (fallan con rutas de WSL/Windows): todo entra y sale por tar.
#
# Uso (desde cualquier carpeta):
#   tests/scripts/snapshots-docker.sh                       # solo las que cambian
#   MODE=all tests/scripts/snapshots-docker.sh              # todas (ver tests/README.md)
#   tests/scripts/snapshots-docker.sh -g "explain-02"       # solo las que coinciden con -g
#
# Variables: MODE (changed|all|missing|none, por defecto changed), IMAGE, BACKEND_PYTHON.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE="${IMAGE:-mcr.microsoft.com/playwright:v1.63.0-noble}"
MODE="${MODE:-changed}"

# docker.exe (Docker Desktop desde WSL) o docker (Linux/macOS). En WSL se prefiere
# docker.exe: un wrapper `docker` que redirige stdin a /dev/null rompería `docker cp -`.
if command -v docker.exe >/dev/null 2>&1; then
  DOCKER=docker.exe
elif command -v docker >/dev/null 2>&1; then
  DOCKER=docker
else
  echo "No se encontró docker ni docker.exe en el PATH." >&2
  exit 1
fi

# Python del backend: el indicado, el .venv del repo o el del repo principal, o python3.
PY="${BACKEND_PYTHON:-}"
if [ -z "$PY" ]; then
  for cand in "$ROOT/backend/.venv/bin/python" "$HOME/github/GenOVA/backend/.venv/bin/python"; do
    if [ -x "$cand" ]; then PY="$cand"; break; fi
  done
fi
PY="${PY:-python3}"

GREP_ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    -g | --grep) GREP_ARGS=(-g "$2"); shift 2 ;;
    *) echo "Argumento desconocido: $1 (usa -g <patrón>)" >&2; exit 2 ;;
  esac
done

STAGE="$(mktemp -d)"
CID=""
cleanup() {
  [ -n "$CID" ] && "$DOCKER" rm -f "$CID" >/dev/null 2>&1 || true
  rm -rf "$STAGE"
}
trap cleanup EXIT

echo "==> Renderizando las fixtures"
(cd "$ROOT" && "$PY" backend/scripts/ova_engine_render.py tests/.ova-rendered --fixtures >/dev/null)

echo "==> Preparando el stage"
mkdir -p "$STAGE/tests" "$STAGE/backend/tests/fixtures"
cp -r "$ROOT/tests/templates" "$STAGE/tests/templates"
cp "$ROOT/tests/playwright.templates.config.js" "$STAGE/tests/"
cp -r "$ROOT/tests/.ova-rendered" "$STAGE/tests/.ova-rendered"
cp -r "$ROOT/backend/tests/fixtures/ova_engine" "$STAGE/backend/tests/fixtures/ova_engine"
echo '{"type":"module"}' >"$STAGE/tests/package.json"

echo "==> Creando el contenedor ($IMAGE)"
CID="$("$DOCKER" create -w /stage/tests "$IMAGE" sleep infinity | tr -d '\r')"
"$DOCKER" start "$CID" >/dev/null
tar -C "$STAGE" -cf - . | "$DOCKER" cp - "$CID:/stage"

echo "==> Instalando @playwright/test y axe"
"$DOCKER" exec -w /stage/tests "$CID" npm i --no-audit --no-fund --silent \
  @playwright/test@1.63.0 @axe-core/playwright@4.13.0

echo "==> Regenerando capturas (--update-snapshots=$MODE)"
"$DOCKER" exec -w /stage/tests "$CID" npx playwright test \
  --config playwright.templates.config.js "--update-snapshots=$MODE" "${GREP_ARGS[@]}" || {
  echo "Playwright terminó con errores; se copian igualmente las capturas generadas." >&2
}

echo "==> Copiando las capturas de vuelta"
OUT="$STAGE/out"
mkdir -p "$OUT"
"$DOCKER" cp "$CID:/stage/tests/templates/snapshots/." - | tar -x -C "$OUT"
cp -r "$OUT"/. "$ROOT/tests/templates/snapshots/"

echo "Listo. Revisa los cambios con: git -C $ROOT status --short tests/templates/snapshots"
