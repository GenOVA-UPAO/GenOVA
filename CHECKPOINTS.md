# CHECKPOINTS — GenOVA objective quality criteria

> The reviewer verifies these checkpoints when approving any feature.
> It may add new criteria (documenting the change in its verdict).

## C1 — Green tests
- [ ] `pnpm test:unit` passes 100% (cucumber-js)
- [ ] `pytest tests/step_defs/ -v --tb=short` passes 100%
- [ ] No `[ ]` tests without justification documented in `sdd/progress/implementados/impl_*.md`

## C2 — Clean lint
- [ ] `pnpm lint` exits 0 (ESLint, max-lines: 250, no errors)
- [ ] `ruff check backend/` exits 0 (E, F, W, I, B, UP, S, SIM)

## C3 — Line limit respected (does NOT apply to test files or SQL migrations)
- [ ] No `.ts` file in `frontend/src/` exceeds 250 lines (`.html` templates exempt)
- [ ] No file in `backend/` exceeds 200 lines
- [ ] If a file is over the limit without an exemption, a split plan is documented in `sdd/progress/implementados/impl_*.md`
- [ ] **Frontend split pattern**: extract subcomponents, helpers, or services; `.html` templates kept separate from `.ts`
- [ ] **Backend split pattern**: extract routers into `<domain>/<resource>_router.py`, helpers into `<domain>/lib/`
- [ ] **Exempt from the limit**: test files (`backend/tests/**`, `tests/**`, `test_*.py`, `*_test.py`, `*.test.*`, `*.steps.*`), SQL migrations (`backend/migrations/*.sql`), and Angular templates (`*.html`)

## C4 — Basic security
- [ ] No tokens, API keys, passwords, or OTPs in HTTP responses
- [ ] New endpoints with external input have rate limiting (`@limiter.limit`)
- [ ] New auth-adjacent endpoints use Pydantic with `Field(max_length=…)`
- [ ] DB errors never leak to the client (use `commit_or_500()` helpers)

## C5 — Specs ↔ tests traceability
- [ ] Every `R<n>` in the feature spec has at least one concrete test
- [ ] The `R<n> → test` map is documented in `sdd/specs/<ID>_*.md` (§ Trazabilidad) **or** in `sdd/progress/implementados/impl_<name>.md` for implemented features

## C6 — Clean repo state
- [ ] `verify.ps1` finishes with no errors (PASA on every section)
- [ ] `sdd/progress/current.md` reflects the current state
- [ ] No temp files, debug `print()`, or contextless TODOs

## C7 — Screaming architecture (folders describe the domain)
- [x] **Frontend** screaming architecture: `src/features/<domain>/{pages,components,hooks,services,lib}/` (e.g. `features/ova-workspace/`, NOT `features/views/` or `features/http/`) — audit 2026-07-01: kebab-case domains, no `ova_workspace/` duplicate; see `impl_audit-closure.md`
- [ ] **Backend** screaming architecture: packages per domain (`auth/`, `ova/`, `agents/`, `rag/`, `prometheus/`...), NOT modules per technology (universal `controllers/`, `models/`)
- [ ] Folder names describe WHAT the domain does, not the technology (`auth`, `ova-workspace`, `ova-library`, `rag`, `prometheus`, `scorm`)
- [ ] Genuinely cross-domain functions live in `core/` (frontend) or `core/` (backend) with explicit imports from each domain
- [x] **Frontend layers**: services (HTTP) → hooks/signals (state) → pages (orchestrate layout). Pages do NOT `fetch` directly; services encapsulate `apiFetch` — audit 2026-07-01: zero `apiFetch` in `features/**/pages/**` and `features/**/components/**`
- [ ] **Backend layers**: router (FastAPI endpoint) → service (business logic) → model (ORM). Routers do NOT contain SQL or rules; services do NOT expose HTTP
- [ ] Features with `"sdd": true` in `feature_list.json` go through the full SDD flow (spec → review → impl → verify)

## C9 — Anti-spaghetti: unidirectional dependencies
- [ ] No import cycles (verifiable with `madge --circular frontend/src backend/` or visual inspection)
- [ ] Each file imports <15 runtime dependencies (anti-god-module)
- [ ] Each module has a single concern visible in its name
- [ ] No "kitchen sink": no `helpers.js`, `utils.ts`, or `misc.py` mixing functions from different domains
- [ ] Backend: no `router.py` imports from `models.*` without going through a `service.py`
- [x] Frontend: no `page/*` imports from another `page/*` (composition via a shared component, not cross-import) — audit 2026-07-01: grep clean; explore/engage use `components/phase/phase-page`
- [ ] The import graph respects layer direction (services → hooks → pages in FE; router → service → model in BE)

