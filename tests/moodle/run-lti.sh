#!/usr/bin/env bash
set -euo pipefail
# LTI 1.3 contra Moodle real. Ejecutar desde la raíz del worktree DESPUÉS de run.sh (o con
# Moodle levantado) y con el backend de GenOVA en GENOVA_URL usando la BD de pruebas, p. ej.:
#   cd backend && set -a && . .env && set +a && LTI_TOOL_URL=http://localhost:8000 \
#     .venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
# Las variables de backend/.env (DATABASE_URL, JWT_SECRET…) deben estar exportadas aquí también.
export MOODLE_PORT="${MOODLE_PORT:-8081}" GENOVA_URL="${GENOVA_URL:-http://localhost:8000}"
export WSLENV="MOODLE_PORT${WSLENV:+:$WSLENV}"
python="${PYTHON:-backend/.venv/bin/python}"
compose=(docker compose -f docker-compose.moodle.yml)
"$python" tests/moodle/lti_seed_genova.py
# Clave pública de GenOVA (JWKS → PEM) para registrarla en Moodle como «RSA key».
"$python" - "$GENOVA_URL" <<'PY'
import base64, json, sys, urllib.request
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicNumbers
jwk = json.load(urllib.request.urlopen(sys.argv[1] + "/lti/jwks"))["keys"][0]
num = lambda v: int.from_bytes(base64.urlsafe_b64decode(v + "=" * (-len(v) % 4)), "big")
key = RSAPublicNumbers(num(jwk["e"]), num(jwk["n"])).public_key()
open("tests/.ova-rendered/genova-lti.pem", "wb").write(
    key.public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo))
PY
"${compose[@]}" cp tests/.ova-rendered/genova-lti.pem moodle:/tmp/genova-lti.pem
platform=$("${compose[@]}" exec -T -u www-data moodle php /opt/genova/provision_lti.php "$GENOVA_URL" /tmp/genova-lti.pem | tail -1)
"$python" tests/moodle/lti_register_platform.py "$platform"
LTI_IDS="$platform" MOODLE_EVIDENCE="${MOODLE_EVIDENCE:-tests/test-results/moodle}/lti" node tests/moodle/verify_lti.mjs
