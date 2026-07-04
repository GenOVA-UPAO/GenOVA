# CHECKPOINTS — Criterios objetivos de calidad de GenOVA

> El reviewer verifica estos checkpoints al aprobar cualquier feature.
> Puede agregar nuevos criterios (documentando el cambio en su veredicto).

## C1 — Tests verdes
- [ ] `pnpm test:unit` pasa al 100% (cucumber-js)
- [ ] `pytest tests/step_defs/ -v --tb=short` pasa al 100%
- [ ] No hay tests en `[ ]` sin justificación documentada en `sdd/progress/implementados/impl_*.md`

## C2 — Lint limpio
- [ ] `pnpm lint` sale con exit 0 (ESLint, max-lines: 250, sin errores)
- [ ] `ruff check backend/` sale con exit 0 (E, F, W, I, B, UP, S, SIM)

## C3 — Límite de líneas respetado (NO aplica a archivos de test ni migraciones SQL)
- [ ] Ningún archivo `.ts` en `frontend/src/` supera 250 líneas (plantillas `.html` exentas)
- [ ] Ningún archivo en `backend/` supera 200 líneas
- [ ] Si un archivo está por encima del límite sin exención, hay plan de split documentado en `sdd/progress/implementados/impl_*.md`
- [ ] **Patrón de split frontend**: extraer subcomponentes, helpers o servicios; plantillas en `.html` separado del `.ts`
- [ ] **Patrón de split backend**: extraer routers a `<dominio>/<recurso>_router.py`, helpers a `<dominio>/lib/`
- [ ] **Exentos del límite**: archivos de test (`backend/tests/**`, `tests/**`, `test_*.py`, `*_test.py`, `*.test.*`, `*.steps.*`), migraciones SQL (`backend/migrations/*.sql`) y plantillas Angular (`*.html`)

## C4 — Seguridad básica
- [ ] No hay tokens, API keys, passwords, ni OTPs en respuestas HTTP
- [ ] Nuevos endpoints con input externo tienen rate-limit (`@limiter.limit`)
- [ ] Nuevos endpoints auth-adjacentes usan Pydantic con `Field(max_length=…)`
- [ ] Errores de BD nunca se filtran al cliente (usar `commit_or_500()` helpers)

## C5 — Trazabilidad specs ↔ tests
- [ ] Cada `R<n>` del spec de la feature tiene al menos un test concreto
- [ ] El mapa `R<n> → test` está documentado en `sdd/specs/<ID>_*.md` (§ Trazabilidad) **o** en `sdd/progress/implementados/impl_<name>.md` para features implementadas

## C6 — Estado del repo limpio
- [ ] `verify.ps1` termina sin errores (PASA en todas las secciones)
- [ ] `sdd/progress/current.md` refleja estado actualizado
- [ ] No hay archivos temporales, `print()` de debug, ni TODOs sin contexto

## C7 — Arquitectura screaming (carpetas que describen el dominio)
- [x] **Frontend** screaming architecture: `src/features/<dominio>/{pages,components,hooks,services,lib}/` (ej. `features/ova-workspace/`, NO `features/views/` o `features/http/`) — audit 2026-07-01: kebab-case domains, no `ova_workspace/` duplicate; see `impl_audit-closure.md`
- [ ] **Backend** screaming architecture: paquetes por dominio (`auth/`, `ova/`, `agents/`, `rag/`, `prometheus/`...), NO módulos por tecnología (`controllers/`, `models/` universales)
- [ ] Nombres de carpetas cuentan QUÉ hace el dominio, no la tecnología (`auth`, `ova-workspace`, `ova-library`, `rag`, `prometheus`, `scorm`)
- [ ] Funciones genuinamente cross-dominio viven en `core/` (frontend) o `core/` (backend) con imports explícitos desde cada dominio
- [x] **Capas en frontend**: services (HTTP) → hooks/signals (estado) → pages (orquestan layout). Pages NO hacen `fetch` directo; services encapsulan `apiFetch` — audit 2026-07-01: zero `apiFetch` in `features/**/pages/**` and `features/**/components/**`
- [ ] **Capas en backend**: router (endpoint FastAPI) → service (lógica de negocio) → model (ORM). Routers NO contienen SQL ni reglas; services NO exponen HTTP
- [ ] Features con `"sdd": true` en `feature_list.json` pasan por flujo SDD completo (spec → review → impl → verify)

## C9 — Anti-spaghetti: dependencias unidireccionales
- [ ] Sin ciclos de import (verificable con `madge --circular frontend/src backend/` o inspección visual)
- [ ] Cada archivo importa <15 dependencias de runtime (anti-god-module)
- [ ] Cada módulo tiene un único concern visible en el nombre
- [ ] Sin "kitchen sink": no existen `helpers.js`, `utils.ts` o `misc.py` con funciones de dominios distintos mezclados
- [ ] Backend: ningún `router.py` importa de `models.*` sin pasar por un `service.py`
- [x] Frontend: ninguna `page/*` importa de otra `page/*` (composición via componente compartido, no via cross-import) — audit 2026-07-01: grep clean; explore/engage use `components/phase/phase-page`
- [ ] El grafo de imports respeta la dirección de las capas (services → hooks → pages en FE; router → service → model en BE)

