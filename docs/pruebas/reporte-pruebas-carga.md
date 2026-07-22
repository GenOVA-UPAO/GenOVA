# Reporte de Pruebas de Carga — GenOVA

> Pruebas de **capacidad** del backend FastAPI sobre **toda la superficie de la API**
> (120 endpoints publicados en el OpenAPI), con **10, 50 y 100 usuarios concurrentes**,
> más una cuarta corrida de contraste con el pool de base de datos ampliado.
> Umbral formal **RN-001: P90 ≤ 278 ms** en endpoints que no son de generación LLM.

| Campo | Valor |
|---|---|
| **Proyecto** | GenOVA — generación asistida por IA de OVAs (SCORM 1.2 / 5E) |
| **Tipo de prueba** | Carga / rendimiento HTTP (backend completo) |
| **Herramienta** | Locust 2.46 (`tests/load/locustfile.py`) |
| **Fecha de ejecución** | 22/07/2026 |
| **Ejecutado por** | Jeffry A. Romero Uriol |
| **Niveles de carga** | 10 · 50 · 100 usuarios concurrentes, 2 min por nivel |
| **Cobertura** | 120 endpoints (los excluidos y su motivo, en §2.3) |

---

## 1. Escenario de prueba

### 1.1 Objetivo

Determinar la capacidad del backend de GenOVA bajo concurrencia creciente, midiendo latencia por percentiles (P50/P90/P99), throughput y tasa de error de **cada endpoint**, no solo de los flujos principales, y localizar el punto en el que el sistema deja de responder dentro de presupuesto.

### 1.2 Entorno

| Componente | Detalle |
|---|---|
| Backend | FastAPI (uvicorn) en `http://localhost:8000` |
| Base de datos | Supabase PostgreSQL, pooler de transacción (puerto 6543), región `aws-1-us-east-1` |
| Cliente de carga | Windows 11, misma máquina (Perú) → red pública → Supabase US-East |
| Rate limit | `RATE_LIMIT_ENABLED=0` — con SlowAPI activo la corrida mediría 429, no capacidad |
| Generación LLM | `LLM_FAKE=1` — el endpoint se ejerce completo (auth, validación, inserción y encolado); sólo se sustituye la llamada del worker al proveedor |
| Cuentas | `user@genova.ai` (4 de cada 5 usuarios virtuales) y `admin@genova.ai` (1 de cada 5) |
| Datos | Una OVA de referencia sembrada al arrancar, más dos aisladas para papelera y regeneración |

### 1.3 Perfil de carga

| Tarea | Peso | Contenido |
|---|---:|---|
| Lecturas | 12 | 47 endpoints GET (salud, catálogos, biblioteca, versiones, chat, papelera, descargas) |
| Escrituras idempotentes | 4 | PATCH/PUT/POST que devuelven el estado a su valor actual |
| Sesión | 3 | `POST /api/auth/login` |
| Ciclo de papelera | 2 | papelera → restaurar, individual y por lote |
| Chat | 2 | crear y borrar un mensaje |
| Altas | 1 | registro, guardar OVA, duplicar, revertir versión |
| Costosos (sólo en 10 concurrentes) | 1 | encolado de generación, regeneración, agentes 5E, subida con indexado RAG |
| Admin | — | clase aparte (20 % de los usuarios): panel de administración y vinculaciones |

Think time entre peticiones: 0.5–2.0 s (usuario) y 1.0–3.0 s (administrador).

## 2. Definición de los casos de prueba

| Caso | Concurrentes | Ramp-up | Duración | Endpoints costosos | Configuración del pool |
|---|---:|---:|---|---|---|
| CP-CARGA-01 | 10 | 2/s | 2 min | sí | 10 + 10 (por defecto) |
| CP-CARGA-02 | 50 | 10/s | 2 min | no | 10 + 10 (por defecto) |
| CP-CARGA-03 | 100 | 20/s | 2 min | no | 10 + 10 (por defecto) |
| CP-CARGA-04 | 100 | 20/s | 2 min | no | 40 + 40 (contraste) |

### 2.1 Criterio de aceptación

- **RN-001**: P90 ≤ 278 ms en endpoints no-LLM.
- Tasa de fallos agregada ≤ 1 % (cumplido en 10 y 50 concurrentes; incumplido en 100).
- Verificado automáticamente por `tests/load/check_thresholds.py`.

### 2.2 Qué cuenta como fallo

Cada petición declara los códigos que son respuesta legítima. Un 404 al pedir un trabajo inexistente o un 409 sobre una OVA en regeneración **no** son fallos: documentan el contrato. Sólo se contabiliza como fallo un código fuera de ese conjunto (típicamente 500) o un error de conexión.

