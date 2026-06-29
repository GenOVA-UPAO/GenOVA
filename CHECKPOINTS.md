# CHECKPOINTS — Criterios objetivos de calidad de GenOVA

> El reviewer verifica estos checkpoints al aprobar cualquier feature.
> Puede agregar nuevos criterios (documentando el cambio en su veredicto).

## C1 — Tests verdes
- [ ] `pnpm test:unit` pasa al 100% (cucumber-js)
- [ ] `pytest tests/step_defs/ -v --tb=short` pasa al 100%
- [ ] No hay tests en `[ ]` sin justificación documentada en `sdd/progress/impl_*.md`

## C2 — Lint limpio
- [ ] `pnpm lint` sale con exit 0 (Biome noExcessiveLinesPerFile: 200, sin errores)
- [ ] `ruff check backend/` sale con exit 0 (E, F, W, I, B, UP, S, SIM)

## C3 — Límite de líneas respetado (NO aplica a archivos de test ni migraciones SQL)
- [ ] Ningún archivo en `frontend/src/` supera 200 líneas
- [ ] Ningún archivo en `backend/` supera 200 líneas
- [ ] Si un archivo está >200 sin exención, hay plan de split documentado en `sdd/progress/impl_*.md`
- [ ] **Patrón de split frontend**: extraer `<Page>Header.tsx`, `<Page>List.tsx`, `<Page>Empty.tsx`, etc., o custom hook `use<Entity>List`
- [ ] **Patrón de split backend**: extraer routers a `<dominio>/<recurso>_router.py`, helpers a `<dominio>/lib/`
- [ ] **Exentos del límite**: archivos de test (`backend/tests/**`, `tests/**`, `test_*.py`, `*_test.py`, `*.test.*`, `*.steps.*`) y migraciones SQL (`backend/migrations/*.sql`)

## C4 — Seguridad básica
- [ ] No hay tokens, API keys, passwords, ni OTPs en respuestas HTTP
- [ ] Nuevos endpoints con input externo tienen rate-limit (`@limiter.limit`)
- [ ] Nuevos endpoints auth-adjacentes usan Pydantic con `Field(max_length=…)`
- [ ] Errores de BD nunca se filtran al cliente (usar `commit_or_500()` helpers)

## C5 — Trazabilidad specs ↔ tests
- [ ] Cada `R<n>` del spec de la feature tiene al menos un test concreto
- [ ] El mapa `R<n> → test` está documentado en `sdd/progress/impl_<name>.md`

## C6 — Estado del repo limpio
- [ ] `verify.ps1` termina sin errores (PASA en todas las secciones)
- [ ] `sdd/progress/current.md` refleja estado actualizado
- [ ] No hay archivos temporales, `print()` de debug, ni TODOs sin contexto

## C7 — Arquitectura screaming (carpetas que describen el dominio)
- [ ] **Frontend** screaming architecture: `src/features/<dominio>/{pages,components,hooks,services,lib}/` (ej. `features/ova_workspace/`, NO `features/views/` o `features/http/`)
- [ ] **Backend** screaming architecture: paquetes por dominio (`auth/`, `ova/`, `agents/`, `rag/`, `prometheus/`...), NO módulos por tecnología (`controllers/`, `models/` universales)
- [ ] Nombres de carpetas cuentan QUÉ hace el dominio, no la tecnología (`auth`, `ova_workspace`, `ova_library`, `rag`, `prometheus`, `scorm`)
- [ ] Funciones genuinamente cross-dominio viven en `core/` (frontend) o `core/` (backend) con imports explícitos desde cada dominio
- [ ] **Capas en frontend**: services (HTTP) → hooks (estado) → pages (orquestan layout). Pages NO hacen `fetch`; hooks NO hacen `fetch`; services NO tienen estado de React
- [ ] **Capas en backend**: router (endpoint FastAPI) → service (lógica de negocio) → model (ORM). Routers NO contienen SQL ni reglas; services NO exponen HTTP
- [ ] Features con `"sdd": true` en `feature_list.json` pasan por flujo SDD completo (spec → review → impl → verify)

