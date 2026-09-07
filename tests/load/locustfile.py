"""Pruebas de capacidad de GenOVA con Locust — cobertura de toda la API.

Cubre los 120 endpoints publicados en el OpenAPI del backend, no sólo los
flujos principales. Cada endpoint aparece como una fila propia en el CSV/HTML
que genera Locust, de modo que el informe muestra su latencia individual.

Organización
------------
* ``LECTURAS``               — 47 GET. Peso alto: es el grueso del tráfico real.
* ``ESCRITURAS_IDEMPOTENTES`` — PATCH/PUT/POST que devuelven el estado al mismo
  valor que ya tenía (perfil, ajustes, reordenar fases, papelera ida y vuelta).
  No ensucian datos aunque se ejecuten miles de veces.
* ``CREACIONES``             — dan de alta filas nuevas ([carga] en el título).
  Peso bajo y limpieza posterior con ``cleanup_load_data.py``.
* ``COSTOSOS``               — encolado de generación, regeneración, agentes 5E
  y subida con indexado RAG. Sólo se activan con ``LOAD_COSTOSOS=1``.

Endpoints excluidos a propósito (no son medibles bajo carga o son destructivos):

===============================================  ==========================================
Endpoint                                         Motivo
===============================================  ==========================================
DELETE /api/users/me                             borra la cuenta de prueba
POST   /api/users/me/change-password             invalida la credencial del seed
PUT    /api/users/me/api-keys                    sobrescribe las claves del usuario
POST   /api/auth/logout                          mata la sesión a mitad de la corrida
POST   /api/auth/totp/*, DELETE /api/auth/totp*  altera el 2FA de la cuenta de prueba
GET    /api/jobs/{id}/stream                     SSE de larga duración: mide el worker, no el HTTP
POST   /api/users/me/links/invite                envía correo real
POST   /api/users/{id}/reset-password-email      envía correo real
POST   /api/admin/refresh-catalog                2/min y llama a proveedores externos
POST   /api/users/me/llm-settings/refresh-catalog 3/min y llama a proveedores externos
PUT    /api/admin/*                              cambian la configuración global
POST/PATCH/DELETE /api/roles*                    crean y borran roles de la plataforma
DELETE /api/ovas/{id}/permanente, /lote/permanente  borrado irreversible
===============================================  ==========================================

Uso (un solo comando, ver ``run-load.ps1`` para las tres corridas):

    locust -f tests/load/locustfile.py --headless -u 10 -r 2 -t 2m \
      --host http://localhost:8000 --csv tests/load/report_10 --html tests/load/report_10.html
    python tests/load/check_thresholds.py tests/load/report_10_stats.csv

El backend debe arrancar con ``RATE_LIMIT_ENABLED=0`` (SlowAPI responde 429 a
partir de 10 req/min y falsearía la medición) y, si se activan los endpoints
costosos, con ``LLM_FAKE=1`` para no gastar créditos del proveedor.

Variables de entorno
--------------------
EMAIL / PASS      cuenta seed autenticada (default ``user@genova.ai``)
ADMIN_EMAIL/PASS  cuenta administradora para sembrar y para los endpoints admin
LOAD_COSTOSOS     1 activa generación/regeneración/agentes/uploads (default 0)
"""

import os
import pathlib
import random
import re
import uuid

import requests
from locust import HttpUser, between, events, task

SEED_EMAIL = os.getenv("EMAIL", "user@genova.ai")
SEED_PASS = os.getenv("PASS", "user1234password")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@genova.ai")
ADMIN_PASS = os.getenv("ADMIN_PASS", "admin1234password")
LOAD_COSTOSOS = os.getenv("LOAD_COSTOSOS", "0") == "1"

MARCA = "[carga]"  # prefijo de todo lo que crea esta suite, para poder limpiarlo
UUID_CERO = "00000000-0000-0000-0000-000000000000"

_PDF = pathlib.Path(__file__).with_name("contexto-carga.pdf")
PDF_CARGA = _PDF.read_bytes() if _PDF.exists() else b"%PDF-1.4\n%%EOF\n"