### 2.3 Endpoints excluidos y motivo

| Endpoint | Motivo de la exclusión |
|---|---|
| `DELETE /api/users/me` | borra la cuenta con la que se ejecuta la prueba |
| `POST /api/users/me/change-password` | invalida la credencial del seed |
| `PUT /api/users/me/api-keys` | sobrescribe las claves del usuario |
| `POST /api/auth/logout` | mata la sesión a mitad de corrida |
| `POST/DELETE /api/auth/totp*` | altera el segundo factor de la cuenta |
| `GET /api/jobs/{id}/stream` | SSE de larga duración: mide al worker, no al HTTP |
| `POST /api/users/me/links/invite`, `POST /api/users/{id}/reset-password-email` | envían correo real |
| `POST /api/admin/refresh-catalog`, `POST /api/users/me/llm-settings/refresh-catalog` | 2–3 req/min y llaman a proveedores externos |
| `PUT /api/admin/*` | cambian la configuración global de la plataforma |
| `POST/PATCH/DELETE /api/roles*` | crean y borran roles del sistema |
| `DELETE /api/ovas/{id}/permanente`, `/lote/permanente` | borrado irreversible |

## 3. Ejecución

Un solo comando reproduce las tres corridas y valida los umbrales:

```powershell
# 1. Backend en modo carga (RATE_LIMIT_ENABLED=0, LLM_FAKE=1)
./scripts/serve-load.ps1

# 2. En otra terminal: 10, 50 y 100 concurrentes + validación + limpieza
./tests/load/run-load.ps1
```

Corrida de contraste con el pool ampliado (CP-CARGA-04):

```powershell
./scripts/serve-load-pool.ps1 -Pool 40 -Overflow 40
./tests/load/run-load.ps1 -Niveles 100
```

Al terminar, `tests/load/cleanup_load_data.py` borra de forma permanente las OVAs marcadas con `[carga]` y desactiva las cuentas `@test.genova.ai` creadas por el registro.

## 4. Resultados

### 4.1 Resumen por nivel de carga

| Caso | Concurrentes | Peticiones | Fallos | RPS | P50 (ms) | P90 (ms) | P99 (ms) | Endpoints medidos |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| CP-CARGA-01 | 10 | 580 | 0 (0.0%) | 4.9 | 610 | 2100 | 4100 | 90 |
| CP-CARGA-02 | 50 | 2 337 | 11 (0.5%) | 19.6 | 1100 | 2100 | 3700 | 78 |
| CP-CARGA-03 | 100 | 355 | 51 (14.4%) | 3.0 | 6500 | 36000 | 65000 | 69 |
| CP-CARGA-04 | 100 | 223 | 19 (8.5%) | 2.3 | 3100 | 66000 | 67000 | 53 |

### 4.2.1 CP-CARGA-01 — 10 concurrentes

Endpoints dentro del umbral RN-001 (P90 ≤ 278 ms): **8 de 90**.

**15 endpoints más lentos:**

| Endpoint | # peticiones | Fallos | P50 (ms) | P90 (ms) | P99 (ms) | ¿P90 ≤ 278 ms? |
|---|---:|---:|---:|---:|---:|:--:|
| `POST /api/users/me/links/accept` | 4 | 0 | 7600 | 8800 | 8800 | ✖ No |
| `POST /api/jobs (encolado LLM)` | 15 | 0 | 3400 | 4100 | 4800 | ✖ No |
| `GET /api/ovas/{ova_id}/scorm` | 7 | 0 | 1200 | 3600 | 3600 | ✖ No |
| `POST /api/auth/login (on_start)` | 10 | 0 | 2600 | 3200 | 3200 | ✖ No |
| `GET /api/users/links/admin` | 2 | 0 | 2800 | 2800 | 2800 | ✖ No |
| `POST /api/ovas/{ova_id}/versiones/{version_id}/revert` | 14 | 0 | 1600 | 2800 | 3000 | ✖ No |
| `PATCH /api/ovas/{ova_id}/fases/{fase_id}` | 2 | 0 | 2700 | 2700 | 2700 | ✖ No |
| `POST /api/uploads/temp (RAG)` | 7 | 0 | 1600 | 2700 | 2700 | ✖ No |
| `GET /api/users/me/image-models` | 1 | 0 | 2600 | 2600 | 2600 | ✖ No |
| `POST /api/ovas/{ova_id}/duplicar` | 14 | 0 | 2200 | 2600 | 3400 | ✖ No |
| `POST /api/users/me/links/code` | 6 | 0 | 1600 | 2400 | 2400 | ✖ No |
| `PATCH /api/ovas/{ova_id}/chat/{message_id}` | 3 | 0 | 910 | 2300 | 2300 | ✖ No |
| `GET /api/jobs/{job_id}/resources/{resource_id}/content` | 6 | 0 | 410 | 2200 | 2200 | ✖ No |
| `POST /api/agents/explain/generate (LLM)` | 2 | 0 | 2200 | 2200 | 2200 | ✖ No |
| `POST /api/auth/forgot-password` | 2 | 0 | 2200 | 2200 | 2200 | ✖ No |

