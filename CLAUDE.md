# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

GenOVA — web platform for AI-assisted generation of Virtual Learning Objects (OVA) with SCORM 1.2 export. Built as a pnpm monorepo. Backend supports both `pip` and `uv` workflows.

## Commands

### Frontend (from repo root)

```bash
pnpm install          # Install all frontend deps
pnpm dev              # Vite dev server → http://localhost:5173
pnpm build            # Production build
pnpm preview          # Preview prod build locally → http://localhost:4173
pnpm lint             # ESLint (max-lines: 200, error)
pnpm format           # Prettier check
```

### Backend with `pip` (from `backend/`)

```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt          # runtime only
pip install -r requirements-dev.txt      # + ruff, pytest, requests, bs4
uvicorn main:app --reload --port 8000
```

### Backend with `uv` (from `backend/`)

`pyproject.toml` mirrors `requirements.txt` under `[project.dependencies]`. Dev tools live under `[project.optional-dependencies.dev]`. `.python-version` pins to 3.11. Both workflows must stay in sync — if you add a runtime dep, add it to BOTH files.

```bash
uv sync                          # runtime deps from pyproject.toml
uv sync --extra dev              # + ruff, pytest, requests, bs4
uv run uvicorn main:app --reload --port 8000
uv run ruff check .
uv run pytest
```

### Lint + format (backend)

```bash
ruff check .         # lint (E, F, W, I, B, UP, S, SIM)
ruff format .        # format
ruff check --fix .   # autofix
```

Config lives in `backend/pyproject.toml` under `[tool.ruff]`.

### Full stack with Docker

```bash
pnpm dev:docker    # Dev (hot-reload, ports 5173 + 8000)
pnpm prod:docker   # Prod (Nginx on port 80, /api/* → backend)
```

### Backend tests (from `backend/`)

```bash
# Smoke + quality tests hit the live API. Backend must be running.
pytest                                       # discovers tests/test_*.py
pytest tests/step_defs/ -v -m bdd           # BDD scenarios only (pytest-bdd)
python tests/test_agents_io.py               # manual smoke
python tests/test_resource_quality.py        # HTML quality gate
python tests/test_rag_uploads.py             # upload → RAG ingestion → listing → delete flow
python tests/test_latency.py                 # OE1 benchmark: 10 samples × 7 non-LLM endpoints, PASA/FALLA vs 278ms
```

All manual tests authenticate against the live API. Override defaults via env: `BASE`, `EMAIL`, `PASS`. Agent tests also accept: `PHASE`, `TYPE`, `CONCEPT`.

### BDD tests (from repo root)

```bash
pnpm test:unit    # cucumber-js unit tests (lib/auth.js, lib/labQuality.js) — no browser, no backend
pnpm test:e2e     # playwright-bdd E2E (requires frontend + backend running)
pnpm test:e2e:ui  # same with Playwright UI mode
```

Feature files live in `tests/features/` (21 files across auth/, ova/, roles/, layout/, setup/). All extracted verbatim from `specs/*.md` Gherkin sections. Incompatibilities documented in `docs/tasks/TA-BDD-incompatibilidades.md`. CI runs all three suites in `.github/workflows/ci.yml` (secrets: `TEST_DATABASE_URL`, `TEST_JWT_SECRET`).

### DB seed

Runs automatically on backend startup via `seed.py`. Creates `administrador` + `usuario` roles plus two test accounts:

- `admin@genova.ai` / `admin1234password`
- `user@genova.ai` / `user1234password`

### SQL migrations

Applied automatically on backend startup via `run_migrations()` in `main.py`'s lifespan. Migration files live in `backend/migrations/` (001 through 015). To add a migration, create the next numbered `.sql` file — it will be applied on next startup. Run manually: `python run_migrations.py` from `backend/`.

Key migrations:
- `010_pgvector.sql` — enables the `vector` extension (required for RAG).
- `011_rag_chunks.sql` — RAG chunk store with `vector(768)` embeddings.
- `012_ova_storage_key.sql` — adds `ovas.storage_key` for Supabase Storage object keys.
- `013_user_extended_profile_fields.sql` — adds `users.university_id`, `gender`, `phone_number`.
- `014_ova_phase_resource_metadata.sql` — adds `resource_type_id` and `title` columns to `ova_phases` for tracking resource metadata.
- `015_ovas_created_at_index.sql` — adds `idx_ovas_created_at ON ovas(created_at DESC)` for `ORDER BY` performance on list endpoints.

### Health endpoints

```
GET /health
GET /api/health
GET /api/db/health
GET /api/agents/health
GET /api/rag/health
GET /api/scorm/health
GET /api/ova/health
GET /api/uploads/health
```

## Architecture

### Backend — FastAPI

