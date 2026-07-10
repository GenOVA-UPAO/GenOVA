# Estrategia de pruebas

GenOVA usa **BDD (Gherkin)** en las tres capas funcionales. Las features (`.feature`) se
extraen de los `Escenarios BDD` de cada spec en `sdd/specs/`, garantizando trazabilidad
spec ↔ test (ver [matriz de trazabilidad](matriz-trazabilidad.md), generada por
`scripts/gen_traceability.py`). Encima hay capas complementarias: contrato de API,
accesibilidad y capacidad.

| Capa | Runner | ¿Browser? | ¿Backend vivo? | Velocidad |
|---|---|:--:|:--:|---|
| **unit** | cucumber-js | No | No | ~seg |
| **backend-bdd** | pytest-bdd + unit puros | No | **Sí** (`:8000`) | ~seg–min |
| **e2e** | playwright-bdd | **Sí** (Chromium) | **Sí** (`:8000` + `:4200`) | ~min |
| **a11y** | Playwright + axe-core | **Sí** | Sí | ~min |
| **contrato** | Schemathesis (desde OpenAPI) | No | **Sí** | ~min |
| **carga** | Locust | No | **Sí** | configurable |

---

## Cómo correr

```bash
# Unit (sin browser ni backend) — lógica pura de frontend/src (auth, workspace, calidad)
pnpm test:unit

# E2E (levanta el frontend solo; requiere backend en :8000)
pnpm test:e2e
pnpm test:e2e:ui        # modo interactivo Playwright

# Accesibilidad (axe-core WCAG 2.0 A/AA sobre login/registro/dashboard/mis-ovas)
pnpm test:a11y

# Backend BDD + unit puros (BDD requiere backend en :8000)
cd backend
pytest tests/step_defs/ -v --tb=short
pytest tests/test_auth_validation.py tests/test_auth_throttle.py -v   # unit puros, sin backend

# Carga (backend en :8000 con RATE_LIMIT_ENABLED=0 y LLM_FAKE=1)
pip install -r tests/load/requirements.txt
locust -f tests/load/locustfile.py --headless -u 25 -r 5 -t 2m \
  --host http://localhost:8000 --csv tests/load/report --html tests/load/report.html
python tests/load/check_thresholds.py tests/load/report_stats.csv   # gate RN-001 (P90 ≤ 278 ms)
```

Orquestador local (harness):

```powershell
./verify.ps1          # lint + unit + backend BDD (si el backend está activo)
./verify.ps1 -Quick   # solo lint + unit (sin backend)
./verify.ps1 -E2E     # incluye Playwright E2E (requiere ambos servidores)
```

> **Flags de test del backend** (`backend/.env.example`, NUNCA en producción):
> `LLM_FAKE=1` sustituye la generación LLM por HTML determinista (los jobs llegan a
> `done` en segundos, sin cuota de Groq/OpenRouter); `RATE_LIMIT_ENABLED=0` apaga
> SlowAPI (la suite e2e completa hace ~20 logins y la carga muchos más).
> Para correr la suite e2e completa en local, exporta ambos antes de levantar uvicorn.

---

## Estructura

```
tests/                          # workspace pnpm "genova-tests"
├── features/                   # .feature por dominio (auth, ova, roles, layout, setup)
│   └── e2e/                    # escenarios EJECUTABLES por HU (flujos reales en browser);
│                               #   los verbatim de specs quedan como documentación/trazabilidad
├── steps/
│   ├── unit/                   # importa lógica pura de frontend/src (sin red)
│   └── e2e/                    # steps Playwright + _helpers.js (seeding vía API con LLM_FAKE)
├── a11y/                       # auditoría axe-core (Playwright plano, sin BDD)
├── load/                       # locustfile.py + check_thresholds.py (gate RN-001)
├── cucumber.unit.config.mjs    # config del runner unit
├── playwright.config.js        # config e2e (webServer local o E2E_EXTERNAL=1 vs deploy real)
└── playwright.a11y.config.js   # config a11y

backend/tests/
├── conftest.py                 # fixtures: base_url, admin_token, user_token
├── step_defs/                  # BDD pytest-bdd (auth, ova, roles, jobs, llm-config…)
├── specs/                      # specs de calidad de recursos
└── test_*.py                   # unit puros (auth_validation, auth_throttle, scorm…) y
                                #   manuales contra API viva (agents_io, resource_quality)
```