**10 endpoints más rápidos:**

| Endpoint | # peticiones | P50 (ms) | P90 (ms) | ¿P90 ≤ 278 ms? |
|---|---:|---:|---:|:--:|
| `GET /api/agents/health` | 3 | 4 | 5 | ✔ Sí |
| `GET /api/health` | 3 | 5 | 5 | ✔ Sí |
| `GET /api/uploads/health` | 1 | 6 | 6 | ✔ Sí |
| `GET /api/agents/elaborate/recursos` | 3 | 4 | 8 | ✔ Sí |
| `GET /api/scorm/health` | 1 | 8 | 8 | ✔ Sí |
| `GET /api/agents/explore/recursos` | 4 | 5 | 9 | ✔ Sí |
| `GET /api/ovas/health` | 2 | 9 | 9 | ✔ Sí |
| `GET /api/agents/engage/recursos` | 5 | 5 | 12 | ✔ Sí |
| `DELETE /api/uploads/temp/{upload_id}` | 7 | 300 | 310 | ✖ No |
| `GET /api/admin/llm-config` | 3 | 310 | 310 | ✖ No |

Informe completo: `tests/load/report_10.html`

### 4.2.2 CP-CARGA-02 — 50 concurrentes

Endpoints dentro del umbral RN-001 (P90 ≤ 278 ms): **11 de 78**.

**15 endpoints más lentos:**

| Endpoint | # peticiones | Fallos | P50 (ms) | P90 (ms) | P99 (ms) | ¿P90 ≤ 278 ms? |
|---|---:|---:|---:|---:|---:|:--:|
| `POST /api/users/me/links/accept` | 14 | 0 | 8500 | 8800 | 9900 | ✖ No |
| `POST /api/ovas/{ova_id}/duplicar` | 42 | 0 | 3200 | 3800 | 4700 | ✖ No |
| `POST /api/ovas/{ova_id}/versiones/{version_id}/revert` | 41 | 7 | 2300 | 3300 | 4000 | ✖ No |
| `PATCH /api/ovas/{ova_id}/fases/{fase_id}` | 22 | 4 | 2700 | 3000 | 3400 | ✖ No |
| `POST /api/auth/login (on_start)` | 50 | 0 | 2600 | 3000 | 3600 | ✖ No |
| `GET /api/jobs (buscar)` | 19 | 0 | 1200 | 2600 | 3000 | ✖ No |
| `GET /api/ovas/{ova_id}/scorm` | 17 | 0 | 1700 | 2600 | 3300 | ✖ No |
| `POST /api/ovas/save` | 44 | 0 | 1900 | 2500 | 3400 | ✖ No |
| `POST /api/users/me/links/{link_id}/resend` | 27 | 0 | 1900 | 2500 | 3700 | ✖ No |
| `GET /api/admin/llm-config` | 17 | 0 | 910 | 2400 | 3100 | ✖ No |
| `GET /api/users/analytics` | 18 | 0 | 1500 | 2300 | 2600 | ✖ No |
| `PATCH /api/users/{user_id}/status` | 20 | 0 | 1600 | 2300 | 2800 | ✖ No |
| `POST /api/users/me/links/code` | 28 | 0 | 1700 | 2300 | 3000 | ✖ No |
| `GET /api/admin/nodes-config` | 15 | 0 | 1100 | 2200 | 3500 | ✖ No |
| `DELETE /api/ovas/{ova_id}` | 106 | 0 | 1200 | 2000 | 2800 | ✖ No |

Informe completo: `tests/load/report_50.html`

### 4.2.3 CP-CARGA-03 — 100 concurrentes

Endpoints dentro del umbral RN-001 (P90 ≤ 278 ms): **1 de 69**.

**15 endpoints más lentos:**