## C8 — Wireframe gate (solo features con `## Mockup ASCII` en el spec)
- [ ] `frontend/src/wireframes/<ID>_*Wireframe.jsx` existió y fue aprobado por el humano antes de FASE 1
- [ ] Aprobación del wireframe documentada en `sdd/progress/current.md` o `sdd/progress/impl_<name>.md`
- [ ] El archivo wireframe fue eliminado al completar la implementación real (no queda en el repo)

## C9 — Anti-spaghetti: dependencias unidireccionales
- [ ] Sin ciclos de import (verificable con `madge --circular frontend/src backend/` o inspección visual)
- [ ] Cada archivo importa <15 dependencias de runtime (anti-god-module)
- [ ] Cada módulo tiene un único concern visible en el nombre
- [ ] Sin "kitchen sink": no existen `helpers.js`, `utils.ts` o `misc.py` con funciones de dominios distintos mezclados
- [ ] Backend: ningún `router.py` importa de `models.*` sin pasar por un `service.py`
- [ ] Frontend: ninguna `page/*` importa de otra `page/*` (composición via componente compartido, no via cross-import)
- [ ] El grafo de imports respeta la dirección de las capas (services → hooks → pages en FE; router → service → model en BE)

## C10 — Modularizar repetido (DRY)
- [ ] Lógica usada en ≥2 lugares extraída a helper/módulo compartido en `lib/` o equivalente
- [ ] Validaciones (`zod` schemas, `pydantic.Field`) declaradas una vez y reusadas (no duplicar schemas entre FE/BE)
- [ ] Constantes de UI (colores mágicos, tamaños, badges, labels de provider/categoría) en tema o `core/lib/tokens` — no hardcoded en cada componente
- [ ] Componentes UI primitivos usados (shadcn) en lugar de HTML crudo reinventado cuando ya existe uno equivalente
- [ ] Sin archivos "tupperware" con funciones de dominios distintos mezclados (también cubierto en C9)

## C11 — Código muerto auditado
- [ ] `pnpm lint` reporta 0 `noUnusedImports` y 0 `noUnusedVariables`
- [ ] `ruff check backend/` reporta 0 `F401` (imports no usados) y 0 `F841` (variables locales no usadas)
- [ ] Sin `print(...)` de debug en código de aplicación (usar `logger.debug` o quitar)
- [ ] Sin `TODO/FIXME/XXX` sin responsable ni ticket asociado (tienen que tener contexto accionable)
- [ ] Sin código comentado "por si acaso" (restaurar desde git si se necesita)
- [ ] Sin ramas inalcanzables (`if False: ...`, `return` seguido de código muerto, `else` sobre condición ya True)
- [ ] Sin exports no usados en barrel files (`index.ts`, `__init__.py`) — usar `lint --fix` o `ruff --fix` regularmente

## C12 — Adopción de frameworks disponibles (usar siempre el marco declarado)
**Frontend** (declarados en `frontend/package.json`):
- [ ] Server state → `@tanstack/react-query` (no `useEffect + fetch` casero)
- [ ] Formularios → `react-hook-form` + `zod` (no `onChange` imperativo por campo)
- [ ] UI primitives → `radix-ui` + shadcn (`@/core/components/ui/*`); no HTML crudo reinventado
- [ ] Iconos → `@phosphor-icons/react` (no SVGs sueltos; no emojis para UI funcional)
- [ ] Toasts → `sonner` (no `alert(...)` ni custom toasts)
- [ ] Animaciones → `motion/react` (no keyframes CSS para UI crítica)
- [ ] Routing → `react-router` 8 con `lazy()` para code-splitting
- [ ] Estilo → `tailwindcss` + `tailwind-merge` + `clsx` (utility-first; sin CSS-in-JS ad-hoc)
- [ ] Error tracking → `@sentry/react` + `react-error-boundary`
- [ ] Streaming/SSE → `@microsoft/fetch-event-source`
- [ ] Validación de inputs → `zod`

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