## C10 — Modularizar repetido (DRY)
- [x] Theme save: `ThemeSettingsService.saveTheme` única fuente (P2: eliminado duplicado en `ProfileService`) — `impl_p2-polish-final.md`
- [x] Modal Escape dismiss: `ModalDismissDirective` reutilizable (4 modales backdrop) — `core/directives/modal-dismiss.directive.ts`
- [ ] Lógica usada en ≥2 lugares extraída a helper/módulo compartido en `lib/` o equivalente
- [ ] Validaciones (`zod` schemas, `pydantic.Field`) declaradas una vez y reusadas (no duplicar schemas entre FE/BE)
- [ ] Constantes de UI (colores mágicos, tamaños, badges, labels de provider/categoría) en tema o `core/lib/tokens` — no hardcoded en cada componente
- [ ] Componentes UI primitivos usados (shadcn) en lugar de HTML crudo reinventado cuando ya existe uno equivalente
- [ ] Sin archivos "tupperware" con funciones de dominios distintos mezclados (también cubierto en C9)

## C11 — Código muerto auditado
- [x] `PlatformLlmConfigCardComponent` eliminado (reemplazado por `ModelAssignmentPanel` en `/models`) — P2 2026-07-01
- [ ] `pnpm lint` reporta 0 `noUnusedImports` y 0 `noUnusedVariables`
- [ ] `ruff check backend/` reporta 0 `F401` (imports no usados) y 0 `F841` (variables locales no usadas)
- [ ] Sin `print(...)` de debug en código de aplicación (usar `logger.debug` o quitar)
- [ ] Sin `TODO/FIXME/XXX` sin responsable ni ticket asociado (tienen que tener contexto accionable)
- [ ] Sin código comentado "por si acaso" (restaurar desde git si se necesita)
- [ ] Sin ramas inalcanzables (`if False: ...`, `return` seguido de código muerto, `else` sobre condición ya True)
- [ ] Sin exports no usados en barrel files (`index.ts`, `__init__.py`) — usar `lint --fix` o `ruff --fix` regularmente

## C12 — Adopción de frameworks disponibles (usar siempre el marco declarado)
**Frontend** (declarados en `frontend/package.json`):
- [x] Server state → Angular `resource()` + signals / RxJS (no `useEffect + fetch` casero)
- [x] Formularios → `ReactiveFormsModule` + `zod` (no `onChange` imperativo por campo)
- [x] UI primitives → PrimeNG + custom `gn-*` en `core/components/ui/`; no HTML crudo reinventado
- [x] Iconos → `@phosphor-icons/web` en nav y `/models` (no SVGs sueltos en nav)
- [x] Toasts → `core/lib/toast.ts` (custom; no `alert(...)` ni toasts ad-hoc)
- [ ] Animaciones → `@angular/animations` (no keyframes CSS para UI crítica)
- [x] Routing → `@angular/router` con `loadComponent` lazy routes
- [x] Estilo → `tailwindcss` 4 + `tailwind-merge` + `clsx` (utility-first; sin CSS-in-JS ad-hoc)
- [x] Error tracking → `@sentry/angular` lazy-loaded en `core/lib/observability/sentry.ts`
- [x] Streaming/SSE → `@microsoft/fetch-event-source`
- [x] Validación de inputs → `zod`

**Backend** (declarados en `backend/pyproject.toml`):
- [ ] HTTP → FastAPI con Pydantic v2 (`Field(max_length=…)`, validators)
- [ ] Cola de jobs durable → `arq` + Redis (no threads sueltos para durabilidad)
- [ ] Observabilidad → `logfire` + `prometheus-fastapi-instrumentator` + `sentry-sdk`
- [ ] Rate-limit → `slowapi` (`@limiter.limit`)
- [ ] SSE → `sse-starlette`
- [ ] 2FA/TOTP → `pyotp`
- [ ] ORM → `sqlalchemy` 2.x con modelos tipados (no SQL crudo inline)
- [ ] Orquestación multi-agente → `langgraph`
- [ ] Parseo de archivos → `pypdf`, `python-docx`, `python-pptx`, `filetype`
- [ ] Hashing de passwords → `bcrypt`
- [ ] Tokens → `PyJWT`
- [ ] Driver PostgreSQL → `psycopg[binary]`
- [ ] Storage / DB cliente → `supabase` SDK (no REST improvisado)

## C13 — Frontend responsive (todo componente usable en mobile/tablet/desktop)
- [ ] Todo componente en `frontend/src/` usa utility classes responsive de Tailwind (`sm:`, `md:`, `lg:`) o es modal/dialog con `max-w-*`
- [ ] Probado mentalmente para anchos: 320px (mobile), 768px (tablet), 1280px (desktop)
- [ ] Tablas: contenedor con `overflow-x-auto` + `min-w-[…]` por columna
- [ ] Modales: bottom-sheet en mobile (`<sm`), centradas en `sm+`
- [ ] Inputs: tamaño mínimo táctil ≥44px en mobile
- [ ] Imágenes: `aspect-ratio` o `object-cover`; `srcset` cuando hay varios tamaños
- [ ] Sin tamaños fijos en `px` para layout (usar tokens Tailwind `p-4`, `gap-2`, etc.)
- [ ] Diálogos y dropdowns se posicionan correctamente en viewports pequeños (no overflow horizontal)
- [ ] Tipografía: clases `text-xs/sm/base/lg/xl` para escalar; no `text-[10px]` arbitrario salvo badges
