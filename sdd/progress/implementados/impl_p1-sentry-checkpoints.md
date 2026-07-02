# P1 — Sentry wiring + CHECKPOINTS C12 (Angular)

## Archivos cambiados

| Archivo | Cambio |
|---|---|
| `frontend/src/core/lib/observability/sentry.ts` | **Nuevo** — port de React legacy: `initSentry`, `captureException`, `getSentryDsn`, `isSentryEnabled`; DSN vía `window.__GENOVA_SENTRY_DSN__` |
| `frontend/src/main.ts` | `await initSentry()` antes de `bootstrapApplication` |
| `frontend/src/app/app.config.ts` | `createErrorHandler` de `@sentry/angular` cuando hay DSN |
| `CHECKPOINTS.md` | Sección C12 frontend → stack Angular |
| `docker-compose.yml` | Eliminado `VITE_API_BASE_URL` obsoleto (Angular usa `window.__GENOVA_API_BASE__` / defaults) |

## Env Sentry

Inyectar antes del bootstrap:

```html
<script>window.__GENOVA_SENTRY_DSN__ = 'https://…@…ingest.sentry.io/…';</script>
```

Deploy: sustituir desde env `GENOVA_SENTRY_DSN`. Sin DSN → no init (dev local OK).

## Criterios → verificación

| Criterio | Verificación |
|---|---|
| `@sentry/angular` wired | `main.ts` + `app.config.ts` + `sentry.ts` |
| ErrorHandler integration | `createErrorHandler({ showDialog: false })` en providers |
| DSN environment-driven | `window.__GENOVA_SENTRY_DSN__` documentado en comentario |
| CHECKPOINTS C12 Angular | 11 bullets actualizados en CHECKPOINTS.md |
| Build pasa | `pnpm build` exit 0 (2026-07-01) |

## Build

```
pnpm build → exit 0
Output: frontend/dist/frontend-ng
Warning: initial bundle budget exceeded (pre-existing)
```