| Endpoint | # peticiones | Fallos | P50 (ms) | P90 (ms) | P99 (ms) | ¿P90 ≤ 278 ms? |
|---|---:|---:|---:|---:|---:|:--:|
| `GET /api/admin/llm-config` | 3 | 2 | 61000 | 70000 | 70000 | ✖ No |
| `GET /api/admin/nodes-config` | 5 | 3 | 55000 | 67000 | 67000 | ✖ No |
| `GET /api/ovas/papelera` | 1 | 0 | 66000 | 66000 | 66000 | ✖ No |
| `GET /api/users/analytics` | 2 | 0 | 65000 | 65000 | 65000 | ✖ No |
| `GET /api/users/me/image-models` | 2 | 0 | 64000 | 64000 | 64000 | ✖ No |
| `GET /api/users/me/llm-settings` | 5 | 0 | 36000 | 64000 | 64000 | ✖ No |
| `GET /api/uploads/temp` | 3 | 0 | 35000 | 60000 | 60000 | ✖ No |
| `GET /api/users/me/links` | 6 | 1 | 37000 | 59000 | 59000 | ✖ No |
| `GET /api/ovas/{ova_id}/versiones` | 4 | 0 | 37000 | 57000 | 57000 | ✖ No |
| `POST /api/ovas/{ova_id}/fases/{fase_id}/versiones/{mvid}/revert` | 1 | 0 | 39000 | 39000 | 39000 | ✖ No |
| `GET /api/users/me/resource-configs` | 2 | 0 | 38000 | 38000 | 38000 | ✖ No |
| `POST /api/users/me/links/code` | 2 | 1 | 38000 | 38000 | 38000 | ✖ No |
| `DELETE /api/ovas/{ova_id}` | 5 | 0 | 34000 | 37000 | 37000 | ✖ No |
| `GET /api/admin/registration-mode` | 2 | 1 | 37000 | 37000 | 37000 | ✖ No |
| `GET /api/users` | 3 | 0 | 7000 | 37000 | 37000 | ✖ No |

Informe completo: `tests/load/report_100.html`

### 4.2.4 CP-CARGA-04 — 100 concurrentes · pool 40+40

Endpoints dentro del umbral RN-001 (P90 ≤ 278 ms): **3 de 53**.

**15 endpoints más lentos:**

| Endpoint | # peticiones | Fallos | P50 (ms) | P90 (ms) | P99 (ms) | ¿P90 ≤ 278 ms? |
|---|---:|---:|---:|---:|---:|:--:|
| `GET /api/admin/registration-mode` | 2 | 0 | 67000 | 67000 | 67000 | ✖ No |
| `GET /api/users/me/api-keys` | 3 | 0 | 64000 | 67000 | 67000 | ✖ No |
| `POST /api/ovas/lote/papelera` | 8 | 0 | 1700 | 67000 | 67000 | ✖ No |
| `GET /api/ovas/{ova_id}/chat` | 1 | 0 | 66000 | 66000 | 66000 | ✖ No |
| `PATCH /api/ovas/{ova_id}/chat/{message_id}` | 1 | 0 | 66000 | 66000 | 66000 | ✖ No |
| `POST /api/auth/login (on_start)` | 100 | 6 | 3200 | 66000 | 66000 | ✖ No |
| `POST /api/ovas/save` | 2 | 1 | 66000 | 66000 | 66000 | ✖ No |
| `POST /api/ovas/{ova_id}/chat` | 3 | 1 | 65000 | 66000 | 66000 | ✖ No |
| `POST /api/users/{user_id}/unlock` | 1 | 0 | 66000 | 66000 | 66000 | ✖ No |
| `DELETE /api/ovas/{ova_id}` | 4 | 2 | 65000 | 65000 | 65000 | ✖ No |
| `GET /api/jobs/{job_id}` | 2 | 0 | 65000 | 65000 | 65000 | ✖ No |
| `GET /api/ovas` | 5 | 1 | 64000 | 65000 | 65000 | ✖ No |
| `GET /api/rag/chunks/by-upload/{upload_id}` | 2 | 0 | 65000 | 65000 | 65000 | ✖ No |
| `GET /api/users` | 1 | 0 | 65000 | 65000 | 65000 | ✖ No |
| `GET /api/users/me/llm-settings` | 1 | 0 | 65000 | 65000 | 65000 | ✖ No |

Informe completo: `tests/load/report_100_pool40.html`

## 5. Hallazgos

### H1 — El sistema aguanta 50 concurrentes; a 100 colapsa

Entre 10 y 50 usuarios el comportamiento es estable: el throughput escala de 4.9 a 19.6 req/s, el P90 agregado se mantiene en 2.1 s y la tasa de fallos cumple el criterio (0 % y 0.5 %). A 100 usuarios el throughput **cae** a 3.0 req/s, el P90 se dispara a 36 s y los fallos suben a 14.4 %: el sistema deja de atender más rápido de lo que recibe y las peticiones se encolan hasta agotar el timeout. El punto de saturación está entre 50 y 100 concurrentes.

