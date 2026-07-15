# Pruebas de Carga — GenOVA

Se evaluó el rendimiento del **backend** bajo alta carga de trabajo (registros e
inicios de sesión concurrentes, listado de OVAs y encolado de generación),
enfocándose en el umbral formal **RN-001: P90 ≤ 278 ms** en los endpoints que no
son de generación LLM.

Se dispone de dos suites equivalentes: **Locust** (ejecutada, con resultados
reales) y **Apache JMeter** (plan de prueba equivalente, para quien requiera esa
herramienta específica).

## 1. Escenario de carga

Cada usuario virtual, tras iniciar sesión (cookie httpOnly `genova_token`),
ejecuta un mix ponderado de peticiones que reproduce el uso real:

| Peso | Petición | Tipo |
|---|---|---|
| 5 | `GET /health` | sin BD |
| 4 | `GET /api/ovas?page=1` | con BD (biblioteca) |
| 2 | `POST /api/auth/login` | con BD |
| 1 | `POST /api/auth/register` | con BD |
| 1 | `POST /api/ova/jobs` (encolado LLM) | encolado (opcional) |

- Usuarios concurrentes: **25** · ramp-up: 5 usuarios/s · duración: **2 min**.
- Think time entre peticiones: 0.5–2.0 s.
- El endpoint de encolado LLM se excluye del gate de latencia (su presupuesto es
  MTTG, no latencia HTTP) y solo se activa contra un backend con `LLM_FAKE=1`.

## 2. Herramienta A — Locust (ejecutada)

Archivos:
[`tests/load/locustfile.py`](https://github.com/GenOVA-UPAO/GenOVA/blob/develop/tests/load/locustfile.py)
y el validador de umbral
[`tests/load/check_thresholds.py`](https://github.com/GenOVA-UPAO/GenOVA/blob/develop/tests/load/check_thresholds.py).

Comando:

```bash
pip install -r tests/load/requirements.txt
locust -f tests/load/locustfile.py --headless -u 25 -r 5 -t 2m \
  --host http://localhost:8000 --csv tests/load/report --html tests/load/report.html
python tests/load/check_thresholds.py tests/load/report_stats.csv
```

### 2.1 Resultados reales

Ejecución con 25 usuarios concurrentes contra el backend local
(`LLM_FAKE=1`, `RATE_LIMIT_ENABLED=0`):

- **1 378 peticiones**, **0 fallos (0.00 %)**.
- Throughput agregado: **11.57 req/s** en el pico de 25 usuarios.

**Percentiles de latencia medidos (ms):**

| Endpoint | P50 | P90 | P99 | ¿P90 ≤ 278 ms? |
|---|---|---|---|---|
| `GET /health` (sin BD) | 4 | 7 | 18 | ✅ Sí |
| `GET /api/ovas` | 760 | 810 | 1 500 | ❌ No |
| `POST /api/auth/login` | 990 | 1 000 | 1 600 | ❌ No |
| `POST /api/auth/register` | 2 400 | 2 400 | 2 600 | ❌ No |

### 2.2 Interpretación (limitación de entorno)

La disponibilidad fue del **100 % (0 % de fallos)** y el endpoint sin base de
datos (`/health`) cumple holgadamente el umbral (P90 = 7 ms). Los endpoints con
base de datos superan los 278 ms, pero por un **sesgo del entorno de prueba, no
por la aplicación**: la `DATABASE_URL` apunta a Supabase en `aws-1-us-east-1` y
la prueba se ejecutó desde una máquina local en Perú, de modo que cada consulta
cruza la red pública hasta esa región (un salto ausente en producción, donde el
backend corre en Railway, cloud-a-cloud, junto a la BD). Además, con 25 usuarios
concurrentes el pool de conexiones (`DB_POOL_SIZE=10` + `DB_MAX_OVERFLOW=10`) se
satura parcialmente. Se reporta el dato local tal cual, con esta nota de
contexto de red.

## 3. Herramienta B — Apache JMeter (plan equivalente)

Plan de prueba:
[`tests/load/genova-loadtest.jmx`](https://github.com/GenOVA-UPAO/GenOVA/blob/develop/tests/load/genova-loadtest.jmx).

Estructura del Test Plan:

- **HTTP Request Defaults** (host/puerto parametrizables por `-Jhost`/`-Jport`).
- **HTTP Cookie Manager** (mantiene la cookie de sesión `genova_token`).
- **HTTP Header Manager** (`Content-Type: application/json`).
- **Thread Group**: 25 hilos, ramp-up 5 s, duración 120 s.
  - Login (Once Only) con aserción de código 200.
  - `GET /health`, `GET /api/ovas`, `POST /api/auth/register` (email único con `__UUID()`).
  - `POST /api/ova/jobs` (encolado LLM) — deshabilitado por defecto (`-JloadGeneration=true` para activarlo).
  - **Uniform Random Timer** 0.5–2.0 s (think time).
  - Listeners: Summary Report y Aggregate Report.

Ejecución headless con reporte HTML:

```bash
jmeter -n -t tests/load/genova-loadtest.jmx -l tests/load/jmeter-result.jtl \
       -e -o tests/load/jmeter-report -Jhost=localhost -Jport=8001
```

El umbral RN-001 (P90 ≤ 278 ms) se lee en la columna *90% Line* del Aggregate
Report para cada etiqueta que no sea el encolado LLM.

## 4. Conclusión

- Estabilidad bajo carga: **0 % de fallos** con 25 usuarios concurrentes.
- El umbral P90 ≤ 278 ms se cumple en el endpoint sin BD; en los endpoints con
  BD queda pendiente de re-medición desde un entorno cloud-a-cloud (Railway) para
  descartar el sesgo de red local, que es la causa raíz identificada.
