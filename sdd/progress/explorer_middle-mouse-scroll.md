# Explorer report — middle-mouse-scroll Mapa arquitectura scroll/pan frontend

## Archivos relevantes

### Versiones clave (`frontend/package.json`)
| Paquete | Versión |
|---|---|
| `@angular/*` (core, router, forms, cdk, …) | `^22.0.0` / CDK `22.0.0` |
| `@angular/cli` / `@angular/build` | `^22.0.5` |
| `tailwindcss` + `@tailwindcss/postcss` | `^4.1.12` |
| `@spartan-ng/brain` (+ CLI) | `^1.0.4` (helm en `frontend/libs/ui`) |
| `@ngrx/signals` | `21.1.1` |
| `@tanstack/angular-query-experimental` | `5.101.2` |
| `@ng-icons/core` / lucide | `^32.2.0` |
| `driver.js` | `^1.6.0` |
| `rxjs` | `~7.8.0` |
| `typescript` | `~6.0.2` |
| `packageManager` | `pnpm@11.9.0` |

### Estructura app
- `frontend/src/app/` — bootstrap (`app.ts`, `app.config.ts`, `app.routes.ts`), layouts (`layout/shells/`, `layout/components/`).
- `frontend/src/features/` — dominios: `admin`, `analytics`, `auth`, `llm-settings`, `ova-library`, `ova-workspace`, `profile` (screaming architecture).
- `frontend/src/core/` — auth, HTTP, UI wrappers (`core/components/ui/`), directives, shared services/lib.
- `frontend/libs/ui/` — Spartan/helm (`@spartan-ng/helm`): button, dialog, select, tabs, dropdown, etc. (`components.json` → `componentsPath: "libs/ui"`).
- Patrón: **services (signals/fetch) → standalone components**; sin NgModules; OnPush + signals.

### Scroll / overflow (CSS, sin lógica middle-mouse)
- `frontend/src/styles.css:157-160` — `html, body { height: 100%; overflow: hidden }` → scroll solo en contenedores internos.
- `frontend/src/app/layout/shells/app-layout.ts` — shell `h-screen` + `overflow-hidden`; rutas `fullBleed` / `/workspace/` sin `gn-main-container`.
- `frontend/src/app/layout/components/main-container.component.ts` — `overflow-auto` (scroll principal de páginas normales).
- `frontend/src/app/layout/components/sidebar-menu.component.ts` — nav `overflow-y-auto`.
- `frontend/src/app/layout/shells/admin-layout.ts` — `main` `overflow-y-auto`.
- Workspace anidado: `ova-edit-view.component.html` → paneles `overflow-hidden`; chat `workspace-chat-panel.component.html` `overflow-y-auto`; OVA panel preview `overflow-hidden` / code `overflow-auto`.
- Modales / listas: `overflow-y-auto` + a veces `IntersectionObserver` (`manage-models-modal`, `model-catalog-browser`).
- `styles.css:224-237` — `prefers-reduced-motion` fuerza `scroll-behavior: auto`.

### Mouse / pointer / drag (únicos HostListeners globales)
- `frontend/src/features/ova-workspace/components/editor/workspace-resizable-divider.component.ts` — **único drag de paneles**: `(mousedown)` + `@HostListener("window:mousemove|mouseup")`; no filtra botón; setea `body` cursor/`userSelect`. Candidato a interferir con middle-click si `button===1` inicia drag.
- `frontend/src/app/layout/components/navbar.component.ts` — `@HostListener("document:mousedown")` cierra dropdown avatar (cualquier botón).
- `frontend/src/core/directives/modal-dismiss.directive.ts` — solo `keydown` Escape (no mouse).
- DnD HTML5 reorder: `workspace-resource-list.component.ts` (`draggable` / `dragstart`) — no middle-mouse.

### Canvas-like / preview con overflow anidado
- `frontend/src/core/components/html-preview-frame.component.ts` — iframe sandbox `allow-scripts allow-same-origin` + blob URL; scroll interno del documento embebido, fuera del árbol Angular.
- `frontend/src/features/ova-workspace/components/editor/workspace-html-preview.component.ts` — shell preview `h-full` + iframe `overflow-hidden` padre.
- `frontend/src/features/ova-workspace/components/editor/workspace-ova-panel.component.ts` — tabs Preview/Code; preview oculta overflow del panel.
- `frontend/src/features/ova-workspace/components/phase/html-preview.component.ts` / `ova-five-e-viewer` — previews/code con `overflow-auto` / `overflow-x-auto`.
- No hay `<canvas>`, pan/zoom custom, drag-to-scroll ni scrollbar custom en `src/`.

### Hallazgo crítico
**No existe código de wheel / auxclick / `button === 1` / middle-mouse / drag-to-scroll / scrollbar custom en el frontend Angular** (tampoco en archive React con búsqueda equivalente). Un bug de middle-mouse scroll/pan casi seguro es interacción de **overflow anidado + autoscroll nativo del browser** y/o **iframe**, no un handler propio faltante.

## Dependencias
- `AppLayout.fullBleed` → workspace usa cadena `overflow-hidden` en lugar de `MainContainer` `overflow-auto`.
- `WorkspaceResizableDivider` lee `containerRef` de `ova-edit-view` y emite `ratioChange` → ancho chat vs preview.
- `WorkspaceHtmlPreview` → `HtmlPreviewFrame` (iframe) → documento blob (eventos wheel/middle independientes del host).
- Spartan `hlm-select-scroll-up/down` — scroll de viewport del select, no pan de página.
- Directivas custom en `core/directives/`: solo `modal-dismiss` (+ UI directives label/input/button).

## Riesgos
- `html/body overflow: hidden` + muchos hijos `overflow-hidden` → middle-click autoscroll nativo puede fallar o “pegarse” al viewport equivocado.
- Iframe preview: middle-mouse dentro del iframe no llega a handlers Angular; fuera, el panel padre no scrollea (overflow hidden).
- Divider: `startDrag()` no comprueba `e.button === 0` → middle/right podrían activar resize + `userSelect: none`.
- Navbar `document:mousedown` escucha todos los botones (impacto bajo: solo cierra menú).
- `workspace-ova-panel` ~184 líneas (cerca del tope 250 ESLint); fix grande → extraer, no hinchar.
- Sin tests existentes de eventos mouse/scroll en esta área.

## Complejidad: 3/5
No hay feature de pan custom que arreglar: es diagnóstico cross-surface (shell CSS + workspace split + iframe) dentro del frontend. Un fix local (p.ej. ignorar middle en divider, o ajustar overflow de un contenedor) baja a **2**; si el síntoma es solo dentro del HTML del OVA en iframe, sube por sandbox/contenido generado.

## Escalación sugerida
- Spec corta + un `implementer` + `reviewer` si el fix toca divider + layout overflow.
- Antes de specear: confirmar superficie (página `main-container` vs workspace chat vs preview iframe vs modal).
- No migrar ni inventar drag-to-scroll global sin confirmación humana.
- Si es solo `button` en divider: trivial (1 archivo) → score efectivo 1–2.