**Entry point**: `backend/main.py`
Startup sequence: `run_migrations()` → `Base.metadata.create_all()` → `seed_db()` → `purge_expired()` RAG chunks (best-effort). Registers all routers. Configures `logging.basicConfig()` (level via `LOG_LEVEL` env, default `INFO`) and attaches the shared `slowapi.Limiter`.

**`ProcessTimeMiddleware`** (in `main.py`): adds `X-Process-Time-Ms` response header on every request (server-side processing time, not network RTT). Emits a `WARNING SLOW <METHOD> <PATH> → <ms>ms` log when a non-LLM endpoint exceeds the OE1 threshold (default 278 ms, override via `LATENCY_THRESHOLD_MS` env). LLM paths (`/api/agents/`, `/api/ova/save`, `/api/labs/generate`) are excluded. Benchmark script: `backend/tests/test_latency.py` (10 samples × 7 endpoints, exits PASA/FALLA vs threshold).

Some routers are mounted at two prefixes for legacy compatibility:
`auth` at `/api/auth` + `/auth`, `roles` at `/api/roles` + `/roles`, `users` at `/api/users` + `/users`.

**Models** (`backend/models.py`): `User`, `Ova`, `OvaVersion`, `OvaPhase`, `Session`, `Role`, `UserRole`, `LabResult`, `RagChunk`, `PasswordResetToken` — all UUIDs, PostgreSQL dialect (JSONB for role permissions). Soft-delete on `Ova` via `deleted_at`; queries must filter `deleted_at IS NULL` for active records. `User` carries extended profile fields (`university_id`, `gender`, `phone_number`) on top of auth state.

**`backend/security.py`** (root-level, not inside `auth/`): bcrypt + JWT helpers. **Hard-fails on import** if `JWT_SECRET` is missing, in `{"", "change-me", "changeme", "secret", "test"}`, or shorter than 16 chars. JWTs include `iat`, `exp`, `iss="genova"`, `jti=uuid4()` — ready for token revocation via a blocklist table when needed. Exports `hash_password`, `verify_password`, `verify_dummy` (equalizes timing for anti-enumeration). `PASSWORD_MAX_LENGTH = 128` enforced before bcrypt to prevent DoS via oversized inputs.

**`backend/database.py`**: SQLAlchemy engine setup. Provides `engine`, `SessionLocal`, `Base`, and FastAPI's `get_db()` dependency. Non-SQLite path uses `pool_pre_ping=True`, `pool_recycle=300`, `pool_size=5`, `max_overflow=5`, plus TCP keepalives (`keepalives_idle=30`, `keepalives_interval=10`, `keepalives_count=3`) to survive Supabase/pgbouncer aggressive idle-connection kills.

**Auth** (`backend/auth/`):
- `dependencies.py`: `get_current_user` (Bearer JWT), `require_admin` (role-name check) and `require_permission(perm)` (JSONB `permissions` contains check, falls back to admin bypass) FastAPI dependencies.
- `router.py`: orchestrator for `POST /login`, `POST /register`, `GET /me`. `LoginRequest` / `RegisterRequest` use `EmailStr` + `Field(min_length=…, max_length=128)`. Login walks a dummy bcrypt hash for nonexistent users (anti-enumeration). Lockout: 5 failed attempts → 15 min via `failed_login_attempts` + `locked_until`. Mounts the reset sub-router.
- `reset_router.py`: `POST /reset-password` — finalizes a reset using a `PasswordResetToken` row. Rate-limited (`10/minute` per IP). Token length validated server-side (`8..512`).
- `email.py`: SMTP sender (`send_reset_email`). Configured via `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD`. **No hardcoded fallback credentials** — when `SMTP_USER` / `SMTP_PASSWORD` are missing, raises `EmailNotConfigured` and logs the failure instead of sending.

**Rate limiting** (`backend/rate_limit.py`):
- Single `Limiter` keyed by client IP (`get_remote_address`). Endpoints decorate with `@limiter.limit("N/minute")`. Auth endpoints: `/login` 10/min, `/register` 5/min. Routers that need the limiter import `from rate_limit import limiter` and must include `request: Request` as a parameter on the limited endpoint.

**CORS** (in `main.py`): `allow_methods=["GET","POST","PATCH","PUT","DELETE","OPTIONS"]`, `allow_headers=["Authorization","Content-Type","Accept","X-Requested-With"]`. Origins from a hardcoded localhost list + comma-separated `CORS_ORIGINS` env var.

**OVA lifecycle**:

