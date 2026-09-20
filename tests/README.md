# GenOVA — Tests

| Suite | Comando | Qué cubre |
|-------|---------|-----------|
| Unit componentes (vitest) | `pnpm test:vitest` | Specs `frontend/src/**/*.spec.{ts,tsx}` (libs puras, hooks y componentes con Testing Library). |
| Typecheck (tsc) | `pnpm typecheck` | `tsc -b --noEmit` sobre `frontend/` (proyecto React + Vite). |
| Lint frontend | `pnpm lint` | ESLint del frontend (`frontend/eslint.config.js`). |
| Unit BDD (cucumber-js) | `pnpm test:unit` | Steps unit puros (validadores, view-models, libs) contra `tests/steps/unit/**`. |
| E2E (playwright-bdd) | `pnpm test:e2e` | `tests/features/e2e/*.feature`, `features/auth/HU-008_login.feature` y `features/roles/HU-018_crear-rol.feature`. |
| A11y (axe-core) | `pnpm test:a11y` | Auditoría WCAG 2.0 A/AA; requiere el mismo backend/frontend que e2e. |
| Lighthouse | `pnpm test:lighthouse` | Rendimiento (FCP/LCP/TBT/CLS) por ruta en móvil y escritorio, sobre build de producción con API stub. No necesita backend. |
| Carga (JMeter/Locust) | ver `tests/load/` | Pruebas de carga contra un entorno propio. |
| Smoke manual | `tests/playwright-smoke/SMOKE_TESTS.md` | Guion manual con playwright-cli contra develop/producción. |

Los tres primeros (vitest, typecheck, lint) y cucumber solo necesitan `pnpm install`:

```bash
pnpm lint && pnpm typecheck && pnpm test:vitest && pnpm test:unit
```

## Suite E2E

`pnpm test:e2e` genera los specs con `bddgen` y corre Playwright. En local levanta
Vite (`webServer`, reutiliza uno ya activo en `http://localhost:4200`); en CI corre
contra el frontend y backend que el job `e2e` de `.github/workflows/ci.yml` levanta
(Postgres efímero + `uvicorn` en `:8000`, proxy de Vite `/api -> :8000`).

### LLM_FAKE=1 es obligatorio para la suite completa

Los escenarios de generación (HU-002 generación completa, HU-004, HU-006, HU-012,
HU-013 y HU-025) hacen `POST /api/jobs` y esperan un OVA terminado. La suite completa
**requiere un backend con `LLM_FAKE=1`** (`backend/prometheus/engine/graph.py` →
`fake_invoke.py`), que genera HTML determinista en segundos sin proveedores LLM:

- Un recurso por fase seleccionada, con `status: "done"` y HTML
  `<h1>{prompt}</h1><p>Recurso de prueba ({fase} / {recurso}) generado con LLM_FAKE=1.</p>`.
- El job termina `done` en <1s y materializa el OVA con los títulos de recurso de
  `RECURSOS_META` ("Cómic Interactivo", "Lectura Interactiva", …), así que los steps
  verifican esos títulos y el botón "Descargar SCORM", nunca contenido real.
- El job `e2e` de CI ya define `LLM_FAKE: '1'` (y `RATE_LIMIT_ENABLED: '0'`); no hay
  que tocar nada para CI.

`e2e-develop.yml` es la variante contra el deploy remoto de develop: solo corre
`@smoke` por defecto y **no** ejecuta escenarios de generación, por lo que no usa
LLM_FAKE. Si se lanza con otros tags contra un backend real, gastaría cuota LLM.

### Correr la suite completa en local sin gastar cuota

El backend local de `:8000` suele estar conectado a proveedores reales. Para probar
los escenarios de generación sin coste se levanta un stack aparte — backend
determinista en `:8100` y frontend en `:4300` — y se apunta la suite ahí:

```bash
# 1) Backend determinista en :8100 (misma BD de pruebas y usuarios)
cd backend
LLM_FAKE=1 RATE_LIMIT_ENABLED=0 uv run uvicorn main:app --port 8100

# 2) Frontend en :4300. GENOVA_DEV_BACKEND hace que el proxy de Vite apunte a
#    :8100 (vite.config.ts); para la suite no es imprescindible porque
#    E2E_API_ORIGIN inyecta la API directamente en el navegador.
cd frontend
GENOVA_DEV_BACKEND=http://127.0.0.1:8100 pnpm dev --port 4300

# 3) Suite completa desde tests/ (:4300 no es el puerto del webServer, así que
#    E2E_EXTERNAL=1 evita que Playwright levante otro Vite en :4200)
cd tests
E2E_EXTERNAL=1 BASE_URL=http://localhost:4300 E2E_API_ORIGIN=http://localhost:8100 pnpm test:e2e
```

En Windows (cmd), los mismos pasos por línea:

```bat
set "LLM_FAKE=1" & set "RATE_LIMIT_ENABLED=0" & cd backend & uv run uvicorn main:app --port 8100
set "GENOVA_DEV_BACKEND=http://127.0.0.1:8100" & cd frontend & pnpm dev --port 4300
set "E2E_EXTERNAL=1" & set "BASE_URL=http://localhost:4300" & set "E2E_API_ORIGIN=http://localhost:8100" & cd tests & pnpm test:e2e
```

