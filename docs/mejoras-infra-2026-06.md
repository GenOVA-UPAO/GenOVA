# Mejoras de infraestructura y robustez (2026-06)

> Tanda de mejoras transversales (resiliencia, observabilidad, tiempo real, calidad) sobre el
> stack existente. Ninguna cambia el comportamiento por defecto cuando su dependencia opcional
> (Redis, tokens) no está presente: todas degradan a un fallback seguro.

| # | Mejora | Capa | Activación |
|---|---|---|---|
| 1 | Error boundaries | Frontend | siempre |
| 2 | Progreso de generación en vivo (SSE) | Full-stack | siempre (con fallback a polling) |
| 3 | Cola de jobs durable (arq + Redis) | Backend | `REDIS_URL` |
| 4 | Rate-limit distribuido | Backend | `REDIS_URL` |
| 5 | Observabilidad Logfire | Backend | `LOGFIRE_TOKEN` |
| 6 | Redacción de PII/secretos en logs | Backend | siempre |
| 7 | TanStack mutations en biblioteca OVA | Frontend | siempre |
| 8 | Tests de componente (Vitest + RTL) | Frontend | dev/CI |
| 9 | TypeScript habilitado (adopción incremental) | Frontend | dev/CI |

---

## 1. Error boundaries (frontend)

`react-error-boundary` envuelve toda la app (`App.jsx` → `RootErrorBoundary`). Un error de render
en cualquier ruta muestra un fallback accesible (estética Editorial Académico UPAO, responsive) con
"Reintentar" e "Ir al inicio", en vez de dejar la pantalla en blanco. Se **resetea al navegar**
(`resetKeys=[pathname]`) y reporta a Sentry vía `captureException` (no-op sin DSN).

- `frontend/src/core/components/RootErrorBoundary.jsx`
- `frontend/src/core/lib/sentry.ts` (`captureException`)
- Test: `frontend/src/core/components/RootErrorBoundary.test.jsx`

## 2. Progreso de generación en vivo (SSE)

`sse-starlette` expone `GET /api/ova/jobs/{id}/stream`: empuja el mismo snapshot que el endpoint de
polling (`job_to_dict`, owner-scoped, sesión DB fresca por tick) hasta estado terminal. El frontend
lo consume con `@microsoft/fetch-event-source` (respeta cookies `credentials: 'include'`) y vuelca
cada snapshot en la cache de TanStack Query. El polling no desaparece: pasa a **heartbeat de 15 s**
mientras el SSE está sano y vuelve a 2 s si la conexión falla (algunos proxies bufferean SSE).

- `backend/generation/jobs/jobs_stream.py`
- `frontend/src/features/ova_workspace/hooks/useJobStream.js`
- `frontend/src/features/ova_workspace/hooks/useOvaJob.js`

## 3–4. Cola arq + Redis y rate-limit distribuido

Con `REDIS_URL`, `_launch` encola la generación en **arq** (worker `worker.WorkerSettings`,
proceso separado y durable) en vez de un thread daemon; si no hay Redis o el enqueue falla, cae al
thread inline. El limiter de slowapi pasa a estar **respaldado en Redis** (`storage_uri`), así los
límites valen entre instancias. Ver [deployment.md](deployment.md) § Worker.

- `backend/generation/jobs/queue.py`, `backend/worker.py`
- `backend/generation/jobs/jobs_router.py` (`_launch`)
- `backend/core/rate_limit.py`

## 5. Observabilidad Logfire

`logfire` (opt-in con `LOGFIRE_TOKEN`, espeja el patrón de Sentry) instrumenta FastAPI + SQLAlchemy
+ SDK OpenAI → tracing distribuido y **token/cost tracking** por llamada LLM. Sin token, no-op.

- `backend/core/observability.py` (`init_logfire`), cableado en `backend/main.py`.

## 6. Redacción de PII/secretos en logs

`RedactingFilter` enmascara correos, `Bearer …`, JWT y claves con prefijo (`sk-`, `gsk_`, …) en
todo log, como red de seguridad de la regla dura R8. **No** toca UUIDs/ids de job (útiles para
depurar). Cubierto por tests unitarios sin DB.

- `backend/core/log_redaction.py`, test `backend/tests/test_log_redaction.py`.

## 7. TanStack mutations (biblioteca OVA)

Las tres acciones que mutan el servidor (mover a papelera, papelera en lote, duplicar) pasan por
`useMutation` con invalidación de la query `['ovaList']`; los flags de pending se derivan de la
mutación en vez de `useState` sueltos.

- `frontend/src/features/ova_workspace/hooks/useOvaList.js`