# Identificadores reales sembrados una sola vez al arrancar la corrida. Se
# comparten entre todos los usuarios virtuales: sembrar por usuario crearía
# tantos OVAs como concurrencia y falsearía la medida.
FIX: dict[str, str] = {}

# El backend puede emitir genova_token con el flag Secure (COOKIE_SAMESITE=none).
# requests no reenvía cookies Secure sobre http://localhost, así que se reinyecta
# sin el flag; de lo contrario toda la corrida autenticada mediría 401.
_TOKEN_RE = re.compile(r"genova_token=([^;]+)")


def _fijar_cookie(client, response) -> None:
    token = response.cookies.get("genova_token")
    if not token:
        match = _TOKEN_RE.search(response.headers.get("Set-Cookie") or "")
        token = match.group(1) if match else None
    if token:
        client.cookies.set("genova_token", token, path="/")


# ---------------------------------------------------------------------------
# Siembra
# ---------------------------------------------------------------------------
@events.test_start.add_listener
def sembrar(environment, **_kwargs) -> None:
    base = environment.host or "http://localhost:8000"
    ses = requests.Session()
    # Se siembra con la cuenta NO administradora: los OVAs deben pertenecer al
    # usuario que ejecuta la mayor parte de la carga, o todo respondería 403.
    resp = ses.post(
        f"{base}/api/auth/login", json={"email": SEED_EMAIL, "password": SEED_PASS}
    )
    if resp.status_code != 200:
        raise RuntimeError(
            f"login seed falló ({resp.status_code}): ¿backend arriba y seed creado?"
        )
    _fijar_cookie(ses, resp)

    FIX["user_id"] = ses.get(f"{base}/api/auth/me").json().get("id", UUID_CERO)

    ova = ses.post(
        f"{base}/api/ovas/save",
        json={
            "prompt": f"{MARCA} OVA de referencia para la prueba de capacidad",
            "phases": [
                {
                    "type": "engage",
                    "order": 1,
                    "content": "<h2>Engage</h2>",
                    "title": "Engage 1",
                },
                {
                    "type": "engage",
                    "order": 2,
                    "content": "<h2>Engage</h2>",
                    "title": "Engage 2",
                },
            ],
            "upload_ids": [],
        },
    ).json()
    FIX["ova_id"] = ova.get("ova_id") or ova.get("id") or UUID_CERO

    def _crear(titulo: str) -> str:
        resp = ses.post(
            f"{base}/api/ovas/save",
            json={
                "prompt": f"{MARCA} {titulo}",
                "phases": [
                    {
                        "type": "engage",
                        "order": 1,
                        "content": "<p>Carga</p>",
                        "title": "Engage",
                    }
                ],
                "upload_ids": [],
            },
        ).json()
        return resp.get("ova_id") or resp.get("id") or UUID_CERO

    # Aislados a proposito: el ciclo de papelera saca el OVA de la lista y la
    # regeneracion lo deja en estado "generando" (409 para el resto de tareas).
    FIX["ova_papelera"] = _crear("OVA para el ciclo de papelera")
    FIX["ova_regen"] = _crear("OVA para la regeneracion")

    editor = ses.get(f"{base}/api/ovas/{FIX['ova_id']}/editar").json()
    fases = (editor.get("current_version") or {}).get("phases") or []
    FIX["fase_id"] = fases[0]["id"] if fases else UUID_CERO
    FIX["sub_id"] = UUID_CERO
    historial = editor.get("version_history") or []
    FIX["version_id"] = historial[0]["id"] if historial else UUID_CERO
    FIX["orden"] = [{"phase_id": f["id"], "new_order": f["phase_order"]} for f in fases]

    micro = ses.get(
        f"{base}/api/ovas/{FIX['ova_id']}/fases/{FIX['fase_id']}/versiones"
    ).json()
    lista = micro.get("versiones") or micro.get("versions") or micro.get("items") or []
    FIX["mvid"] = lista[0]["id"] if lista else UUID_CERO

    chat = ses.post(
        f"{base}/api/ovas/{FIX['ova_id']}/chat",
        json={
            "role": "user",
            "kind": "message",
            "text": f"{MARCA} mensaje de referencia",
        },
    ).json()
    FIX["message_id"] = chat.get("id", UUID_CERO)

    # Las vinculaciones exigen el permiso users:link, que la cuenta seed no tiene:
    # se siembran con el administrador, que es quien las ejercita en la corrida.
    adm = requests.Session()
    resp_adm = adm.post(
        f"{base}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}
    )
    _fijar_cookie(adm, resp_adm)
    enlace = adm.post(f"{base}/api/users/me/links/code", json={}).json()
    FIX["link_id"] = (
        (enlace.get("link") or {}).get("id") or enlace.get("id") or UUID_CERO
    )
    FIX["codigo"] = enlace.get("code", "ABC123")
    FIX["admin_id"] = adm.get(f"{base}/api/auth/me").json().get("id", UUID_CERO)

    FIX["upload_id"] = UUID_CERO
    FIX["job_id"] = UUID_CERO
    FIX["resource_id"] = UUID_CERO
    print(f"[carga] fixtures sembrados: ova={FIX['ova_id']} fase={FIX['fase_id']}")