- `E2E_EXTERNAL=1` desactiva el `webServer` de `tests/playwright.config.js`: la suite
  usa el frontend ya levantado en `:4300`. El header de bypass de Vercel solo se
  envía si existe `VERCEL_AUTOMATION_BYPASS_SECRET` (contra un backend local esas
  cabeceras rompen el preflight CORS de `/api/auth/me`).
- `E2E_API_ORIGIN=http://localhost:8100` inyecta `window.__GENOVA_API_BASE__` para que
  el navegador llame a esa API (`tests/steps/e2e/fixtures.js`) y
  `seedOvaViaApi`/el registro por API usen el mismo origen. Sin `E2E_API_ORIGIN` el
  comportamiento es el de siempre: same-origin vía proxy de Vite.
- Esa llamada es cross-origin (`:4300` → `:8100`). El backend tiene que listar el
  origen del frontend en CORS: `CORS_ORIGINS=http://localhost:4300,http://127.0.0.1:4300`
  (los defaults de `ENV=dev` cubren `:4200`, no `:4300`).
- El frontend y el backend determinista comparten la BD de pruebas y los usuarios de
  siempre (`admin@genova.ai` / `admin1234password`).

> Ojo: en un `.cmd`/`.bat`, invoca `pnpm` con `call` (es otro `.cmd`) y evita pasar
> argumentos por `%*` si vienen de WSL; usa variables de entorno o un script por paso.

### Lighthouse (rendimiento por página)

`pnpm test:lighthouse` audita rutas del frontend en **build de producción**
(`pnpm --filter frontend build` → `frontend/dist`) servidas por el propio runner
con un server estático que replica el deploy real: gzip como nginx, caché
inmutable en `/assets` y fallback SPA. El API está **stubeado** (`/api/auth/me`,
`/api/ovas`, `/api/ovas/papelera/count`, `POST /api/auth/login`; el resto del API
responde 404), así que las páginas autenticadas no dependen del backend. La
"sesión" es la cookie de stub `genova_lh_auth=1`, que el runner envía solo en las
rutas autenticadas vía `--extra-headers`: `/login` se audita como invitado y
`/dashboard` como usuario con sesión (rol administrador).

```bash
cd tests
pnpm test:lighthouse                      # /login y /dashboard (móvil + escritorio)
pnpm test:lighthouse /mis-ovas /profile   # cualquier ruta del router
node run-lighthouse.mjs --no-build        # reutiliza frontend/dist sin recompilar
```

- Cada ruta se audita dos veces: móvil (throttling por defecto de Lighthouse) y
  escritorio (`--preset=desktop`). Las rutas de auth/explore se auditan sin
  cookie; el resto se consideran autenticadas.
- Salida en `tests/lighthouse-reports/`: `<ruta>-<mobile|desktop>.report.html`
  y `.report.json` por cada combinación, `extra-headers.json` (cookie de stub) y
  el resumen `summary.json` / `summary.md` con la tabla de métricas.
- Requiere Chrome/Edge local. El runner detecta Chrome/Edge en sus rutas
  estándar (Windows/macOS) y, en WSL/Linux, el Chromium de Playwright
  (`~/.cache/ms-playwright/chromium-*/…`); si nada sirve, apunta `CHROME_PATH`.
  Sin Chrome en WSL (caso habitual), corre por Windows:
  `cmd.exe /c "node tests\run-lighthouse.mjs"`.
- El server escucha en **:4201** (no pisa el `:4200` del dev server/e2e);
  cambiable con `GENOVA_LH_PORT`. Si el puerto está ocupado el runner falla
  avisando, para no auditar por error otro server.

### Verificación del backend

```bash
cd backend
uv run ruff check .                        # lint (CI: uvx ruff check backend/)
uv run lint-imports                        # fronteras de arquitectura
uv run python scripts/check_module_size.py # tamaño de módulos (aviso)
uv run pytest                              # suite completa (necesita DATABASE_URL)
```

### Equivalencia con CI

| Job de `.github/workflows/ci.yml` | Comando local |
|-----------------------------------|---------------|
| `lint-frontend` | `pnpm lint` |
| `typecheck-frontend` | `pnpm typecheck` |
| `frontend-unit` (cucumber-js) | `pnpm test:unit` |
| `frontend-vitest` | `pnpm test:vitest` |
| `lint-backend` | `uvx ruff check backend/` + `uv run lint-imports` + `check_module_size.py` |
| `backend-bdd` | `uv run pytest tests/step_defs/ …` con Postgres y `BASE=http://localhost:8000` |
| `e2e` | `pnpm test:e2e` (backend `LLM_FAKE=1` en `:8000`) |
| `api-contract` | Schemathesis contra `/openapi.json` |
| `security-audit` | `pnpm audit --prod` + `uvx pip-audit` |

### Estado

36/36 escenarios pasan en local con backend `LLM_FAKE=1` (2026-09-19), incluido
"Generación completa desde el formulario hasta el workspace" (HU-002) tras el fix
`7f38a9b` que envía `resource_type` como string en `use-ova-creation.ts`.
