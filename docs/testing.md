# Estrategia de pruebas

GenOVA usa **BDD (Gherkin)** en las tres capas. Las features (`.feature`) se extraen
verbatim de los `Escenarios BDD` de cada spec en `sdd/specs/`, garantizando trazabilidad
spec ↔ test.

| Capa | Runner | ¿Browser? | ¿Backend vivo? | Velocidad |
|---|---|:--:|:--:|---|
| **unit** | cucumber-js | No | No | ~seg |
| **backend-bdd** | pytest-bdd | No | **Sí** (`:8000`) | ~seg–min |
| **e2e** | playwright-bdd | **Sí** (Chromium) | **Sí** (`:8000` + `:5173`) | ~min |

---

## Cómo correr

```bash
# Unit (sin browser ni backend) — ejercita frontend/src/lib (auth, calidad HTML)
pnpm test:unit

# E2E (requiere frontend + backend levantados)
pnpm test:e2e
pnpm test:e2e:ui        # modo interactivo Playwright

# Backend BDD (requiere backend en :8000)
cd backend
pytest tests/step_defs/ -v --tb=short
```

Orquestador local (harness):

```powershell
./verify.ps1          # lint + unit + backend BDD (si el backend está activo)
./verify.ps1 -Quick   # solo lint + unit (sin backend)
./verify.ps1 -E2E     # incluye Playwright E2E (requiere ambos servidores)
```

---

## Estructura

```
tests/                          # workspace pnpm "genova-tests"
├── features/                   # .feature por dominio (auth, ova, roles, layout, setup)
├── steps/
│   ├── unit/                   # auth_unit.steps.js, quality_unit.steps.js (sin red)
│   └── e2e/                    # auth.steps.js, ova.steps.js, roles.steps.js, stubs.steps.js
├── cucumber.unit.config.mjs    # config del runner unit
└── playwright.config.js        # config e2e (webServer: pnpm --filter frontend dev)

backend/tests/
├── conftest.py                 # fixtures: base_url, admin_token, user_token
├── step_defs/                  # test_auth_steps.py, test_ova_steps.py, test_roles_steps.py
├── specs/                      # specs de calidad de recursos
└── test_*.py                   # tests manuales contra API en vivo
```

**Tests manuales** (no corren en CI; pegan a una API en vivo):

```bash
cd backend
python tests/test_agents_io.py
python tests/test_resource_quality.py
python tests/test_rag_uploads.py
```

Override vía env: `BASE`, `EMAIL`, `PASS`, `PHASE`, `TYPE`, `CONCEPT`.

---

## CI/CD

`.github/workflows/ci.yml` corre en cada **push** / **PR** a `develop` o `main`:

```
lint ──────────────────┐
backend-bdd ───────────┼──→ e2e
frontend-unit (BDD) ───┘
```

| Job | Hace |
|---|---|
| `lint` | ESLint (frontend) + `ruff check` (backend) |
| `frontend-unit` | `pnpm test:unit` (cucumber-js) |
| `backend-bdd` | levanta backend, espera `/health`, corre `pytest tests/step_defs/` |
| `e2e` | instala Chromium, levanta backend + frontend, corre `pnpm test:e2e`; sube `playwright-report` si falla |

`e2e` depende de que `backend-bdd` y `frontend-unit` pasen.

**Secrets requeridos** en el repo:

| Secret | Uso |
|---|---|
| `TEST_DATABASE_URL` | PostgreSQL de test (no producción) |
| `TEST_JWT_SECRET` | Secret JWT de test (≥16 chars) |

> Las claves LLM en CI son dummy: los tests BDD no llaman a proveedores reales.

_Fuentes: `tests/`, `backend/tests/`, `package.json`, `.github/workflows/ci.yml`, `verify.ps1`._