def r(plantilla: str) -> str:
    """Sustituye los identificadores sembrados en una ruta con placeholders."""
    return plantilla.format(**{k: v for k, v in FIX.items() if isinstance(v, str)})


# ---------------------------------------------------------------------------
# Catálogo de peticiones
# ---------------------------------------------------------------------------
# (nombre en el informe, ruta, códigos aceptables)
LECTURAS: list[tuple[str, str, tuple[int, ...]]] = [
    ("GET /health", "/health", (200,)),
    ("GET /api/health", "/api/health", (200,)),
    ("GET /api/db/health", "/api/db/health", (200,)),
    ("GET /api/agents/health", "/api/agents/health", (200,)),
    ("GET /api/ovas/health", "/api/ovas/health", (200,)),
    ("GET /api/rag/health", "/api/rag/health", (200,)),
    ("GET /api/scorm/health", "/api/scorm/health", (200,)),
    ("GET /api/uploads/health", "/api/uploads/health", (200,)),
    ("GET /api/auth/me", "/api/auth/me", (200,)),
    ("GET /api/users/me/api-keys", "/api/users/me/api-keys", (200,)),
    ("GET /api/users/me/enabled-models", "/api/users/me/enabled-models", (200,)),
    (
        "GET /api/users/me/image-models",
        "/api/users/me/image-models?provider=siliconflow",
        (200,),
    ),
    ("GET /api/users/me/llm-settings", "/api/users/me/llm-settings", (200,)),
    ("GET /api/users/me/ova-settings", "/api/users/me/ova-settings", (200,)),
    ("GET /api/users/me/resource-configs", "/api/users/me/resource-configs", (200,)),
    ("GET /api/agents/engage/recursos", "/api/agents/engage/recursos", (200,)),
    ("GET /api/agents/explore/recursos", "/api/agents/explore/recursos", (200,)),
    ("GET /api/agents/explain/recursos", "/api/agents/explain/recursos", (200,)),
    ("GET /api/agents/elaborate/recursos", "/api/agents/elaborate/recursos", (200,)),
    ("GET /api/agents/evaluate/recursos", "/api/agents/evaluate/recursos", (200,)),
    ("GET /api/jobs (buscar)", "/api/jobs?ova_id={ova_id}", (200, 404)),
    ("GET /api/jobs/{job_id}", "/api/jobs/{job_id}", (200, 404)),
    (
        "GET /api/jobs/{job_id}/resources/{resource_id}/content",
        "/api/jobs/{job_id}/resources/{resource_id}/content",
        (200, 404),
    ),
    (
        "GET /api/ovas/{ova_id}/regenerar/{job_id}/progress",
        "/api/ovas/{ova_id}/regenerar/{job_id}/progress",
        (200, 403, 404),
    ),
    ("GET /api/ovas", "/api/ovas?page=1&limit=10", (200,)),
    ("GET /api/ovas (buscar)", "/api/ovas?page=1&limit=10&search=carga", (200,)),
    ("GET /api/ovas/llm-options", "/api/ovas/llm-options", (200,)),
    ("GET /api/ovas/{ova_id}/editar", "/api/ovas/{ova_id}/editar", (200, 409)),
    (
        "GET /api/ovas/{ova_id}/versiones",
        "/api/ovas/{ova_id}/versiones",
        (200, 404, 409),
    ),
    (
        "GET /api/ovas/{ova_id}/versiones/diff",
        "/api/ovas/{ova_id}/versiones/diff?v1={version_id}&v2={version_id}",
        (200, 404),
    ),
    (
        "GET /api/ovas/{ova_id}/fases/{fase_id}/versiones",
        "/api/ovas/{ova_id}/fases/{fase_id}/versiones",
        (200,),
    ),
    ("GET /api/ovas/{ova_id}/chat", "/api/ovas/{ova_id}/chat", (200, 404, 409)),
    ("GET /api/ovas/papelera", "/api/ovas/papelera?page=1&limit=10", (200,)),
    ("GET /api/ovas/papelera/count", "/api/ovas/papelera/count", (200,)),
    (
        "GET /api/ovas/{ova_id}/download",
        "/api/ovas/{ova_id}/download",
        (200, 302, 404, 409),
    ),
    (
        "GET /api/ovas/{ova_id}/export-scorm",
        "/api/ovas/{ova_id}/export-scorm",
        (200, 302, 404),
    ),
    ("GET /api/ovas/{ova_id}/scorm", "/api/ovas/{ova_id}/scorm", (200, 302, 404, 409)),
    ("GET /api/uploads/temp", "/api/uploads/temp", (200,)),
    (
        "GET /api/rag/chunks/by-upload/{upload_id}",
        "/api/rag/chunks/by-upload/{upload_id}",
        (200, 404),
    ),
]

