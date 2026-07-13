# Plan — Auditoría diseño GenOVA, hallazgos 1–4

## Context

Revisión visual con playwright-cli (2026-07-13, sesión admin, desktop+mobile) detectó
4 problemas de diseño/consistencia. El usuario pidió atacar 1–4 ahora y dejar Better
Auth (item 5) para el final. Objetivo: UI consistente en íconos, que aproveche el
espacio en desktop, sin paneles vacíos ni warnings de render.

Hallazgo clave de la exploración: **no son 3 sino 4 sistemas de íconos**, y ya existe
infraestructura Phosphor activa (`@phosphor-icons/web` importado en `styles.css`, más
dos wrappers parciales `gn-nav-icon` y `resource-icons.ts`). Por eso el objetivo de
consolidación es **Phosphor web-font** (`ph ph-*`), no introducir una librería nueva.
`@ng-icons/*` está instalado pero 100% muerto → se elimina.

Decisión de layout (confirmada con el usuario): **ensanchado moderado** — shell a
`max-w-7xl` (1280px), páginas heredan, Mis OVAs suma 4ª columna en `2xl` con tarjetas
de igual alto; forms angostos siguen centrados y legibles (no full-bleed).

---

## Item 1 — Consolidar íconos en Phosphor

### Estrategia
1. **Crear un componente `<gn-icon>` genérico** en
   `frontend/src/app/layout/components/icon.component.ts` (o `core/components/ui/`):
   toma un nombre Phosphor y opcional peso/tamaño, renderiza `<i class="ph ph-{{name}}">`.
   Standalone, OnPush. Generaliza el patrón ya usado por `gn-nav-icon`
   (`nav-icon.component.ts`) que hoy tiene un mapa chico y hardcodeado.
2. **Cargar pesos faltantes**: `styles.css:11` solo importa `@phosphor-icons/web/regular`.
   Añadir `bold` y/o `fill` si algún ícono los necesita (verificar en conversión).
3. **Reemplazar los 3 sistemas ad-hoc por `<gn-icon>`**, por tiers (ver tabla de tareas):
   - **Emoji literales** (~40 sitios): `⚙📎🎨⚡` en `ova-create-form-card.component.html`;
     `🎯🔍💡🔨✅` en `phase-select.config.ts` (unificar con `PHASE_ICON_BY_KEY` de
     `resource-icons.ts`, que ya define los mismos como `ph-target`/`ph-magnifying-glass`/
     etc. — **eliminar la duplicación**); emoji en `llm-settings/*`, `admin/*`,
     `ova-library/papelera`.
   - **SVG inline crudos** (~25 archivos, `viewBox="0 0 256 256"`): `dashboard-page.html`(7),
     `navbar.component.html`(6), `totp-setup-card`(7), `password-change-form`(6),
     `mis-ovas-page.html`(3), etc. Mapear cada SVG a su equivalente Phosphor por nombre.
4. **Eliminar dependencias muertas**: quitar `@ng-icons/core` y `@ng-icons/lucide` de
   `frontend/package.json` (confirmado cero usos). Correr install para actualizar lock.

### Archivos infraestructura
- `frontend/src/app/layout/components/nav-icon.component.ts` (patrón base a generalizar)
- `frontend/src/features/ova-workspace/lib/resource-icons.ts` (ya tiene mapas Phosphor a reutilizar)
- `frontend/src/styles.css:11` (imports de pesos)
- `frontend/package.json` (quitar `@ng-icons/*`)

### Nota de riesgo
Es la tarea más grande (~65 archivos). Se hace **completa** (no dejar mitad, regla
CLAUDE.md), pero **dividida por área en subagentes** para mantener archivos ≤250 líneas
y revisar por tier. Cada archivo tocado debe pasar `pnpm lint` + `pnpm typecheck`.

---

## Item 2 — Layout: aprovechar espacio en desktop (moderado)

