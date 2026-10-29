#!/usr/bin/env bash
set -euo pipefail
# Ejecutar desde la raíz del worktree. El trap solo apaga nuestro proyecto.
# MOODLE_PORT (8081 por defecto) cambia el puerto publicado y el wwwroot de Moodle.
trap 'docker compose -f docker-compose.moodle.yml stop' EXIT
export MOODLE_PORT="${MOODLE_PORT:-8081}"
# docker.exe (Docker Desktop desde WSL) solo ve las variables listadas en WSLENV.
export WSLENV="MOODLE_PORT${WSLENV:+:$WSLENV}"
"${PYTHON:-backend/.venv/bin/python}" tests/moodle/fixtures_package.py
docker compose -f docker-compose.moodle.yml up -d --build --wait --wait-timeout 600
for file in genova-scorm.zip:genova.zip genova-scorm2004.zip:genova2004.zip genova.h5p:genova.h5p; do
  docker compose -f docker-compose.moodle.yml cp "tests/.ova-rendered/${file%%:*}" "moodle:/tmp/${file##*:}"
done
evidence="${MOODLE_EVIDENCE:-tests/test-results/moodle}"
MOODLE_EVIDENCE="$evidence/scorm12" node tests/moodle/verify.mjs
SCORM_VERSION=2004 MOODLE_EVIDENCE="$evidence/scorm2004" node tests/moodle/verify.mjs
# H5P: las librerías vienen del Hub (requiere red la primera vez; luego quedan en la BD).
docker compose -f docker-compose.moodle.yml exec -T -u www-data moodle \
  php admin/cli/scheduled_task.php --execute='\core\task\h5p_get_content_types_task'
MOODLE_EVIDENCE="$evidence/h5p" node tests/moodle/verify_h5p.mjs