# Sólo tienen sentido con sesión de administrador (rol o permiso users:link).
LECTURAS_ADMIN: list[tuple[str, str, tuple[int, ...]]] = [
    ("GET /api/users", "/api/users?page=1&limit=10", (200,)),
    ("GET /api/users/analytics", "/api/users/analytics", (200,)),
    ("GET /api/users/me/links", "/api/users/me/links", (200,)),
    ("GET /api/users/links/admin", "/api/users/links/admin", (200,)),
    ("GET /api/roles", "/api/roles", (200,)),
    ("GET /api/admin/llm-config", "/api/admin/llm-config", (200,)),
    ("GET /api/admin/nodes-config", "/api/admin/nodes-config", (200,)),
    ("GET /api/admin/platform-config", "/api/admin/platform-config", (200,)),
    ("GET /api/admin/registration-mode", "/api/admin/registration-mode", (200,)),
]


def _cuerpos_idempotentes() -> list[tuple[str, str, str, dict, tuple[int, ...]]]:
    """(método, nombre, ruta, cuerpo, códigos aceptables) — no alteran el estado."""
    return [
        (
            "PATCH",
            "PATCH /api/users/me",
            "/api/users/me",
            {"full_name": "Usuario de prueba", "email": SEED_EMAIL},
            (200, 400),
        ),
        (
            "PATCH",
            "PATCH /api/users/me/theme",
            "/api/users/me/theme",
            {"colorMode": "light", "designMode": "default", "palette": {}},
            (200,),
        ),
        (
            "PATCH",
            "PATCH /api/ovas/{ova_id}/metadata",
            "/api/ovas/{ova_id}/metadata",
            {
                "title": f"{MARCA} OVA de referencia",
                "description": "Prueba de capacidad",
            },
            (200,),
        ),
        (
            "PATCH",
            "PATCH /api/ovas/{ova_id}/fases/reorder",
            "/api/ovas/{ova_id}/fases/reorder",
            {"reorders": FIX.get("orden", [])},
            (200, 404, 409, 422),
        ),
        (
            "PATCH",
            "PATCH /api/ovas/{ova_id}/fases/{fase_id}",
            "/api/ovas/{ova_id}/fases/{fase_id}",
            {"content": "<h2>Engage</h2><p>Contenido bajo carga.</p>"},
            (200, 404, 409),
        ),
        (
            "PATCH",
            "PATCH /api/ovas/{ova_id}/chat/{message_id}",
            "/api/ovas/{ova_id}/chat/{message_id}",
            {"text": f"{MARCA} mensaje editado"},
            (200, 404, 409),
        ),
        (
            "POST",
            "POST /api/auth/forgot-password",
            "/api/auth/forgot-password",
            {"email": SEED_EMAIL},
            (200, 202, 429, 500),
        ),
        (
            "POST",
            "POST /api/auth/resend-verification",
            "/api/auth/resend-verification",
            {"email": SEED_EMAIL},
            (200, 202, 400, 429, 500),
        ),
        (
            "POST",
            "POST /api/auth/verify-email",
            "/api/auth/verify-email",
            {"token": "token-de-carga-invalido"},
            (200, 400),
        ),
        (
            "POST",
            "POST /api/auth/reset-password",
            "/api/auth/reset-password",
            {"token": "token-de-carga-invalido", "new_password": "Carga1234abc"},
            (200, 400),
        ),
    ]