### H2 — El cuello inmediato es el pool de conexiones

Durante CP-CARGA-03 el backend registró 14 excepciones de este tipo:

```
QueuePool limit of size 10 overflow 10 reached, connection timed out, timeout 30.00
```

Con `DB_POOL_SIZE=10` y `DB_MAX_OVERFLOW=10`, 100 usuarios concurrentes agotan las 20 conexiones y el resto espera 30 s antes de fallar con 500.

### H3 — Ampliar el pool mueve el cuello a Supabase

CP-CARGA-04 repite el escenario con 40+40 conexiones. El P50 mejora sensiblemente, pero el P90 sigue por encima de 60 s y aparece un error distinto, esta vez del lado del servidor de base de datos:

```
sqlalchemy.exc.InternalError: (psycopg.errors.InternalError_) (ECHECKOUTTIMEOUT)
unable to check out connection from the pool after 60000ms in Transaction mode
```

Es el pooler de Supabase (Supavisor, modo transacción) el que deja de entregar conexiones, no el pool local de SQLAlchemy. Ampliar el pool de la aplicación sólo desplaza el límite: el techo real lo pone el plan de la base de datos, agravado porque cada petición autenticada cruza de Perú a US-East (~150 ms por viaje) y las escrituras pesadas —`POST /api/ovas/save` construye y sube el paquete SCORM— retienen la conexión durante segundos.

### H4 — Las lecturas sin base de datos cumplen el umbral con holgura

Los endpoints de salud responden en un dígito de milisegundos incluso a 100 concurrentes. El coste está en el acceso a datos, no en el framework.

## 6. Conclusión y recomendaciones

| Nivel | Veredicto |
|---|---|
| 10 concurrentes | Operativo. Latencias altas en escrituras, sin errores de servidor. |
| 50 concurrentes | Operativo con degradación. Es la capacidad recomendada del despliegue actual. |
| 100 concurrentes | **No soportado** con la configuración actual. |

Recomendaciones, por orden de impacto esperado:

1. Acercar el backend a la base de datos (misma región que Supabase): la latencia de red por viaje domina el presupuesto de RN-001.
2. Sacar la construcción y subida del paquete SCORM del ciclo de la petición (ya existe un worker `arq`: `POST /api/ovas/save` puede encolarlo).
3. Subir `DB_POOL_SIZE`/`DB_MAX_OVERFLOW` en proporción a la concurrencia objetivo, sin pasar del límite del pooler de Supabase.
4. Revisar el umbral RN-001: 278 ms es inalcanzable para endpoints con escritura contra una base remota; conviene fijar presupuestos distintos para lectura y escritura.

## 7. Comparación con Apache JMeter

La corrida previa (18/07/2026) ejecutó el mismo escenario reducido con **Apache JMeter 5.6.3** (`tests/load/genova-loadtest.jmx`) y con Locust, para contrastar herramientas sobre los cuatro endpoints principales. Los resultados coincidieron dentro del margen esperado (diferencias < 10 % en P90), lo que valida el harness. Esa comparación se conserva en `tests/load/jmeter-report/` y en el histórico de este documento; la cobertura completa de los 120 endpoints se mantiene únicamente en Locust, donde el plan se define en Python y no en XML.

## 8. Limitaciones

- La carga se genera desde la **misma máquina** que ejecuta el backend: el cliente compite por CPU con el servidor.
- La base de datos es **remota y compartida** (Supabase, plan gratuito): sus límites de conexiones y su latencia geográfica forman parte de la medición.
- La generación real con LLM no se mide aquí (`LLM_FAKE=1`); su presupuesto es MTTG ≤ 180 s (RN-002) y se valida en el arnés de OE1.
- Los 404/409 contabilizados como respuesta válida están declarados por endpoint en `tests/load/locustfile.py`.

## 9. Artefactos

| Archivo | Contenido |
|---|---|
| `tests/load/locustfile.py` | Plan de carga: 120 endpoints, dos clases de usuario, siembra y política de códigos aceptables |
| `tests/load/run-load.ps1` | Ejecuta los tres niveles, valida umbrales y limpia |
| `tests/load/check_thresholds.py` | Gate RN-001 sobre el CSV |
| `tests/load/cleanup_load_data.py` | Purga de las OVAs y cuentas creadas |
| `scripts/serve-load.ps1` · `scripts/serve-load-pool.ps1` | Arranque del backend en modo carga |
| `tests/load/report_{10,50,100,100_pool40}.html` | Informes completos por nivel |
| `tests/load/report_*_stats.csv` · `report_*_failures.csv` | Datos crudos |
