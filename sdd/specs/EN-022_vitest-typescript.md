# EN-022: Tests de componente (Vitest) y adopción de TypeScript

> Metadata:

| Campo | Valor |
|---|---|
| ID | EN-022 |
| Tipo | Habilitador |
| Épica/Tema | EP1: Especificación SDD / Calidad |
| Sprint | Sprint 3 |
| Status | in_progress |
| Prioridad | Media |
| Estimación | 5 SP |
| Dependencia | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-06-26 |

## Objetivo

Cerrar dos gaps de calidad del frontend: (a) cero tests de componente React; (b) JS puro sin
chequeo de tipos. Habilitar Vitest + Testing Library y la adopción **incremental** de TypeScript.

## Contexto

Solo había BDD (cucumber unit + 2 escenarios Playwright). El frontend era JS con `@types/*`
instalados pero sin usar. Los imports usan extensión `.js` explícita, así que la migración debe
ser archivo por archivo (renombrar + actualizar sus importadores).

## Alcance

- `vitest.config.js` (happy-dom, globals) + `vitest.setup.js`; script `test`; primer test
  (`RootErrorBoundary`).
- `tsconfig.json` (strict, `allowJs`, `checkJs:false`); script `typecheck`; reemplaza `jsconfig.json`.
- Primer módulo migrado: `core/lib/sentry.ts` (patrón de referencia).

## Criterios de aceptación

- `pnpm --filter frontend test` verde; `pnpm --filter frontend typecheck` (tsc --noEmit) verde.
- `pnpm build` y `pnpm lint` siguen verdes tras la migración del primer módulo.

## Pendiente (fases siguientes)

Migrar el resto: `core/lib` → `services` → `hooks` → `components`/`pages` por feature; al final
quitar `allowJs`. Procedimiento en [docs/mejoras-infra-2026-06.md](../../docs/mejoras-infra-2026-06.md) § 9.

## Archivos

`frontend/vitest.config.js`, `frontend/vitest.setup.js`, `frontend/tsconfig.json`,
`frontend/src/core/components/RootErrorBoundary.test.jsx`, `frontend/src/core/lib/sentry.ts`.