- **Shell**: `main-container.component.ts:15` — subir `max-w-6xl` → `max-w-7xl` (1280px).
- **Páginas con override propio más angosto** (heredar/subir a 7xl):
  - `dashboard-page.html:2` `max-w-5xl` → `max-w-7xl`
  - `models-page.component.html:1` y `:112` (barra sticky) `max-w-5xl` → `max-w-7xl`
  - `mis-ovas-page.html:1` ya `max-w-7xl` (ok; el binding real era el shell)
- **Mis OVAs grid** `mis-ovas-page.html:188`: `sm:grid-cols-2 xl:grid-cols-3` →
  añadir `2xl:grid-cols-4`; añadir `items-stretch` al grid y `h-full` a la raíz del card
  (`ova-card-shell.component.ts:63`) + `h-full` al wrapper `:190` para igualar alturas.
- **Crear-OVA** `ova-create-form-card.component.html:14`: `max-w-2xl` (672px) →
  `max-w-3xl`/`~900px` y mejorar el centrado vertical (hoy `my-auto` deja mucho hueco).
  Sigue siendo un form centrado, no full-bleed.
- **Dashboard stats/actividad** grids (`:50`, `:185` sm:grid-cols-3): revisar si suman
  paso `xl`/`2xl` para no quedar angostos al ensanchar el contenedor.

---

## Item 3 — Modal "Configurar recursos": panel derecho vacío + falta wireframe

Archivos: `frontend/src/features/ova-workspace/components/modals/phase-select-modal.component.ts`
(209 líneas — cerca del límite 250, cuidar al editar) + `resource-preview-panel.component.ts`
+ `frontend/src/features/ova-workspace/lib/previews/preview-types.ts` (modelo de datos).

### 3a. Panel vacío por defecto
Causa: `previewResource` es un **getter** que devuelve `hovered ?? últimoPick ?? null`;
`hovered` es un **campo plano** (no signal) en componente OnPush, así que el panel solo
tiene contenido durante hover activo y queda vacío el resto del tiempo.

Fix: **default no-vacío**. Que `previewResource` caiga, cuando no hay hover ni pick, al
**primer recurso de la fase actual** (`currentList[0]`) en vez de `null`. Convertir
`hovered` a `signal` para reactividad correcta bajo OnPush. Mantener el estado empty solo
en mobile (`hidden sm:flex`).

### 3b. Falta la previsualización/wireframe del recurso (nuevo, pedido por el usuario)
Hallazgo: el modelo de datos **ya define** por recurso un campo `wire: WireframeKind`
(12 tipos: `comic|video|audio|chat|lab|quiz|read|map|game|timeline|form|card`) y un campo
`returns` (qué recibe el estudiante) — ver `previews/preview-types.ts:1-23` y las tablas
`previews/engage.ts` etc. **Pero la UI no renderiza ninguno de los dos**:
`resource-preview-panel.component.ts` sólo pinta `bullets` + `format`. Por eso el panel
parece un resumen de texto sin "cómo quedará el recurso".

Fix: **construir un componente de mini-wireframe** que mapee cada `WireframeKind` a un
boceto de layout en CSS/SVG puro (no imágenes): p.ej. `comic` = grilla de viñetas,
`video` = rect 16:9 con ▶, `audio` = onda + play, `quiz` = líneas con radios, `timeline`
= línea con hitos, `chat` = burbujas, `game` = tablero, etc. Sin assets externos
(respetar CSP/patrón inline del proyecto).
- Nuevo: `frontend/src/features/ova-workspace/components/modals/resource-wireframe.component.ts`
  (standalone, OnPush, `input()` `wire` + `phaseColor`, ~1 boceto por kind vía `@switch`).
- Renderizarlo **arriba del bloque "Qué genera"** en `resource-preview-panel.component.ts`,
  dentro de un contenedor con aspecto fijo (p.ej. `aspect-video rounded-lg border`).
- Añadir también la línea **`returns`** ("Qué recibe el estudiante") que hoy tampoco se
  muestra, encima o debajo de los bullets.
- Cuidar el límite de 250 líneas: el switch de 12 bocetos probablemente exige que el
  wireframe sea su **propio componente** (o dividido en 2), no inline en el panel.
