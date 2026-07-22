"""Pruebas de capacidad de GenOVA con Locust (RN-001/RN-004 → TA-003).

Simula usuarios reales contra el backend: login (cookie httpOnly en el
cookiejar del cliente), listado de OVAs, registro de cuentas nuevas y encolado
de generación de OVAs. El umbral formal (P90 <= 278 ms en endpoints no-LLM,
RN-001) lo valida check_thresholds.py sobre el CSV que genera Locust.

Uso local (backend en :8000 con RATE_LIMIT_ENABLED=0 y LLM_FAKE=1):

    pip install -r tests/load/requirements.txt
    locust -f tests/load/locustfile.py --headless -u 25 -r 5 -t 2m \
      --host http://localhost:8000 --csv tests/load/report --html tests/load/report.html
    python tests/load/check_thresholds.py tests/load/report_stats.csv

Variables de entorno:
    EMAIL / PASS      — cuenta seed para el flujo autenticado (default user@genova.ai)
    LOAD_GENERATION   — 0 desactiva el task de POST /api/jobs (default 1).
                        NUNCA activarlo contra un backend sin LLM_FAKE=1: cada
                        request encola una generación LLM real.
"""

import os
import re
import uuid

from locust import HttpUser, between, task

SEED_EMAIL = os.getenv("EMAIL", "user@genova.ai")
SEED_PASS = os.getenv("PASS", "user1234password")
LOAD_GENERATION = os.getenv("LOAD_GENERATION", "1") == "1"

# El backend puede emitir genova_token con Secure (p. ej. COOKIE_SAMESITE=none).
# requests/Locust no reenvían cookies Secure sobre http://localhost; las
# reinyectamos sin el flag para medir latencia autenticada en carga local.
_TOKEN_RE = re.compile(r"genova_token=([^;]+)")


def _apply_auth_cookie(client, response) -> None:
    token = response.cookies.get("genova_token")
    if not token:
        match = _TOKEN_RE.search(response.headers.get("Set-Cookie") or "")
        token = match.group(1) if match else None
    if not token:
        return
    client.cookies.set("genova_token", token, path="/")


class GenovaUser(HttpUser):
    """Usuario autenticado: navega su biblioteca y lanza generaciones."""

    wait_time = between(0.5, 2.0)

    def on_start(self) -> None:
        resp = self.client.post(
            "/api/auth/login",
            json={"email": SEED_EMAIL, "password": SEED_PASS},
            name="POST /api/auth/login (on_start)",
        )
        if resp.status_code != 200:
            raise RuntimeError(
                f"Login seed falló ({resp.status_code}): ¿backend arriba y usuario seed creado?"
            )
        _apply_auth_cookie(self.client, resp)

    @task(5)
    def health(self) -> None:
        self.client.get("/health")

    @task(4)
    def list_ovas(self) -> None:
        self.client.get("/api/ovas?page=1", name="GET /api/ovas")

    @task(2)
    def login(self) -> None:
        resp = self.client.post(
            "/api/auth/login",
            json={"email": SEED_EMAIL, "password": SEED_PASS},
            name="POST /api/auth/login",
        )
        if resp.status_code == 200:
            _apply_auth_cookie(self.client, resp)

    @task(1)
    def register(self) -> None:
        uid = uuid.uuid4().hex[:12]
        self.client.post(
            "/api/auth/register",
            json={
                "full_name": "Usuario Carga",
                "email": f"loadtest_{uid}@test.genova.ai",
                "password": "carga1234pass",
            },
            name="POST /api/auth/register",
        )

    if LOAD_GENERATION:

        @task(1)
        def start_generation(self) -> None:
            """Mide SOLO el encolado (202): el job corre en background con LLM_FAKE."""
            uid = uuid.uuid4().hex[:8]
            with self.client.post(
                "/api/jobs",
                json={
                    "prompt": f"OVA de carga {uid}: tema de prueba de capacidad.",
                    "resources": [
                        {"phase_type": "engage", "resource_type": "Cómic Interactivo"},
                        {"phase_type": "explore", "resource_type": "Lectura Interactiva"},
                    ],
                },
                name="POST /api/jobs (encolado LLM)",
                catch_response=True,
            ) as resp:
                if resp.status_code == 202:
                    resp.success()
                else:
                    resp.failure(f"esperaba 202, llegó {resp.status_code}")