The `POST /api/ova/save` request body is `{prompt, phases: [...], upload_ids}`. Each `PhaseInput` carries `{type, order, content, title?, resource_type_id?}`. `title` is an optional per-resource label used to disambiguate the SCORM nav when several phases share the same `type` (e.g. multiple ENGAGE resources). When omitted, `scorm/service.py` falls back to `phase_label(type, order)`. Creation now supports **up to 4 resources per phase** (ENGAGE + EXPLORE) — the frontend orders them ENGAGE 1..N, EXPLORE N+1..N+M and sends one `OvaPhase` row per resource. The regeneration flow (`POST /api/ovas/{id}/regenerar`) invokes `ova/regen_service.py` to regenerate the selected phases in a background thread using the real LLM agents (`ova/regen_agents.py`) based on their stored `resource_type_id` and prompt, deactivating the old version and creating a new `OvaVersion` row.

| Module | Prefix | Responsibility |
|---|---|---|
| `ova/router.py` | `/api/ova` | `POST /save`, `GET /{id}/scorm`, `GET /llm-options`, `GET /health` |
| `ova/edit_router.py` | `/api/ovas` | `PATCH /{ova_id}/fases/{fase_id}` phase save; includes `edit_view_router` + `regen_router` as sub-routers |
| `ova/edit_view_router.py` | `/api/ovas` | Read OVA detail + active version for editor |
| `ova/edit_helpers.py` | — | Shared helpers for edit + regen flows: `_ensure_version_exists`, `_get_active_version`, `_is_ova_owner`, `_phase_to_dict`, `_version_to_dict`, `PROGRESS_STAGES` |
| `ova/regen_router.py` | `/api/ovas` | Trigger regen on existing OVA |
| `ova/regen_service.py` | — | Background thread: create new `OvaVersion`, rebuild SCORM zip |
| `ova/history_router.py` | `/api/ovas` | List OVAs (paginated, admin-aware), version history, `GET /{id}/download`. Includes `trash_router` + `duplicate_router` + `manage_router` |
| `ova/manage_router.py` | `/api/ovas` | Metadata update, permanent delete |
| `ova/duplicate_router.py` | `/api/ovas` | Copy existing OVA |
| `ova/trash_router.py` | `/api/ovas` | Soft-delete / restore |
| `ova/trash_batch_router.py` | `/api/ovas` | Batch trash operations |
| `scorm/service.py` | — | `build_scorm_zip_bytes()` assembles manifest, HTML, JS, CSS |
| `scorm/router.py` | `/api/scorm` | Only `GET /health` — actual download lives in `ova/router.py` |

**OVA statuses** (defined in `ova/helpers.py`): `VALID_STATUSES = {"borrador", "generando", "listo", "error"}`. The frontend wizard also sets `partial` (OVA saved with only successful resources after some phases fail) — `partial` is not in the backend's `VALID_STATUSES`; filter accordingly when adding status logic.

**Versioning invariant**: `OvaVersion` has a partial unique index — only one `is_active = TRUE` version per OVA. Edits always create a new version and deactivate the prior one.