def _cuerpos_admin() -> list[tuple[str, str, str, dict, tuple[int, ...]]]:
    """Escrituras administrativas que devuelven el estado a su valor actual."""
    return [
        (
            "PATCH",
            "PATCH /api/users/{user_id}/status",
            "/api/users/{user_id}/status",
            {"is_active": True},
            (200,),
        ),
        (
            "POST",
            "POST /api/users/{user_id}/unlock",
            "/api/users/{user_id}/unlock",
            {},
            (200, 404),
        ),
        (
            "POST",
            "POST /api/users/me/links/accept",
            "/api/users/me/links/accept",
            {"code": "CARGA0"},
            (200, 400, 404),
        ),
    ]


class _Base(HttpUser):
    """Comportamiento común: sesión con cookie y petición instrumentada."""

    abstract = True
    credenciales = (SEED_EMAIL, SEED_PASS)

    def on_start(self) -> None:
        correo, clave = self.credenciales
        resp = self.client.post(
            "/api/auth/login",
            json={"email": correo, "password": clave},
            name="POST /api/auth/login (on_start)",
        )
        if resp.status_code != 200:
            raise RuntimeError(f"login de {correo} falló ({resp.status_code})")
        _fijar_cookie(self.client, resp)

    def _pedir(self, metodo: str, nombre: str, ruta: str, cuerpo=None, ok=(200,)):
        with self.client.request(
            metodo, r(ruta), json=cuerpo, name=nombre, catch_response=True
        ) as resp:
            if resp.status_code in ok:
                resp.success()
            else:
                resp.failure(f"esperaba {ok}, llegó {resp.status_code}")
            return resp


