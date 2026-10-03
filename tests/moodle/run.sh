#!/usr/bin/env bash
set -euo pipefail
# Ejecutar desde la raíz del worktree. El trap solo apaga nuestro proyecto.
trap 'docker compose -f docker-compose.moodle.yml stop' EXIT
"${PYTHON:-backend/.venv/bin/python}" tests/moodle/fixtures_package.py
docker compose -f docker-compose.moodle.yml up -d --build --wait --wait-timeout 600
docker compose -f docker-compose.moodle.yml cp tests/.ova-rendered/genova-scorm.zip moodle:/tmp/genova.zip
node tests/moodle/verify.mjs