- Verificar que rinde bien en el ancho `w-72` del panel y que no rompe overflow.

---

## Item 4 — NG0956 track-by-identity en dashboard

Archivo: `frontend/src/features/ova-library/pages/dashboard-page.html`

- **Línea 51** (causa del warning size-3): `@for (stat of stats(); track stat)` →
  `track stat.label`. `stats()` es un computed que reconstruye 3 objetos nuevos cada vez;
  trackear por `label` (constante y único: "OVAs Creadas"/"En Progreso"/"Listas") elimina
  la recreación.
- **Línea 86** (defensivo): `@for (ova of recentOvas(); track ova)` → `track ova.id`
  (`OvaListItem.id` ya existe y se usa en `:126`).
- **Línea 186**: `@for (card of adminCards; track card)` — `adminCards` es constante de
  módulo, no recrea; se puede dejar o pasar a `track card.title` por consistencia.

---

## Tabla de tareas (subagentes por modelo)

| # | Tarea | Depende | Modelo | Archivos | Estado |
|---|---|---|---|---|---|
| T1 | Infra íconos: `<gn-icon>` + pesos styles.css + quitar `@ng-icons/*` | — | sonnet | icon.component.ts, nav-icon.ts, styles.css, package.json | done (gn-icon listo; quitar @ng-icons/* queda BLOQUEADO — libs/ui/** vendored de Spartan lo usa de verdad, requiere migrarlos primero, fuera de alcance de este plan) |
| T2 | Íconos: flujo crear-OVA + 5E (emoji→Phosphor, unificar phase icons) | T1 | sonnet | ova-workspace/creation/*, modals/phase-select-*, phase-select.config.ts, resource-card | done |
| T3 | Íconos: llm-settings + admin (emoji→Phosphor) | T1 | sonnet | llm-settings/*, admin/* | done |
| T4 | Íconos: SVG inline→Phosphor (dashboard, navbar, profile, auth, mis-ovas) | T1 | sonnet | ~15 .html/.ts con `<svg 256>` | done (49 svg → gn-icon en 25 archivos, ver tasks/T4.md) |
| T5 | Layout moderado (shell 7xl, páginas, grid 4-col, crear-OVA) | — | sonnet | main-container, dashboard-page, models-page, mis-ovas-page, ova-card-shell, ova-create-form-card | done |
| T6 | Modal recursos: default no-vacío + hovered→signal + componente mini-wireframe por `wire` + render `returns` | — | sonnet | phase-select-modal.component.ts, resource-preview-panel.component.ts, NUEVO resource-wireframe.component.ts | done |
| T7 | NG0956 track fix dashboard | — | haiku | dashboard-page.html | done |

T1 bloquea T2/T3/T4 (necesitan `<gn-icon>`). T5/T6/T7 independientes → en paralelo con
T1. Tras T1, T2/T3/T4 en paralelo.

---

## Verificación

1. `./verify.ps1 -Quick` (lint ESLint estricto + typecheck ngc + unit BDD) tras cada tarea.
2. `./verify.ps1` completo al cerrar todas.
3. **Playwright visual** (backend+frontend ya corriendo en local): re-capturar
   login/dashboard/crear-ova/modal-recursos/mis-ovas/models en desktop 1920 + mobile 390,
   comparar contra los shots previos en `.playwright-cli/shots/`. Confirmar:
   - cero emoji/SVG-crudo visibles como íconos (todo Phosphor),
   - contenido ocupa ~1280px sin margen muerto grande,
   - grid Mis OVAs con 4 columnas en 2xl y alturas iguales,
   - panel derecho del modal recursos con contenido por defecto,
   - **mini-wireframe visible por recurso** (boceto según `wire`) + línea `returns`,
   - consola sin NG0956 en /dashboard.
4. Commit propuesto al final (Conventional Commits, sin push) — esperar aprobación.

## Fuera de alcance
- Item 5 (Better Auth): cambio arquitectónico grande → pasar por `spec_author` (flujo SDD)
  después de cerrar 1–4.