**SCORM persistence**: When `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set (production), zips upload to the `scorm-packages` private bucket under key `{user_id}/{ova_id}_v{N}.zip`; `Ova.storage_key` stores the key. `GET /api/ova/{id}/scorm` returns a **302 redirect** to a 1-hour signed URL — Render free tier cannot proxy zip bytes concurrently. If storage is unconfigured (dev), the backend falls back to local disk at `OVA_OUTPUT_DIR` (default `backend/scorm_output/`) and `Ova.file_path` is populated. Legacy OVAs with only `file_path` keep working. The legacy edit path (`PATCH /api/ovas/{id}/fases/{fase_id}`) currently writes only to local disk — Supabase upload is wired on `POST /save` and the regen flow.

**Storage wrapper** lives in `backend/storage/supabase_storage.py` (`upload_zip`, `signed_url`, `delete_zip`, `is_configured`). The `supabase` Python SDK is loaded lazily so dev environments without the dep still boot.

**Agents** (`backend/agents/`) — Metodología 5E resource generation:
- `llm_router.py`: routes tasks using `groq` SDK + `openai` client → OpenRouter. Task→model: `texto`→Groq llama-3.3-70b, `codigo`→OpenRouter **deepseek/deepseek-v4-flash:free** (LiveCodeBench 91.6 / SWE-bench 79.0), `orquestador`→Groq gpt-oss-120b (`reasoning_effort=medium`), `razonamiento`→Groq qwen3-32b. **Per-task fallback chain** in `_FALLBACK_CHAIN`: on any recoverable error (rate limit, 402 insufficient credit, empty content, provider 5xx) the chain is walked with exponential backoff capped at 8 s — last entry is always a Groq safety-net model. The `codigo` task fallback chain specifically begins with the paid `deepseek/deepseek-v4-flash` model as the first fallback to handle free-tier rate limits reliably. Groq `max_completion_tokens` is dynamically capped at 8192 for the `codigo` task to prevent HTML truncations. Extra: `generar_vision()` (llama-4-scout). `generar_texto_with_model()` accepts arbitrary `model_id`+`provider` (used by Labs). `VIDEO_UNAVAILABLE_MSG` is the canned response when a video resource is requested.
- `audio_helpers.py`: audio helper functions using Groq APIs: `transcribir_audio()` (Whisper STT) and `generar_audio_tts()` (Orpheus WAV).
- `html_validator.py`: validates generated HTML against structural rules (existence of doctype, </html>, unclosed script tags), SCORM callbacks (`_scormInit`, `_scormComplete`), and forbidden external CDNs. It also does best-effort repair of truncated HTML (closing open tags and appending missing SCORM scripts) before returning it to the client.
- `engage_router.py`: POST `/api/agents/engage/generate` — 10 resource types for ENGAGE (Cómic Interactivo, Storyboard de Video, Micro-Podcast, Juego de Gamificación, Dilema Ético, Noticia de Impacto, Juego de Roles, Timeline Interactivo, Escape Room Virtual, Simulador Intuitivo). Resource 3 (Micro-Podcast) generates a monologue → Groq Orpheus TTS → embeds base64 WAV in `podcast.py`-built HTML; falls back to text-only with manual completion button if TTS fails. Resource 10 (Simulador) is single-step code generation. All other resources use the two-step text→html pattern. Resources whose JSON exposes `prompt_imagen` fields trigger Pollinations image fetch (first `OVA_MAX_GENERATED_IMAGES` items only, default 2) with `__IMG_N__` placeholder substitution. Auto-validates and repairs HTML outputs via `html_validator.py`.
- `explore_router.py`: POST `/api/agents/explore/generate` — 10 resource types for EXPLORE (Simulador Virtual Lab, Agente Socrático, Juego Drag & Drop, Video con Pausa Activa, Lectura Interactiva, Simulador de Slider, Experimento Guiado, Juego de Roles, Mapa Mental, Lab de Hipótesis). Types in `CODE_ONLY = {1, 6, 10}` are single-step code generation; the rest follow the two-step text→html pattern. Auto-validates and repairs HTML outputs via `html_validator.py`.
- Most resources follow a two-step pattern: text/JSON generation → HTML generation via code agent. Response: `{resource_json, html_content}`. `utils.parse_json()` is tolerant: tries direct parse, then walks balanced-bracket spans for the first valid object/array. If the first step JSON parse fails, it retries text generation once with a strict formatting suffix prompt.
- 500 errors return a generic message — the raw LLM response is logged via `logger.exception()` but never leaked to the client.
- Pollinations image fetch (`images.py`) runs parallel fetches using a `ThreadPoolExecutor` with a limit of 2 workers, a timeout of 15 s per image, and caches base64 URIs in-memory to prevent redundant calls. Falls back to a 1×1 SVG placeholder on failure.
- Quality specs for HTML output live in `backend/tests/specs/resource_quality_spec.py`.

**Labs** (`backend/labs/`) — Admin prompt-iteration sandbox; full spec in `docs/LABS.md`:
- Lets admins edit prompts, run them against 1–2 models in parallel, compare results, mark winners, export winners as SCORM, and ask the LLM to suggest an improved prompt based on the winner.
- Labs is a **pure sandbox**: there is no DB override of production prompts. The hardcoded Python prompts in `engage_prompts.py` / `explore_prompts.py` are always the source of truth at generation time. (`prompt_versions` table was added in migration 008 and dropped in migration 009 with an explicit comment confirming sandbox-only intent.)
- DB tables: `lab_results` (one row per model run).
- Internal layout: `catalog.py` (9 curated models: 5 Groq + 4 OpenRouter, + `quality_check_html()`), `prompt_utils.py` (`get_base_prompt`, `build_improve_prompt`), `generation.py` (in-memory `_lab_jobs` store + thread workers), `service.py` (compatibility shim re-exporting public API), `router.py` + `generation_routes.py` (HTTP layer).
- Generation jobs are in-memory only — restarting the backend clears in-flight jobs.
- Routers: `labs/router.py` (`GET /api/labs/models`, `GET /api/labs/prompts/{phase}/{type}`) + `labs/generation_routes.py` (`POST /generate`, `GET /generate/{job_id}/results`, `POST /improve-prompt`, `GET /results/{id}/scorm`, `GET /results`, `PATCH /results/{id}/select`).

**RAG pipeline** (`backend/rag/`) — fed by uploads, retrieved by ENGAGE/EXPLORE:
- Ingestion runs inline in `POST /api/uploads/temp` via `pipeline.ingest_upload`. Best-effort: failures are reported in the response body's `rag_status` field but never block the upload.
- **Multimodal binary path** (PDF, image, audio, video): file bytes are passed directly to `GeminiEmbedder.embed_file(data, mime_type)` which returns ONE 768-d vector for the whole file (no Whisper/vision/OCR step). One row is inserted into `rag_chunks` with placeholder text `[Archivo multimodal: <filename> (<mime>)]` and the multimodal embedding.
- **Text path** (DOCX, PPTX, fallback): `parsers.extract_text()` → `chunker.chunk_text()` (800-char window, 150 overlap, max 100 chunks) → `embedder.embed_batch()` → `store.insert_chunks()`.
- Parsers (`parsers.py`): PDF (`pypdf`, used only when multimodal embedder unavailable), DOCX (`python-docx`), PPTX (`python-pptx`). Audio/image parsers in this module are kept as legacy fallback (call `transcribir_audio` / `generar_vision`) but are NOT invoked when the multimodal embedder is active.
- Embedder is pluggable via `RAG_EMBEDDER`: `gemini` (default, **`gemini-embedding-2-preview`** — Public Preview Mar 2026, natively multimodal: text + image + PDF + audio + video; Matryoshka-truncated to 768-d), `gemini-001` (stable text-only fallback), or `local` (sentence-transformers MiniLM, 384-d — only if Render RAM allows). Dimension change requires reindex.
- Retrieval: `retriever.top_k(db, query, upload_ids, k=5)` runs cosine via pgvector ivfflat index. `build_contexto_usuario(chunks)` formats results for prompt injection.
- Injection: `agents/utils.format_contexto_usuario()` wraps retrieved text in `[CONTEXTO_APORTADO_POR_EL_USUARIO]` tags. All `prompt_texto`/`prompt_html`/`prompt_codigo`/`prompt_simulador` functions accept an optional `contexto_usuario` param; if empty, the block is omitted (no behavior change for users without uploads).
- Lifecycle: chunks expire 1 h after upload unless tied to an OVA via `store.tie_uploads_to_ova()` (called from `save_ova` when `payload.upload_ids` is non-empty). `purge_expired()` runs on backend startup.
- `GET /api/rag/health` reports embedder, vector dim, and pgvector extension state.
- Set `RAG_DISABLED=1` to skip the whole pipeline.

**File uploads** (`backend/uploads/`):
- Allowed: PDF, DOCX, PPTX; MP3, WAV, M4A, AAC, OGG, WebM; JPEG, PNG, GIF, WebP.
- Limits: `UPLOAD_MAX_FILE_SIZE_MB` MB/file (default 20), `UPLOAD_MAX_FILES`/request (default 5).
- Stored at `backend/tmp/uploads/{user_id}/` temporarily (override via `UPLOAD_TEMP_DIR`); TTL defaults to 1 h via `UPLOAD_TEMP_TTL_SECONDS`. The in-memory `_temp_uploads` registry tracks lifetimes; expired entries are pruned on every access.
- Lifecycle: claimed by the OVA-save flow → tied to a generated OVA → deleted on claim or on TTL expiry. Per-file RAG ingestion is triggered inline (see RAG section).

**Admin user management** (`backend/users/`): the legacy 500-line `admin_router.py` was split for readability — each sub-router stays under the 200-line cap.

| Module | Endpoints |
|---|---|
| `admin_router.py` | Orchestrator. Mounts the three sub-routers below |
| `admin_list_router.py` | `GET /` — paginated listing |
| `admin_profile_router.py` | `PATCH /{id}` (profile fields), `PATCH /{id}/role` (with admin-escalation guard) |
| `admin_account_router.py` | `PATCH /{id}/status`, `POST /{id}/unlock`, `POST /{id}/reset-password-email`, `POST /{id}/reset-password-whatsapp` |
| `admin_helpers.py` | UUID parser, hierarchy guards, `commit_or_500()` (never echoes raw DB errors to clients), gender/phone normalizers |

**Password-reset triggers never return the token.** Both the email and WhatsApp endpoints issue a `secrets.token_urlsafe(32)` reset token, persist it as a `PasswordResetToken` row, and return ONLY a delivery URL (email queued via `BackgroundTasks`, WhatsApp `api.whatsapp.com/send?...` share URL). The token itself never crosses the HTTP boundary back to the admin — this closes the previous escalation vector where an admin could capture a peer's reset token from the JSON response.

**Other routers**: `rag/router.py` (health + debug `GET /chunks/by-upload/{upload_id}`), `roles/router.py` + `roles/delete_router.py` (CRUD with delete-and-reassign flow), `users/profile_router.py` (self profile read/edit + change password), `uploads/router.py`.

**Temp upload internals** (`backend/ova/uploads_service.py` + `uploads_state.py`): config + CRUD live in `uploads_service.py`; the thread-safe in-memory registry, lock, and `prune_expired_locked()` live in `uploads_state.py`. Splitting keeps both files <200 lines and isolates the lock surface.

**Dev tool**: `backend/tools/prompt_lab.py` — manual LLM prompt testing utility, not part of the API; exempted from line limits.

### Frontend — React 19 + Vite

**Routing** (`frontend/src/App.jsx`): All routes declared here. Two guard components: `ProtectedLayout` (checks token at render time, redirects to `/login` if missing/expired) and `AdminRoute` (fetches `/api/auth/me`, checks `role === 'administrador'`, redirects to `/dashboard` otherwise). Token expiry also polled every 60 s inside `App`.

Active routes:
```
/                            → redirect to /login
/login                       → LoginPage          (public)
/register                    → RegisterPage       (public)
/dashboard                   → DashboardPage      (ProtectedLayout)
/crear-ova                   → CrearOvaPage       (ProtectedLayout)
/mis-ovas                    → MisOvasPage        (ProtectedLayout)
/mis-ovas/:ovaId/editar      → EditarOvaPage      (ProtectedLayout)
/papelera                    → PapeleraPage       (ProtectedLayout)
/profile                     → ProfilePage        (ProtectedLayout)
/metodologia/engage          → EngagePage         (ProtectedLayout)
/metodologia/explore         → ExplorePage        (ProtectedLayout)
/admin/roles                 → AdminRolesPage     (AdminRoute)
/admin/users                 → AdminUsersPage     (AdminRoute)
/admin/labs                  → LabsPage           (AdminRoute)
*                            → NotFoundPage
```

Uses **react-router v7** (`react-router` package, not `react-router-dom`). `BrowserRouter` wraps `<App />` in `main.jsx`.

**Layout**: `AppLayout` wraps authenticated pages with `Navbar` + collapsible `Sidebar` + `<Outlet />`. `Sidebar` listens to `matchMedia('(min-width: 1024px)')` so it reacts to live resize / device rotation. `Navbar` has a hamburger that toggles a mobile menu using `SidebarMenu`. Admin pages share the same layout, gated by `AdminRoute`. `AdminLayout` exists but admin pages are currently mounted inside `AppLayout`.

**Auth pages**: `LoginPage` and `RegisterPage` use `autoComplete="email"` / `autoComplete="current-password"` / `autoComplete="new-password"` + `name=` attributes so password managers work. Submit buttons render an inline spinner while submitting.

**Notifications**: `sonner` `<Toaster>` mounted in `App.jsx` at `position="top-right"` with `richColors` and `closeButton`.

**Crear OVA UI** (`frontend/src/pages/CrearOvaPage.jsx` + `frontend/src/components/crear/`):
- Wizard split into composable panels — `PromptPanel`, `SelectionChips`, `ProgressPanel`, `ResultsPanel` (all in `components/crear/`). File uploads rendered as `FileChip` chips (also in `crear/`). Upload formatting utilities (`formatSize`, `getUploadBadge`) live in `components/ovaUploadUi.js`. Each file <200 lines (ESLint hard cap).
- `PhaseSelectModal` is multi-select with a per-phase cap exported as `MAX_PER_PHASE = 4`. Confirm returns `{engage: Resource[], explore: Resource[]}`. Each card shows its selection order (1..N) instead of a plain checkmark; disabled state when the cap is reached.
- Mobile-first: modal switches between bottom-sheet (mobile) and centered dialog (sm+); generate button stretches full-width on mobile.
- `ResultsPanel` renders one tab per generated resource (color-coded ENGAGE/EXPLORE) and embeds each as an isolated `<iframe>` blob via the shared `HtmlPreview` component (`components/engage/HtmlPreview.jsx`).
- `HtmlCodePreview` (`components/HtmlCodePreview.jsx`) — shared component used in the editor; renders HTML with a preview/code toggle. The iframe stays CSS-hidden (never unmounted) to prevent blob URL revocation under React StrictMode. Falls back to plain text when content isn't HTML.
- `useOvaCreation` walks the picked resources sequentially (avoids Groq TPM spikes), runs them with up to 2 retries (exponential backoff) on failure, and updates `stepStates` to render states like `generating`, `retrying` (with attempt number), `done`, or `failed` in `ProgressPanel`. If some resources fail after retries, it saves a partial OVA with the successful resources (setting status to `partial`), preventing whole-wizard failure. `saveOva()` posts one phase row per resource with a `title` like `ENGAGE · Cómic Interactivo` and the `resource_type_id`.

**Key hooks** (`frontend/src/hooks/`) — every file kept under 200 lines (ESLint `max-lines`):

| Hook | Responsibility |
|---|---|
| `useOvaCreation` | Multi-resource creation wizard (up to 4 ENGAGE + 4 EXPLORE) → sequential generation with live `partial` state → save → optional SCORM export |
| `useLlmOptions` | Fetches `/api/ova/llm-options` for the LLM engines panel |
| `useOvaList` | List, search, pagination, batch actions — composes `useOvaSelection` + `useOvaMetadata` + `useOvaFilters` |
| `useOvaFilters` | Handles debounced search and status filter state |
| `useOvaSelection` | Multi-select state for the OVA list |
| `useOvaMetadata` | Rename / edit OVA metadata |
| `useOvaUploads` | File upload state for OVA creation |
| `usePhaseGeneration` | Single-phase resource generation |
| `useEngageGeneration` | Wrapper of `usePhaseGeneration` for ENGAGE |
| `useRegenEditor` | Phase regen from editor — composes `useRegenConfirmModal` |
| `useRegenConfirmModal` | Handles confirmation dialog states and messages for single, selected, and full OVA regeneration |
| `useTrashList` | Trash (papelera) list, single + bulk restore/delete via shared helpers |
| `useProfile` | User profile view/edit — composes `useChangePassword` |
| `useChangePassword` | Change-password form (validation + submit) |
| `useRoles` | Roles CRUD — composes `useRoleDelete` |
| `useRoleDelete` | Delete-with-reassign flow for roles |
| `useUsersAdmin` | Admin user management |
| `useLabGeneration` | Labs: model selection, parallel generation, winner picking |
| `useLabPrompt` | Labs: prompt text state, versions CRUD |

**Services** (`frontend/src/services/`): All read JWT via `getToken()` and send `Authorization: Bearer <token>`.

```
ovaCreationService.js   → /api/ova/* + /api/agents/{engage,explore}/generate
llmOptionsService.js    → /api/ova/llm-options
engageService.js        → /api/agents/engage/*
exploreService.js       → /api/agents/explore/*
ovaHistoryService.js    → /api/ovas/:id/versions
ovaEditService.js       → /api/ovas/:id/fases
uploadService.js        → /api/uploads/temp
labsService.js          → /api/labs/*
adminUsersService.js    → /api/users/* (admin user management)
```

`downloadOvaScorm()` in `ovaCreationService.js` follows the backend's 302 redirect to Supabase Storage transparently — `fetch` exposes the resulting blob either from the redirect or from the local-disk byte fallback.

**Auth utils** (`lib/auth.js`): `getToken()`, `saveToken()`, `clearToken()`, `decodeToken()`, `isTokenExpired()`. Token stored under key `genova_token` in `localStorage`. Migration to httpOnly cookie is a known follow-up (XSS hardening).

> Supabase is used **only as a Postgres database** via `DATABASE_URL` from the backend. There is no `@supabase/supabase-js` (browser SDK) dependency — storage/auth/realtime are not used. The previous `lib/supabaseClient.js` shim has been removed.

**Shared UI components** worth noting:
- `components/phase/PhasePage.jsx` — generic phase page shared by `EngagePage` + `ExplorePage`; owns resource selection, concept input, and preview via `usePhaseGeneration`.
- `components/OvaFiveEViewer.jsx` — renders all 5E phases of an OVA as tabbed sections with color-coded badges (enganche=violet, exploracion=sky, explicacion=emerald, elaboracion=amber, evaluacion=rose). Used in `EditarOvaPage`.

**Other lib utilities**:
- `lib/permissions.js` — `AVAILABLE_PERMISSIONS` constant (permission strings)
- `lib/roleUtils.js` — `getRoleColorClasses(roleName)` → Tailwind classes per role
- `lib/labQuality.js` — `checkHtmlQuality(html)` → `{cdn_ok, scorm_ok, min_length_ok, char_count}` (mirrors server-side checks; used for live badges in Labs UI)

**Frontend deps** (`frontend/package.json`): React 19.2, React Router 7.15, Sonner 2 for toasts. Build: Vite 8, Tailwind CSS 4 via `@tailwindcss/vite`. Lint: ESLint 10 + `eslint-plugin-react-hooks` 7 + `eslint-plugin-react-refresh`.

**Code style**: Prettier enforces `printWidth: 100`, `singleQuote: true`, `semi: false`, `trailingComma: "es5"`. ESLint enforces max 200 lines per file (error). `.editorconfig` at repo root enforces LF, UTF-8, 2-space (4-space for `*.py`, tabs for `Makefile`).

### Environment variables

**Backend** (`backend/.env`):
```
DATABASE_URL=postgresql+psycopg://...supabase.com.../postgres?sslmode=require
JWT_SECRET=                             # REQUIRED — ≥16 chars, no weak defaults
JWT_ALGORITHM=HS256
JWT_EXPIRES_MINUTES=1440
LOG_LEVEL=INFO
LATENCY_THRESHOLD_MS=278               # WARN threshold for ProcessTimeMiddleware (non-LLM endpoints)
OVA_GENERATION_DURATION_SECONDS=14      # simulated generation duration (legacy)
OVA_OUTPUT_DIR=                         # local-disk fallback for SCORM zips
OVA_MAX_GENERATED_IMAGES=2
UPLOAD_MAX_FILES=5
UPLOAD_MAX_FILE_SIZE_MB=20
UPLOAD_TEMP_DIR=                        # override temp upload root (default backend/tmp/uploads)
UPLOAD_TEMP_TTL_SECONDS=3600
OVA_ENABLED_LLMS=                       # comma list of catalog IDs; empty=all
GROQ_API_KEY=
OPENROUTER_API_KEY=
POLLINATIONS_TOKEN=                     # optional, higher image quota
APP_URL=https://genova.ai               # sent as HTTP-Referer to OpenRouter
# Supabase Storage (SCORM zip persistence). SERVICE_ROLE_KEY is server-only.
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=scorm-packages
# RAG (pgvector + embeddings).
RAG_EMBEDDER=gemini                     # 'gemini' (default), 'gemini-001' (text-only fallback), or 'local'
GEMINI_API_KEY=                         # required when RAG_EMBEDDER=gemini*
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=150
RAG_MAX_CHUNKS_PER_FILE=100
RAG_TOP_K=5
RAG_MAX_CONTEXT_CHARS=6000
RAG_DISABLED=                           # set to 1 to skip RAG pipeline
RAG_LOCAL_MODEL=all-MiniLM-L6-v2        # only when RAG_EMBEDDER=local
CORS_ORIGINS=                           # comma-separated extra allowed origins
# SMTP — password-reset emails (defaults point at project Gmail).
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASSWORD=
```

LLM catalog IDs live in `backend/ova/llm_helpers.py:LLM_CATALOG` — currently
`groq-llama-3.3-70b`, `groq-gpt-oss-120b`, `groq-qwen3-32b`, `openrouter-deepseek-v4-flash`. These are surfaced through `GET /api/ova/llm-options`; `OVA_ENABLED_LLMS` filters by `id`. The catalog now matches what `agents/llm_router.py` actually uses for the `codigo` task (DeepSeek V4 Flash).

**Frontend** (`frontend/.env`):
```
VITE_API_BASE_URL=http://localhost:8000
VITE_MIN_PROMPT_CHARS=10
```

## Security notes for code changes

- Never log raw passwords or tokens; never expose raw LLM error messages in HTTP 5xx responses.
- **Never echo `str(e)` from a SQLAlchemy / driver error to the client.** Use the local `commit_or_500()` helpers (`users/admin_helpers.py`, `roles/router.py`, `roles/delete_router.py`, `users/profile_router.py`) — they log via `logger.exception` and respond with a generic message.
- **Never return reset tokens, OTPs, or any single-use credentials in HTTP responses.** Issue the token, persist it, and return only a delivery URL (email queued via `BackgroundTasks`, WhatsApp `wa.me` share link). See `users/admin_account_router.py` for the canonical pattern.
- New auth-adjacent endpoints should use Pydantic models with explicit `Field(max_length=…)` bounds. Bcrypt cost is exponential — input length matters.
- New endpoints that take external input should be rate-limited via `@limiter.limit("N/minute")`. Include `request: Request` in the signature or SlowAPI cannot key the limit. `POST /reset-password` is rate-limited at `10/minute` per IP.
- When adding a JWT claim, update `build_token()` in `auth/router.py` and any verifier in `auth/dependencies.py` together.
- `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, and `SMTP_PASSWORD` are server-only. Never expose to the frontend bundle (no `VITE_*` aliasing).
- RAG chunks are scoped to `user_id` via FK; retrieval queries filter by `upload_id` which the user must own. Don't widen the retrieval predicate.
- `auth/email.py` no longer ships hardcoded SMTP credentials. If `SMTP_USER` / `SMTP_PASSWORD` are unset, `send_reset_email()` raises `EmailNotConfigured` and the failure is logged — it never falls back to a baked-in credential.

## File-size + responsive conventions

- **200-line ceiling** is project-wide. Frontend has it as an ESLint hard error; backend treats it as a convention (`backend/tools/prompt_lab.py` is the only intentional exception, documented in `pyproject.toml`-adjacent rationale).
- When splitting, prefer co-located sub-folders (`components/admin/users/`, `components/crear/`, `users/admin_*`) over a generic shared bucket — the sub-folder name is its own contract.
- HTTP layer ↔ React hook ↔ React page is a three-tier split: services own `fetch` + auth headers, hooks own state + toasts, pages own layout. `adminUsersService.js` / `useUsersAdmin.js` / `AdminUsersPage.jsx` is the reference example.
- **Responsive defaults**: mobile-first. Avoid fixed pixel heights — use viewport (`h-[60vh]`) + `min-h`/`max-h` clamps. Modals: bottom-sheet on mobile (`items-end p-0`, `rounded-t-2xl`), centered dialog on `sm+` (`sm:items-center sm:p-4`, `sm:rounded-xl`). Tables that can't collapse get `overflow-x-auto` with `min-w-[…]` columns so horizontal scroll degrades gracefully — see `components/admin/users/UsersTable.jsx`.
