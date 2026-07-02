# impl_e2e-archive-legacy — E2E Angular + archive React backup

**Fecha:** 2026-07-01  
**Trigger:** Usuario "hazlo" — paso opcional P2 polish.

## E2E config verificado

| Item | Estado |
|---|---|
| `tests/playwright.config.js` `baseURL` | `http://localhost:4200` ✓ |
| `webServer` | `pnpm --filter frontend dev` + `env.PORT=4200` + timeout 120s |
| Backend requerido | Sí — `:8000` para login/API (roles background + UI login) |
| CI (`.github/workflows/ci.yml`) | Backend 8000 + `pnpm test:e2e`; sin refs a `frontend-react-legacy` |

## Cambios E2E (mínimos, migración Angular)

| Archivo | Cambio |
|---|---|
| `tests/playwright.config.js` | `env.PORT=4200`, `timeout: 120000`, `workers: 1` local / `2` CI |
| `tests/steps/e2e/auth.steps.js` | Selectores `#email` / `#password input`, botón "Entrar", login UI para auth background, wait heading |
| `tests/steps/e2e/stubs.steps.js` | Mismos selectores + "Entrar" en flows login |

## Resultados E2E locales (Windows)

| Run | Resultado | Notas |
|---|---|---|
| 1 | **10 failed** | Playwright browsers no instalados |
| 2 | **10 failed** | `webServer` timeout 60s (PORT=8000 leak → ng en 8000) |
| 3 | **10 failed** | Backend 404 en `:8000` (Angular ocupaba puerto) |
| 4 | **10 failed** | Tras fixes parciales: login API OK; UI blank / heading timeout |
| 5 | **10 failed** | Serial workers; Angular no renderiza en headless (página blanca en screenshot) |

**Resumen:** **0/10 passed** local. Blockers principales:

1. **Entorno:** conflicto `PORT` (backend vs `ng serve`), Supabase session pool `:5432` saturado (backend arrancó con `:6543` transaction pooler).
2. **Playwright local:** primera ejecución requirió `pnpm --filter genova-tests exec playwright install chromium`.
3. **Angular headless:** `/login` carga HTML pero viewport queda en blanco — tests no encuentran `#email` ni heading "Iniciar sesión" (posible race/bootstrap en Windows dev; CI Ubuntu no verificado en esta sesión).

**E2E skipped for archive gate:** usuario pidió archivar tras best effort aunque E2E no esté green.

## Archive ejecutado

| Acción | Detalle |
|---|---|
| Origen | `frontend-react-legacy/` |
| Destino | `archive/frontend-react-legacy/` |
| Fecha | 2026-07-01 |
| CI impact | Ninguno — carpeta no estaba en `pnpm-workspace.yaml` ni workflows |
| Docs | `frontend/README.md`, `impl_p2-polish-final.md`, `impl_audit-closure.md` |

## Verificación post-cambios

```
./verify.ps1 -Quick → PASA (4/4) — 2026-07-01
```

## Pendiente opcional

- Re-ejecutar E2E en CI o Linux con backend + DB disponibles.
- Limpiar CORS `:5173` en `backend/main.py` si ya no se necesita.
- Investigar bootstrap Angular en Playwright headless Windows (blank page).