La suite e2e ejecutable siembra sus propios datos con títulos/correos únicos por
escenario (vía `POST /api/ova/jobs` + polling hasta `done` con `LLM_FAKE=1`), así que
puede correr repetidamente contra la misma base de datos de test. Los escenarios
`@smoke` son de solo-lectura (o no escriben nada persistente) y son los únicos que se
ejecutan contra develop.

---

## CI/CD

`.github/workflows/ci.yml` corre en cada **push** / **PR** a `develop` o `main`:

```
lint-frontend ─────────┐
lint-backend ──────────┤
backend-bdd ───────────┼──→ e2e (+ a11y)
frontend-unit (BDD) ───┘
api-contract (paralelo, continue-on-error)
security-audit (paralelo)
```

| Job | Hace |
|---|---|
| `lint-*` | ESLint (frontend) + `ruff check` + paridad de deps (backend) |
| `frontend-unit` | `pnpm test:unit` (cucumber-js) |
| `backend-bdd` | levanta backend bajo coverage, corre BDD + unit puros; gate `fail_under=35` |
| `api-contract` | **Schemathesis**: genera casos desde `/openapi.json` (caja negra automática) |
| `e2e` | Chromium + backend con `LLM_FAKE=1`; corre `pnpm test:e2e` y `pnpm test:a11y` (a11y informativo — `continue-on-error` hasta corregir las violaciones que encontró la primera pasada: contraste de color, estructura de lista del sidebar, un botón sin nombre y un select sin nombre accesible); sube el reporte SIEMPRE |
| `security-audit` | `pnpm audit --prod` + `pip-audit` |

**Workflows disparables a demanda** (además del CI):

| Workflow | Qué hace |
|---|---|
| `e2e-develop.yml` | Playwright `@smoke` contra el deploy real de develop (Vercel + Railway); también corre a diario 07:00 UTC |
| `load-test.yml` | Locust contra backend en el runner (con gate RN-001) o contra Railway develop (informativo) |

### Disparar tests desde el CLI de GitHub

```bash
# E2E contra develop (requiere el secret VERCEL_AUTOMATION_BYPASS_SECRET)
gh workflow run e2e-develop.yml
gh workflow run e2e-develop.yml -f base_url=https://otra-preview.vercel.app -f tags=@smoke

# Carga
gh workflow run load-test.yml -f users=50 -f duration=3m
gh workflow run load-test.yml -f target=develop        # solo reporte, sin gate

# Seguimiento y reportes
gh run watch                                   # ver el run en vivo
gh run download -n playwright-report-develop   # reporte HTML e2e (traces + video)
gh run download -n locust-report               # reporte HTML de carga
```

> `workflow_dispatch` solo aparece cuando el workflow existe en la rama default:
> tras el primer merge a `develop` ya se pueden disparar.

**Secrets requeridos** en el repo:

| Secret | Uso |
|---|---|
| `TEST_DATABASE_URL` | PostgreSQL de test (no producción) |
| `TEST_JWT_SECRET` | Secret JWT de test (≥16 chars) |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Bypass de Deployment Protection para `e2e-develop` (Vercel → Project → Deployment Protection) |

> Las claves LLM en CI son dummy: los tests corren con `LLM_FAKE=1` y no llaman a proveedores.

---

## Reportes visuales (el "TestSprite" gratis)

- El job `e2e` y `e2e-develop` suben **siempre** el reporte HTML de Playwright con
  screenshots, **video** (`retain-on-failure`) y **traces**. El trace viewer
  (`npx playwright show-trace trace.zip`) muestra timeline, cada acción, red y consola.
- `locust-report` incluye el HTML con gráficas de RPS/latencia por endpoint.
- Los `.feature` en Gherkin son el "documento de tests" legible por humanos; la
  [matriz de trazabilidad](matriz-trazabilidad.md) cruza cada requisito con sus capas
  de cobertura y lista los huecos explícitamente (regenerar con
  `python scripts/gen_traceability.py`).

---

## Pruebas manuales

**Smoke con playwright-cli** contra prod/develop: `tests/playwright-smoke/SMOKE_TESTS.md`.

**Scripts contra API viva** (no corren en CI):

```bash
cd backend
python tests/test_latency.py          # benchmark RN-004 (P50/P90 por endpoint)
python tests/test_agents_io.py
python tests/test_resource_quality.py
python tests/test_rag_uploads.py
```

Override vía env: `BASE`, `EMAIL`, `PASS`, `PHASE`, `TYPE`, `CONCEPT`.

_Fuentes: `tests/`, `backend/tests/`, `package.json`, `.github/workflows/`, `verify.ps1`._