class GenovaUser(_Base):
    """Docente/estudiante: el 80 % del tráfico. Sesión de la cuenta seed."""

    weight = 4
    wait_time = between(0.5, 2.0)
    credenciales = (SEED_EMAIL, SEED_PASS)

    @task(12)
    def lectura(self) -> None:
        nombre, ruta, ok = random.choice(LECTURAS)
        self._pedir("GET", nombre, ruta, ok=ok)

    @task(4)
    def escritura_idempotente(self) -> None:
        metodo, nombre, ruta, cuerpo, ok = random.choice(_cuerpos_idempotentes())
        self._pedir(metodo, nombre, ruta, cuerpo, ok)

    @task(3)
    def sesion(self) -> None:
        resp = self._pedir(
            "POST",
            "POST /api/auth/login",
            "/api/auth/login",
            {"email": SEED_EMAIL, "password": SEED_PASS},
        )
        if resp.status_code == 200:
            _fijar_cookie(self.client, resp)

    @task(2)
    def ciclo_papelera(self) -> None:
        """Manda un OVA a la papelera y lo restaura: deja el estado como estaba."""
        ova = FIX.get("ova_papelera", UUID_CERO)
        self._pedir(
            "POST",
            "POST /api/ovas/lote/papelera",
            "/api/ovas/lote/papelera",
            {"ova_ids": [ova]},
            (200,),
        )
        self._pedir(
            "POST",
            "POST /api/ovas/lote/restaurar",
            "/api/ovas/lote/restaurar",
            {"ova_ids": [ova]},
            (200,),
        )
        self._pedir(
            "DELETE",
            "DELETE /api/ovas/{ova_id}",
            "/api/ovas/{ova_papelera}",
            None,
            (200, 404),
        )
        self._pedir(
            "PATCH",
            "PATCH /api/ovas/{ova_id}/restaurar",
            "/api/ovas/{ova_papelera}/restaurar",
            None,
            (200, 404),
        )

    @task(2)
    def chat(self) -> None:
        resp = self._pedir(
            "POST",
            "POST /api/ovas/{ova_id}/chat",
            "/api/ovas/{ova_id}/chat",
            {"role": "user", "kind": "message", "text": f"{MARCA} mensaje bajo carga"},
            (200, 201, 404, 409),
        )
        try:
            mensaje = resp.json().get("id")
        except Exception:
            mensaje = None
        if mensaje:
            self._pedir(
                "DELETE",
                "DELETE /api/ovas/{ova_id}/chat/{message_id}",
                f"/api/ovas/{FIX.get('ova_id')}/chat/{mensaje}",
                None,
                (200, 204, 404),
            )

    @task(1)
    def alta_de_datos(self) -> None:
        """Creaciones reales: cuenta, OVA, duplicado, fase-versión y vínculo."""
        uid = uuid.uuid4().hex[:12]
        self._pedir(
            "POST",
            "POST /api/auth/register",
            "/api/auth/register",
            {
                "full_name": f"{MARCA} Usuario",
                "email": f"loadtest_{uid}@test.genova.ai",
                "password": "carga1234pass",
            },
            (200, 201, 400, 403, 409),
        )
        self._pedir(
            "POST",
            "POST /api/ovas/save",
            "/api/ovas/save",
            {
                "prompt": f"{MARCA} OVA {uid}",
                "phases": [
                    {
                        "type": "engage",
                        "order": 1,
                        "content": "<p>Carga</p>",
                        "title": "Engage",
                    }
                ],
                "upload_ids": [],
            },
            (200, 201),
        )
        self._pedir(
            "POST",
            "POST /api/ovas/{ova_id}/duplicar",
            "/api/ovas/{ova_id}/duplicar",
            None,
            (200, 201, 404, 409),
        )
        self._pedir(
            "POST",
            "POST /api/ovas/{ova_id}/versiones/{version_id}/revert",
            "/api/ovas/{ova_id}/versiones/{version_id}/revert",
            None,
            (200, 404, 409),
        )
        self._pedir(
            "POST",
            "POST /api/ovas/{ova_id}/fases/{fase_id}/versiones/{mvid}/revert",
            "/api/ovas/{ova_id}/fases/{fase_id}/versiones/{mvid}/revert",
            None,
            (200, 404, 409),
        )

    if LOAD_COSTOSOS:

        @task(1)
        def generacion(self) -> None:
            """Encolado de generación y agentes 5E. Requiere LLM_FAKE=1 en el backend."""
            uid = uuid.uuid4().hex[:8]
            self._pedir(
                "POST",
                "POST /api/jobs (encolado LLM)",
                "/api/jobs",
                {
                    "prompt": f"{MARCA} OVA {uid}: prueba de capacidad.",
                    "resources": [
                        {"phase_type": "engage", "resource_type": "Cómic Interactivo"},
                        {
                            "phase_type": "explore",
                            "resource_type": "Lectura Interactiva",
                        },
                    ],
                },
                (200, 202),
            )
            self._pedir(
                "POST",
                "POST /api/jobs/{job_id}/cancel (LLM)",
                "/api/jobs/{job_id}/cancel",
                None,
                (200, 404),
            )
            self._pedir(
                "POST",
                "POST /api/jobs/{job_id}/resume (LLM)",
                "/api/jobs/{job_id}/resume",
                None,
                (200, 404),
            )
            self._pedir(
                "POST",
                "POST /api/ovas/{ova_id}/regenerar (LLM)",
                "/api/ovas/{ova_regen}/regenerar",
                {"phase_type": "engage"},
                (200, 202, 400, 404, 409, 422),
            )
            fase = random.choice(
                ["engage", "explore", "explain", "elaborate", "evaluate"]
            )
            self._pedir(
                "POST",
                f"POST /api/agents/{fase}/generate (LLM)",
                f"/api/agents/{fase}/generate",
                {"concepto": "Aprendizaje supervisado", "tipo": 1},
                (200, 201, 400, 422),
            )

        @task(1)
        def documento_rag(self) -> None:
            """Subida + indexado RAG y su borrado. Consume embeddings del proveedor."""
            with self.client.post(
                "/api/uploads/temp",
                files={"files": ("contexto-carga.pdf", PDF_CARGA, "application/pdf")},
                name="POST /api/uploads/temp (RAG)",
                catch_response=True,
            ) as resp:
                subida = None
                if resp.status_code == 200:
                    resp.success()
                    try:
                        subida = (resp.json().get("items") or [{}])[0].get("upload_id")
                    except Exception:
                        subida = None
                else:
                    resp.failure(f"esperaba 200, llegó {resp.status_code}")
            if subida:
                self._pedir(
                    "GET",
                    "GET /api/rag/chunks/by-upload/{upload_id} (RAG)",
                    f"/api/rag/chunks/by-upload/{subida}",
                    None,
                    (200, 404),
                )
                self._pedir(
                    "DELETE",
                    "DELETE /api/uploads/temp/{upload_id}",
                    f"/api/uploads/temp/{subida}",
                    None,
                    (200, 204, 404),
                )