## 8. Tests de componente (Vitest + Testing Library)

`vitest run` (`pnpm --filter frontend test`) con happy-dom + `@testing-library/react`. Primer test:
`RootErrorBoundary`. Config en `frontend/vitest.config.js` + `vitest.setup.js`.

## 9. TypeScript habilitado (adopción incremental)

`frontend/tsconfig.json` (strict, `allowJs`, Vite/esbuild ya transpila .ts/.tsx) + script
`pnpm --filter frontend typecheck`.

**Unlock del runner de tests:** los unit BDD (cucumber-js, Node) importan módulos `core/lib` por
ruta. Para poder migrarlos sin romper el suite, `test:unit` corre con `tsx`
(`cross-env NODE_OPTIONS=--import=tsx`), que resuelve `.ts` (y specifiers `.js`→`.ts`).

**Migración archivo por archivo (procedimiento):** renombrar `*.jsx`→`*.tsx` / `*.js`→`*.ts`,
tipar firmas/props (genéricos donde aplique), y actualizar los imports que apuntan al archivo
(quitar la extensión `.js`, p. ej. `'@/core/lib/sentry'`). Verificar `typecheck` + `test:unit` +
`build` + `lint` por tanda. Orden: `core/lib` → `services` → `hooks` → `components`/`pages` por
feature; al final quitar `allowJs`.

**Progreso:** **toda la capa `core/lib/` migrada a TypeScript** (21 módulos, 0 `.js`): `ova/`,
`llm/`, `uploads/`, `schemas/`, `http`, `me`, `utils`, `permissions`, `roleUtils`, `queryClient`,
`labQuality`, `motionFeatures`, `sentry` — con interfaces (`ResourceVM`, `JobOutcome`, `Entry`,
`MeUser`, `HttpError`, …) y genéricos donde aplica. Importadores actualizados (frontend + tests).
De paso se eliminó duplicación (modularidad): `FileChip` y `useOvaUploads` ahora reusan
`formatSize` y `validateFileAdd` de `core/lib/uploads/*` en vez de reimplementarlos.

**Reorganización por concern** (los módulos sueltos de `core/lib/` se agruparon en carpetas):
`core/lib/http/` (`client`, `queryClient`), `core/lib/auth/` (`me`, `permissions`, `roleUtils`),
`core/lib/observability/` (`sentry`), `core/lib/motion/` (`motionFeatures`). `utils.ts` (helper
`cn`) se mantiene en la raíz de `core/lib` por convención de shadcn. `components.json` alineado a
`@/core/*`.

**Capa `services/` migrada a TypeScript** (17 servicios: auth, verification, llmSettings, adminUsers,
analytics, userLinks, ovaHistory, ovaCreation, ovaEdit, ovaSettings, resourceConfigs, upload,
phaseService). Más dedup de modularidad: los **5 phase services idénticos** (`engageService`…
`evaluateService`) se colapsaron en un único `phaseService.ts` genérico parametrizado por fase; y
`ovaSettingsService` extrajo el patrón repetido a helpers `getJson`/`putJson`.

Pendiente: `hooks` → `components`/`pages` por feature; al final quitar `allowJs`.

## 10. Auditoría: responsive y uso de frameworks

- **Responsive (Tailwind):** 22/36 pages usan breakpoints (`sm:`/`md:`/`lg:`/`xl:`); el resto
  (auth, student) son cards centradas (`max-w-md w-full`) o contenedores fluidos (`max-w-5xl px-4`)
  que adaptan sin breakpoints. Sin pages rotas en móvil. (Los `wireframes/*` son mockups.)
- **Frameworks:** todos los instalados se usan — react-hook-form+Zod (11), TanStack Query (16),
  Motion (23), Radix/shadcn (10), Sonner (21), Phosphor (54), CVA (5); `clsx`/`tailwind-merge` vía
  el helper `cn`; `react-error-boundary` y `@microsoft/fetch-event-source` por esta tanda. Sin
  dependencias muertas.

---

## Verificación

```bash
# Frontend
pnpm lint && pnpm test:unit
pnpm --filter frontend test         # vitest (componentes)
pnpm --filter frontend typecheck    # tsc --noEmit
pnpm build

# Backend
cd backend && ruff check . && python scripts/sync_deps.py --check
pytest tests/test_log_redaction.py -q
```

_Trazabilidad de specs: EN-018 (SSE), EN-019 (arq/Redis), EN-020 (Logfire), EN-021 (error
boundaries + redacción PII), EN-022 (Vitest + TypeScript) en `sdd/specs/`._