## C10 — Modularize repetition (DRY)
- [x] Theme save: `ThemeSettingsService.saveTheme` single source (P2: removed duplicate in `ProfileService`) — `impl_p2-polish-final.md`
- [x] Modal Escape dismiss: reusable `ModalDismissDirective` (4 backdrop modals) — `core/directives/modal-dismiss.directive.ts`
- [ ] Logic used in ≥2 places extracted to a shared helper/module in `lib/` or equivalent
- [ ] Validations (`zod` schemas, `pydantic.Field`) declared once and reused (don't duplicate schemas between FE/BE)
- [ ] UI constants (magic colors, sizes, badges, provider/category labels) in a theme or `core/lib/tokens` — not hardcoded in every component
- [ ] Existing primitive UI components used (shadcn) instead of reinventing raw HTML when an equivalent already exists
- [ ] No "tupperware" files mixing functions from different domains (also covered by C9)

## C11 — Audited dead code
- [x] `PlatformLlmConfigCardComponent` removed (replaced by `ModelAssignmentPanel` in `/models`) — P2 2026-07-01
- [ ] `pnpm lint` reports 0 `noUnusedImports` and 0 `noUnusedVariables`
- [ ] `ruff check backend/` reports 0 `F401` (unused imports) and 0 `F841` (unused local variables)
- [ ] No debug `print(...)` in application code (use `logger.debug` or remove)
- [ ] No `TODO/FIXME/XXX` without an owner or associated ticket (must have actionable context)
- [ ] No "just in case" commented-out code (restore from git if needed)
- [ ] No unreachable branches (`if False: ...`, `return` followed by dead code, `else` on an already-True condition)
- [ ] No unused exports in barrel files (`index.ts`, `__init__.py`) — use `lint --fix` or `ruff --fix` regularly

## C12 — Adoption of available frameworks (always use the declared framework)
**Frontend** (declared in `frontend/package.json`):
- [x] Server state → Angular `resource()` + signals / RxJS (no homegrown `useEffect + fetch`)
- [x] Forms → `ReactiveFormsModule` + `zod` (no imperative per-field `onChange`)
- [x] UI primitives → PrimeNG + custom `gn-*` in `core/components/ui/`; no reinvented raw HTML
- [x] Icons → `@phosphor-icons/web` in nav and `/models` (no loose SVGs in nav)
- [x] Toasts → `core/lib/toast.ts` (custom; no `alert(...)` or ad-hoc toasts)
- [ ] Animations → `@angular/animations` (no CSS keyframes for critical UI)
- [x] Routing → `@angular/router` with lazy `loadComponent` routes
- [x] Styling → `tailwindcss` 4 + `tailwind-merge` + `clsx` (utility-first; no ad-hoc CSS-in-JS)
- [x] Error tracking → `@sentry/angular` lazy-loaded in `core/lib/observability/sentry.ts`
- [x] Streaming/SSE → `@microsoft/fetch-event-source`
- [x] Input validation → `zod`

**Backend** (declared in `backend/pyproject.toml`):
- [ ] HTTP → FastAPI with Pydantic v2 (`Field(max_length=…)`, validators)
- [ ] Durable job queue → `arq` + Redis (no loose threads for durability)
- [ ] Observability → `logfire` + `prometheus-fastapi-instrumentator` + `sentry-sdk`
- [ ] Rate limiting → `slowapi` (`@limiter.limit`)
- [ ] SSE → `sse-starlette`
- [ ] 2FA/TOTP → `pyotp`
- [ ] ORM → `sqlalchemy` 2.x with typed models (no inline raw SQL)
- [ ] Multi-agent orchestration → `langgraph`
- [ ] File parsing → `pypdf`, `python-docx`, `python-pptx`, `filetype`
- [ ] Password hashing → `bcrypt`
- [ ] Tokens → `PyJWT`
- [ ] PostgreSQL driver → `psycopg[binary]`
- [ ] Storage / DB client → `supabase` SDK (no improvised REST)

## C13 — Frontend responsive (every component usable on mobile/tablet/desktop)
- [ ] Every component in `frontend/src/` uses Tailwind responsive utility classes (`sm:`, `md:`, `lg:`) or is a modal/dialog with `max-w-*`
- [ ] Mentally tested at widths: 320px (mobile), 768px (tablet), 1280px (desktop)
- [ ] Tables: container with `overflow-x-auto` + `min-w-[…]` per column
- [ ] Modals: bottom-sheet on mobile (`<sm`), centered on `sm+`
- [ ] Inputs: minimum touch size ≥44px on mobile
- [ ] Images: `aspect-ratio` or `object-cover`; `srcset` when multiple sizes exist
- [ ] No fixed `px` sizes for layout (use Tailwind tokens `p-4`, `gap-2`, etc.)
- [ ] Dialogs and dropdowns position correctly on small viewports (no horizontal overflow)
- [ ] Typography: `text-xs/sm/base/lg/xl` classes to scale; no arbitrary `text-[10px]` except on badges

## C14 — ORM aligned with the DDL on deletes (relationships with FK ON DELETE)
- [ ] Every parent→child `relationship()` whose FK declares `ON DELETE CASCADE` in `backend/migrations/` carries `cascade="all, delete-orphan"` + `passive_deletes=True` (if the DDL uses `ON DELETE SET NULL`, the model's FK must be nullable and without delete-orphan)
- [ ] Verifiable rule: `db.delete(parent)` with existing children never emits `UPDATE child SET fk=NULL` (reference test: `backend/tests/test_c14_orm_delete_cascade.py`)
- [ ] Origin: B1 of HU-012 — `DELETE /api/ovas/{id}/permanente` returned 500 (`NotNullViolation` on `ova_versions.ova_id`) for any OVA with versions