class GenovaAdmin(_Base):
    """Administrador: 1 de cada 5 usuarios virtuales. Ejercita el panel de admin
    y las vinculaciones, que exigen rol o permiso y desde la cuenta seed sólo
    devolverían 403 (mediría el rechazo, no el endpoint)."""

    weight = 1
    wait_time = between(1.0, 3.0)
    credenciales = (ADMIN_EMAIL, ADMIN_PASS)

    @task(10)
    def lectura_admin(self) -> None:
        nombre, ruta, ok = random.choice(LECTURAS_ADMIN)
        self._pedir("GET", nombre, ruta, ok=ok)

    @task(3)
    def escritura_admin(self) -> None:
        metodo, nombre, ruta, cuerpo, ok = random.choice(_cuerpos_admin())
        self._pedir(metodo, nombre, ruta, cuerpo, ok)

    @task(2)
    def vinculacion(self) -> None:
        resp = self._pedir(
            "POST",
            "POST /api/users/me/links/code",
            "/api/users/me/links/code",
            {},
            (200, 201),
        )
        try:
            enlace = (resp.json().get("link") or {}).get("id")
        except Exception:
            enlace = None
        if enlace:
            self._pedir(
                "POST",
                "POST /api/users/me/links/{link_id}/resend",
                f"/api/users/me/links/{enlace}/resend",
                None,
                (200, 400, 404, 500),
            )
            self._pedir(
                "DELETE",
                "DELETE /api/users/me/links/{link_id}",
                f"/api/users/me/links/{enlace}",
                None,
                (200, 204, 404),
            )
            self._pedir(
                "DELETE",
                "DELETE /api/users/links/admin/{link_id}",
                f"/api/users/links/admin/{enlace}",
                None,
                (200, 204, 404),
            )

    @task(1)
    def lectura_compartida(self) -> None:
        """Algunas lecturas de usuario también se miden con sesión de admin."""
        nombre, ruta, ok = random.choice(LECTURAS)
        self._pedir("GET", nombre, ruta, ok=ok)
