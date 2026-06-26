# GenOVA

Plataforma web para la generación asistida por IA de Objetos Virtuales de Aprendizaje (OVA) con exportación SCORM 1.2. Implementa la metodología 5E (ENGAGE y EXPLORE) y empaqueta los resultados como paquetes SCORM listos para subir a un LMS.

## Contenido

- [Harness Engineering + SDD](#harness-engineering--sdd)
- [Stack](#stack)
- [Requisitos previos](#requisitos-previos)
- [Configuración de entorno](#configuración-de-entorno)
- [Ejecución](#ejecución)
- [Scripts disponibles](#scripts-disponibles-raíz)
- [Comandos backend](#comandos-backend)
- [Estructura del monorepo](#estructura-del-monorepo)
- [Convenciones de código](#convenciones-de-código)
- [Funcionalidades principales](#funcionalidades-principales)
- [Cómo funciona la generación (5E)](#cómo-funciona-la-generación-5e)
- [Rutas del frontend](#rutas-del-frontend)
- [Endurecimiento de seguridad](#endurecimiento-de-seguridad)
- [Endpoints de salud](#endpoints-de-salud)
- [CI/CD](#cicd)
- [Seed de desarrollo](#seed-de-desarrollo)
- [Documentación detallada](#documentación-detallada)

## Documentación detallada

Este README es el **overview**. La referencia profunda vive en [`docs/`](docs/) (la
genera/actualiza el agente `doc_author`):

| Doc | Contenido |
|---|---|
| [docs/api.md](docs/api.md) | Referencia REST completa (~70 endpoints) + Swagger `/docs` |
| [docs/database.md](docs/database.md) | Esquema de BD (tablas, índices, pgvector) |
| [docs/generacion-5e.md](docs/generacion-5e.md) | Pipeline 5E, 10 tipos de recurso, fallback LLM, validador HTML |
| [docs/deployment.md](docs/deployment.md) | Deploy cloud (Vercel/Render/Supabase) + **referencia completa de env vars** |
| [docs/testing.md](docs/testing.md) | Estrategia BDD (unit/backend/e2e) + CI |
| [docs/labs.md](docs/labs.md) | Sandbox de iteración de prompts (admin) |

## Harness Engineering + SDD

### ¿Qué es?

Este repositorio usa **Harness Engineering** combinado con **Spec-Driven Development (SDD)** para garantizar que toda funcionalidad nueva pasa por una especificación aprobada antes de implementarse. El harness no depende de ninguna herramienta específica — los agentes son archivos Markdown portables y los hooks son scripts PowerShell independientes que se pueden conectar a cualquier plataforma de agentes compatible.

### Cómo empezar con el harness

1. **Clonar el repo** — los archivos del harness ya están en `.claude/`
2. **Conectar los hooks** en tu plataforma de agentes (ver tabla de hooks abajo):
   - `SessionStart` → `.claude/hooks/session-start.ps1`
   - `PostToolUse (Edit|Write)` → `.claude/hooks/post-edit.ps1`
   - `Stop` → `.claude/hooks/on-stop.ps1`
   - Status bar → `.claude/hooks/status-line.ps1`
3. **Registrar los agentes** desde `.claude/agents/` como instrucciones de sistema en tu plataforma
4. El agente `leader` es el punto de entrada — cualquier mensaje pasa primero por él
5. Para crear una spec: describir la feature en lenguaje natural; `leader` coordina `spec_author`
6. Revisar estado actual: `feature_list.json` y `sdd/progress/current.md`
7. Verificación manual: `./verify.ps1 -Quick`

#### Prompt de inicio (starter prompt)

**Claude Code:** la inicialización ya está configurada automáticamente. `CLAUDE.md` instruye al agente a leer `AGENTS.md → feature_list.json → sdd/progress/current.md` al arrancar, y el hook `session-start.ps1` corre `verify.ps1 -Quick` sin intervención manual.

**Otras plataformas de agentes:** copia este prompt como **system message** de tu conversación:

```
Eres el agente **leader** de GenOVA.

Al iniciar esta sesión:
1. Lee `AGENTS.md` — mapa de navegación del repo y reglas del harness
2. Lee `feature_list.json` — estado de todas las features (pending/spec_ready/in_progress/done/blocked)
3. Lee `sdd/progress/current.md` — estado de la sesión anterior

Rol y reglas:
- Actúas siempre como orchestrator. Nunca implementas código directamente.
- Toda feature nueva pasa por spec_author con aprobación humana antes de implementarse.
- No declaras done sin tests verdes (./verify.ps1).
- Usas subagentes según el tipo de tarea: spec_author, implementer, reviewer, explorer, skill-advisor, spec-sync, doc_author.
- Una sola feature activa a la vez.

Clasificación de mensajes entrantes:
- Feature nueva / Historia de Usuario → coordina spec_author (HU o EN)
- Bug reportado → coordina spec_author (BU)
- Tarea técnica → coordina spec_author (TA)
- Pregunta conceptual o de estado → responde directamente como leader

Contexto del proyecto:
- GenOVA — plataforma web para generación asistida por IA de Objetos Virtuales de Aprendizaje (OVA) con exportación SCORM 1.2.
- Stack: React 19 + FastAPI + Supabase PostgreSQL + pgvector + Groq/OpenRouter.
- Arquitectura frontend: services → hooks → pages. Backend: router → service → model.
- Límite: 200 líneas por archivo (hard rule en Biome y ruff).
```

### Flujo SDD completo

```
[Mensaje] → leader → spec_author (PASO 0: detecta 1 o N specs)
                   → 4 pasos SDD por spec
                   → spec_ready → ⏸ HUMANO APRUEBA → in_progress
                   → implementer
                     ├─ FASE 0 (solo si spec tiene "## Mockup ASCII"):
                     │    consulta skill-advisor → genera wireframe shadcn/ui
                     │    → ⏸ HUMANO APRUEBA wireframe → sync mockup al spec
                     └─ FASE 1: ctx7 (find-docs) docs de librerías → implementa
                        → verify.ps1 entre tareas
                   → reviewer (CHECKPOINTS.md C1-C8, auto-fix tests)
                   → done
                   → ⏸ HUMANO → doc_author (genera/actualiza docs en docs/) — opcional
                   → spec-sync (propone actualizar specs que referencian
                                interfaces renombradas) — en cierre de sesión
```

Estados de una feature: `pending` → `spec_ready` → `in_progress` → `done` (o `blocked` / `aborted`)

### Agentes

| Agente | Rol | Cuándo se invoca |
|---|---|---|
| `leader` | Orquestador — detecta tipo de tarea, coordina agentes, nunca implementa código | Siempre (punto de entrada) |
| `spec_author` | Genera specs SDD en 4 pasos; detecta múltiples specs por mensaje y las procesa secuencialmente | Cuando hay feature nueva, bug o tarea a especificar |
| `implementer` | Implementa una feature por spec aprobada; FASE 0 wireframe (si aplica) + FASE 1 código; corre `verify.ps1` entre tareas | Cuando spec está en `spec_ready` y el humano aprueba |
| `reviewer` | Verifica implementación contra CHECKPOINTS.md; auto-repara tests (máx 2 intentos); puede actualizar su propia config | Tras cada implementación |
| `explorer` | Mapea codebase antes de specs complejas; devuelve score de complejidad 1–5 y riesgos | Features cross-stack o de alto riesgo |
| `skill-advisor` | Broker de skills — busca, verifica seguridad (trustedSources + scanner) y actualiza skills instaladas. Service agent idempotente | Al pedir "busca una skill" / "actualiza skills"; el implementer lo consulta en FASE 0 |
| `spec-sync` | Tras renombres de interfaz pública (endpoint, componente, hook), detecta specs que referencian lo viejo y propone actualizaciones | Cierre de sesión, tras una feature `done` |
| `doc_author` | Genera/actualiza documentación en `docs/` con el mismo flujo interactivo de 4 pasos que `spec_author`; detecta solapamiento y actualiza la doc existente en vez de duplicar | Al pedir "documenta X" o cuando el leader lo ofrece al cerrar una feature `done` |

### Hooks automáticos

| Hook | Evento | Acción |
|---|---|---|
| `session-start.ps1` | SessionStart | Corre `verify.ps1 -Quick`, marca timestamp en `sdd/progress/current.md`, avisa si una feature lleva >72 h en progreso |
| `post-edit.ps1` | PostToolUse (Edit\|Write) | Lint inmediato — `pnpm lint` (frontend) o `ruff check` (backend); muestra primeras 20 líneas de error. **Debounce 30 s**: no relinta el mismo área dos veces seguidas |
| `on-stop.ps1` | Stop | `verify.ps1` completo + escaneo de 9 patrones de secretos (bloquea salida si encuentra) + aviso de **wireframes huérfanos** (FASE 0 sin completar) |
| `status-line.ps1` | Status bar | Muestra `GENOVA <branch> \| <feature_id_o_idle>` en tiempo real |

### Verificación rápida

```powershell
./verify.ps1          # lint + unit + backend BDD (si backend activo)
./verify.ps1 -Quick   # solo lint + unit (sin backend)
./verify.ps1 -E2E     # incluye Playwright E2E (requiere ambos servidores)
```

Estrategia de pruebas completa (BDD unit/backend/e2e + CI) en [docs/testing.md](docs/testing.md).
Smoke tests manuales (playwright-cli, 6 bloques A–F): [`tests/playwright-smoke/SMOKE_TESTS.md`](tests/playwright-smoke/SMOKE_TESTS.md).

### Skills

Las skills extienden las capacidades de los agentes. El store canónico vive en `.agents/skills/` y se enlaza por symlink a `.claude/skills/` (y a otros tools).

| Skill | Para qué | Comando subyacente |
|---|---|---|
| `find-skills` | Descubrir e instalar skills del ecosistema | `npx skills find` / `add` |
| `find-docs` | Docs actualizadas de cualquier librería (context7 de Upstash) | `npx ctx7@latest library\|docs` |

- **`skills-catalog.json`** — registro propio: metadata, `triggers` (qué dispara cada skill), `benefitsAgents`, `trustedSources` y estado de seguridad.
- **`skills-lock.json`** — versión + hash de cada skill (lo gestiona el CLI, no se edita a mano).
- **Gestión vía leader** — pídele "busca una skill para X" o "actualiza skills"; el `skill-advisor` ejecuta el flujo con gate humano antes de instalar/actualizar.
- **Seguridad** — sources fuera de `trustedSources` quedan en `pendingReview`; el advisor además incorpora el verdicto del scanner (Gen / Socket / Snyk) que imprime `npx skills add`.

Comandos clave:

```bash
npx skills find "<query>"              # buscar
npx skills add <owner/repo@skill>      # instalar
npx skills check                       # ver updates disponibles
npx skills update -p -y                # actualizar (project scope)
```

### Wireframe-first (FASE 0)

Cuando un spec de frontend incluye una sección `## Mockup ASCII`, el `implementer` materializa primero el wireframe antes de implementar funcionalidad:

1. Consulta al `skill-advisor` por una skill útil.
2. Genera `frontend/src/wireframes/<ID>_<Page>Wireframe.jsx` — **solo visual** (sin hooks, sin fetch, datos hardcoded) con **shadcn/ui** + Tailwind.
3. ⏸ El humano aprueba. Si pide cambios, el `## Mockup ASCII` del spec se actualiza para reflejar el wireframe aprobado.
4. Recién entonces arranca FASE 1 (implementación real). Al terminar, el wireframe se elimina.

Los wireframes son temporales: están en `.gitignore` y exentos del límite de líneas de Biome. Se eligió **shadcn/ui** porque los componentes se copian al repo (ownership total, sin lock de versión), adopta los design tokens existentes (indigo + slate) y es compatible con Tailwind v4.

### Portabilidad multi-herramienta

El harness no depende de Claude Code. `AGENTS.md` es la base de reglas que leen todas las herramientas:

| Herramienta | Lee reglas | Lee agents |
|---|---|---|
| Claude Code | `CLAUDE.md` + `AGENTS.md` | `.claude/agents/` |
| Codex CLI | `AGENTS.md` | — |
| Opencode | `AGENTS.md` | `.opencode/agents/` (copias transformadas) |
| GitHub Copilot | `AGENTS.md` + `.github/copilot-instructions.md` | `.github/agents/sdd-leader.agent.md` |
| Antigravity / Gemini CLI | `GEMINI.md` → `AGENTS.md` | — |

Post-clone en Windows, ejecuta `scripts/setup-harness.ps1` para resincronizar agentes de Opencode (`.opencode/agents/*.md` desde `.claude/agents/*.md`, con transformación de `mode/hidden/permission`) y recrear symlinks de skills (`.claude/skills/*` → `.agents/skills/*`). Usa `-Check` para verificar sin crear.

### Archivos clave del harness

| Archivo | Rol |
|---|---|
| `AGENTS.md` | Punto de entrada — mapa del repo para agentes |
| `feature_list.json` | Registro de todas las features y su estado |
| `CHECKPOINTS.md` | Criterios objetivos de calidad (actualizable por reviewer) |
| `verify.ps1` | Orquestador de verificación (lint + tests) |
| `tests/playwright-smoke/SMOKE_TESTS.md` | Smoke tests manuales playwright-cli (6 bloques A–F: auth, rol, mutaciones, logout, registro, prod) |
| `sdd/progress/current.md` | Estado de la sesión activa |
| `sdd/progress/history.md` | Bitácora append-only de sesiones anteriores |
| `sdd/specs/HU-*.md`, `EN-*.md` | Especificaciones de historias y enablers |
| `sdd/tasks/TA-*.md` | Especificaciones de tareas técnicas |
| `sdd/bugs/BU-*.md` | Especificaciones de defectos |
| `.claude/agents/` | Definiciones de agentes (Markdown portables) |
| `.claude/hooks/` | Scripts PowerShell de lifecycle |
| `.claude/settings.json` | Configuración de hooks y permisos |
| `skills-catalog.json` | Registro de skills instaladas (metadata, triggers, seguridad) |
| `skills-lock.json` | Lock de versiones/hash de skills (lo gestiona `npx skills`) |
| `.agents/skills/` | Store canónico de skills (`find-skills`, `find-docs`) |
| `scripts/setup-harness.ps1` | Sincroniza agentes de Opencode + recrea symlinks de skills (Windows) |
| `GEMINI.md` | Override de reglas para Antigravity / Gemini CLI |
| `.github/copilot-instructions.md` | Reglas de workspace para GitHub Copilot |
| `.github/agents/sdd-leader.agent.md` | Adaptador del leader para Copilot |
| `.opencode/` | `opencode.json` + agents transformados para Opencode |

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 8 + Tailwind CSS 4 + React Router 7 + Sonner |
| Backend | FastAPI 0.122 + SQLAlchemy 2 + Uvicorn + SlowAPI |
| Base de datos | Supabase (PostgreSQL + pgvector) vía `psycopg` |
| Storage | Supabase Storage (`scorm-packages`) — fallback automático a disco local |
| RAG | pgvector + Gemini `gemini-embedding-2-preview` (multimodal: texto + PDF + imagen + audio + video) |
| LLMs | Groq SDK (Llama 3.3 70B, GPT-OSS 120B, Qwen3 32B, Whisper, Orpheus TTS) + OpenRouter (DeepSeek V4 Flash: free & paid fallback) con motor de validación y auto-reparación estructural de HTML |
| Auth | JWT (HS256 con `iat`/`jti`/`iss`) + bcrypt + bloqueo por intentos fallidos |
| Email | SMTP (Gmail por defecto) para restablecimiento de contraseña |
| Empaquetado | pnpm workspaces · Backend con pip **o** uv |

## Requisitos previos

- [Node.js 20+](https://nodejs.org) y [pnpm 10+](https://pnpm.io)
- [Python 3.11+](https://python.org) (pin en `backend/.python-version`)
- [uv](https://docs.astral.sh/uv/) *(opcional — instala backend más rápido; pip sigue funcionando)*
- [Docker + Docker Compose](https://docs.docker.com/get-docker/) *(solo para ejecución con Docker)*
- Proyecto activo en [Supabase](https://supabase.com) con la URL de conexión a PostgreSQL

## Configuración de entorno

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

Edita `backend/.env` (mínimo viable):

```env
DATABASE_URL=postgresql+psycopg://postgres.[REF]:[PASSWORD]@[REGION].pooler.supabase.com:5432/postgres?sslmode=require
JWT_SECRET=<mínimo 16 chars; genera con: python -c "import secrets; print(secrets.token_urlsafe(48))">
GROQ_API_KEY=...
OPENROUTER_API_KEY=...

# Opcional — filtra qué modelos expone /api/ova/llm-options
# IDs disponibles: groq-llama-3.3-70b, groq-gpt-oss-120b, groq-qwen3-32b, openrouter-deepseek-v4-flash
OVA_ENABLED_LLMS=

# Producción — orígenes permitidos (CORS). Obligatorio si ENV=production.
CORS_ORIGINS=https://tu-dominio.com

# Auth — desactiva el fallback Authorization: Bearer una vez todos los clientes usan cookies
AUTH_ACCEPT_BEARER=1   # default 1 (acepta); pon 0 en producción cuando estés listo

# Pool de conexiones (Supabase Transaction pooler, puerto 6543)
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=10
```

> ⚠️ `JWT_SECRET` es obligatorio. El backend **falla al arrancar** si la variable está vacía, contiene un valor débil (`change-me`, `secret`, `test`, `changeme`) o tiene menos de 16 caracteres.
>
> ⚠️ Usa el pooler de **Transacciones** de Supabase (puerto `6543`), no el de Sesiones. El pooler de sesiones es incompatible con `pool_pre_ping=True` bajo carga.

### Supabase Storage (persistencia de OVAs)

Para que los `.zip` SCORM sobrevivan reinicios del backend, configura:

```env
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_STORAGE_BUCKET=scorm-packages
```

Crea el bucket `scorm-packages` **privado** en Supabase Dashboard → Storage. RLS por defecto bloquea el acceso anónimo; el backend usa la service role key (bypass RLS) y emite signed URLs de 1 hora a los clientes. Si no configuras esto, el backend cae automáticamente a disco local (`OVA_OUTPUT_DIR`, default `backend/scorm_output/`) — útil en dev pero los archivos se pierden al reiniciar.

### RAG (opcional)

Si quieres que los archivos subidos alimenten al LLM con contexto:

```env
RAG_EMBEDDER=gemini                # default; alternativas: gemini-001, local
GEMINI_API_KEY=<google-ai-studio>  # free tier: 100 RPM, 1000 RPD por proyecto
```

> Modelo usado: **`gemini-embedding-2-preview`** (Public Preview, Mar 2026).
> Natively multimodal — PDF/imagen/audio/video se embeben directos sin Whisper
> ni vision por separado. Matryoshka truncado a 768-d para encajar en
> `vector(768)`. Fallback estable: `RAG_EMBEDDER=gemini-001` (text-only GA),
> o `RAG_EMBEDDER=local` con `sentence-transformers` (384-d, requiere RAM extra).

Primer arranque: aplica migraciones automáticamente — incluye `CREATE EXTENSION vector`. Verifica con `GET /api/rag/health` → `{ pgvector_ready: true }`.

Para desactivar RAG por completo: `RAG_DISABLED=1`.

### SMTP (restablecimiento de contraseña)

`POST /api/auth/reset-password` consume un token enviado por correo. El sender vive en `backend/auth/email.py`. Override de credenciales:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=tu-cuenta@gmail.com
SMTP_PASSWORD=<app-password sin espacios>
```

> ⚠️ Si `SMTP_USER` / `SMTP_PASSWORD` no están configuradas, el backend lanza `EmailNotConfigured` y registra el fallo — **no envía correos y no tiene credenciales hardcodeadas**.

## Ejecución

### Con Docker (recomendado)

```bash
pnpm dev:docker
```

Levanta frontend (`http://localhost:5173`) y backend (`http://localhost:8000`) en contenedores con hot-reload.

### Sin Docker — Backend con `pip`

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Sin Docker — Backend con `uv` (más rápido)

```bash
cd backend
uv sync                          # instala desde pyproject.toml
uv run uvicorn main:app --reload --port 8000

# Para incluir herramientas de desarrollo (ruff, pytest, requests, bs4):
uv sync --extra dev
```

`requirements.txt` y `pyproject.toml` están mantenidos en sincronía manual — ambos resuelven al mismo conjunto de dependencias. Usa el que prefieras; si agregas una dep runtime, agrégala a **ambos**.

### Frontend *(otra terminal, desde la raíz):*

```bash
pnpm install
pnpm dev
```

### Producción

```bash
pnpm prod:docker
```

Usa `docker-compose.prod.yml` con Nginx como gateway en el puerto `80`. Las rutas `/api/*` se redirigen al backend y `/*` al frontend estático.

**Despliegue cloud**: la topología recomendada es **frontend → Vercel**, **backend → Render**
y **BD/Storage → Supabase** (Transaction pooler 6543 + bucket `scorm-packages`). Qué variables
setear en cada plataforma y la referencia completa de env vars están en
[docs/deployment.md](docs/deployment.md).

## Scripts disponibles (raíz)

| Comando | Acción |
|---------|--------|
| `pnpm dev` | Frontend en modo desarrollo |
| `pnpm build` | Build de producción del frontend |
| `pnpm preview` | Previsualiza el build (`http://localhost:4173`) |
| `pnpm lint` | Biome lint sobre el frontend (`noExcessiveLinesPerFile: 200`, error) |
| `pnpm format` | Biome format sobre el frontend |
| `pnpm dev:docker` | Levanta todo con Docker (dev) |
| `pnpm prod:docker` | Levanta todo con Docker (prod) |

## Comandos backend

```bash
# Lint + format (desde backend/)
ruff check .            # con pip: pip install ruff
ruff format .
ruff check --fix .

# Equivalente con uv (sin activar venv)
uv run ruff check .
uv run ruff format .

# Tests
pytest                  # con pip
uv run pytest           # con uv

# Tests manuales contra API en vivo:
python tests/test_agents_io.py
python tests/test_resource_quality.py
python tests/test_rag_uploads.py
```

Override env para los tests manuales: `BASE`, `EMAIL`, `PASS`, `PHASE`, `TYPE`, `CONCEPT`.

## Estructura del monorepo

```
GenOVA/
├── .claude/
│   ├── agents/              # 8 agentes: leader, explorer, spec_author, implementer, reviewer, skill-advisor, spec-sync, doc_author
│   ├── hooks/               # session-start, post-edit, on-stop, status-line (PowerShell)
│   └── settings.json        # hooks + permisos
├── .agents/skills/          # store canónico de skills (find-skills, find-docs)
├── .opencode/               # opencode.json + agents (junction → .claude/agents)
├── .github/                 # workflows + copilot-instructions.md + agents/sdd-leader.agent.md
├── scripts/setup-harness.ps1   # recrea symlinks/junctions post-clone
├── AGENTS.md                # reglas cross-tool (base de portabilidad multi-herramienta)
├── GEMINI.md                # override Antigravity / Gemini CLI
├── CHECKPOINTS.md           # criterios objetivos de calidad (C1-C8)
├── skills-catalog.json      # registro de skills (metadata + triggers + seguridad)
├── skills-lock.json         # lock de versiones/hash (gestionado por npx skills)
├── feature_list.json        # estado de todas las features (SDD)
├── sdd/                     # contenido SDD agrupado
│   ├── specs/               # HU / EN / RN / EP
│   ├── tasks/               # TA (tareas técnicas)
│   ├── bugs/                # BU (defectos)
│   └── progress/            # current.md (sesión activa) + history.md (bitácora)
├── frontend/                # React + Vite (Biome, 200-line cap)
├── backend/                 # FastAPI
│   ├── pyproject.toml       # uv + ruff + pytest config
│   ├── requirements.txt     # pip (sincronizado con pyproject)
│   ├── requirements-dev.txt # pip — extras de desarrollo
│   ├── .python-version      # 3.11 (uv lo lee)
│   ├── auth/                # Login, registro, JWT, reset-password + SMTP
│   ├── ova/                 # Save, listado, edición, regeneración, papelera, duplicar
│   ├── agents/              # 5E: ENGAGE + EXPLORE + LLM router + audio helpers + HF images + podcast
│   ├── labs/                # Sandbox de iteración de prompts (admin)
│   ├── rag/                 # Ingesta + retrieval pgvector (multimodal Gemini)
│   ├── roles/               # CRUD de roles y permisos (JSONB)
│   ├── users/               # Perfil propio + administración de usuarios
│   ├── scorm/               # Empaquetado SCORM 1.2 (template + service)
│   ├── storage/             # Wrapper de Supabase Storage (signed URLs)
│   ├── uploads/             # Subida temporal de archivos (alimenta RAG)
│   ├── migrations/          # SQL 001–017 aplicados al arrancar (próximo: 018)
│   ├── rate_limit.py        # SlowAPI shared limiter
│   ├── security.py          # bcrypt + JWT + dummy-hash timing defense
│   ├── main.py              # Entry point (CORS, logging, lifespan, registro de routers)
│   ├── seed.py              # Roles + usuarios de prueba
│   └── tools/prompt_lab.py  # Utilidad CLI para probar prompts (fuera de la API)
├── scorm-template/          # Plantilla base SCORM
├── deploy/                  # Nginx para producción
├── docs/                    # Referencia profunda (api, database, generacion-5e, deployment, testing, labs)
│   └── README.md            # Índice de docs (mantenido por doc_author)
├── CLAUDE.md                # Guía para Claude Code (contexto detallado del repo)
├── .editorconfig            # Estilo universal (LF, UTF-8, 2/4 spaces)
└── docker-compose.yml
```

## Convenciones de código

- **Máx 200 líneas por archivo** (frontend Biome hard error, backend convención). Única excepción: `backend/tools/prompt_lab.py` (CLI manual, fuera de la API).
- **Capa de servicios separada de hooks y páginas**: `services/*.js` hace `fetch`, `hooks/*.js` mantiene estado, `pages/*.jsx` solo orquesta layout.
- **Mobile-first**: alturas en `vh` con `min-h`/`max-h`, modales en bottom-sheet en mobile y centrados en `sm+`, tablas con `overflow-x-auto` y `min-w-[…]` por columna.

## Funcionalidades principales

- **Crear OVA**: prompt + (opcional) archivos de apoyo → elige hasta **4 recursos por fase** (ENGAGE + EXPLORE) → genera secuencialmente con reintentos automáticos individuales en el frontend y estados en vivo (`generando`, `reintentando`, `done`, `failed`) → validador de calidad HTML y auto-reparación estructural y de SCORM en el backend → guarda parciales (si algún recurso falla) y empaqueta todo en un único paquete SCORM con un recurso navegable por cada selección exitosa.
- **Mis OVAs**: listado con búsqueda/paginación, edición de fases, regeneración de fases con agentes LLM reales (a través de `resource_type_id` y título), versión activa y descarga SCORM, duplicar, mover a papelera.
- **Papelera**: soft-delete con restauración individual o masiva.
- **Perfil**: edición de datos personales (incluye `university_id`, `gender`, `phone_number`) y cambio de contraseña.
- **Administración (solo `administrador`)**:
  - `/admin/roles` — CRUD de roles y sus permisos (JSONB), con flujo de "eliminar y reasignar".
  - `/admin/users` — listado de usuarios y asignación de roles.
  - `/admin/labs` — sandbox de prompts: edita, ejecuta contra 1–2 modelos en paralelo, compara, marca ganadores, exporta como SCORM, pide al LLM una versión mejorada del prompt.

## Cómo funciona la generación (5E)

GenOVA aplica la metodología **5E**; hoy cubre **ENGAGE** y **EXPLORE**, cada una con **10
tipos de recurso** (cómic, podcast, gamificación, dilema ético, escape room, simulador…).
El backend genera con LLMs reales en un pipeline `texto → JSON → HTML`, valida y auto-repara
el HTML (incluye callbacks SCORM), recurre a una **cadena de fallback** entre proveedores
(Groq + OpenRouter) y empaqueta todo en un único SCORM 1.2. Opcionalmente ancla la generación
con **RAG** (archivos del usuario) e inserta imágenes (HF FLUX.1-schnell) y audio (TTS Groq).

→ Detalle completo en [docs/generacion-5e.md](docs/generacion-5e.md).

## Rutas del frontend

React Router 7 (`frontend/src/App.jsx`). Las rutas protegidas exigen sesión; las admin exigen
rol `administrador` (verificado contra `/api/auth/me`).

| Ruta | Página | Acceso |
|---|---|---|
| `/login`, `/register` | Login / Registro | Público |
| `/dashboard` | Dashboard | Protegido |
| `/crear-ova` | Crear OVA | Protegido |
| `/mis-ovas` | Mis OVAs (listado/búsqueda) | Protegido |
| `/mis-ovas/:ovaId/editar` | Editor de OVA | Protegido |
| `/papelera` | Papelera (soft-delete) | Protegido |
| `/profile` | Perfil | Protegido |
| `/metodologia/engage`, `/metodologia/explore` | Vistas 5E | Protegido |
| `/admin/roles` | CRUD de roles y permisos | Admin |
| `/admin/users` | Gestión de usuarios | Admin |
| `/admin/labs` | Sandbox de prompts | Admin |

## Endurecimiento de seguridad

- **JWT_SECRET** validado en arranque (hard-fail si débil o `<16` chars).
- **Hash dummy** en `login` para igualar tiempos entre "usuario inexistente" y "contraseña incorrecta" → no enumeración por timing.
- **Pydantic** `LoginRequest` / `RegisterRequest` con `EmailStr` y `Field(max_length=128)` sobre password (anti-DoS bcrypt, que trunca a 72 bytes igual).
- **Rate-limit** vía SlowAPI: `/login` 10/min, `/register` 5/min, `/reset-password` 10/min por IP.
- **JWT extendido** con `iat`, `jti`, `iss=genova` (preparado para revocación vía blocklist).
- **CORS** restringido a métodos `GET/POST/PATCH/PUT/DELETE/OPTIONS` y headers `Authorization, Content-Type, Accept, X-Requested-With`.
- **Lockout**: 5 intentos fallidos → 15 min bloqueo.
- **Fallback chain LLM**: errores recuperables (rate-limit, 402, 5xx) caen a un modelo Groq de respaldo en lugar de exponer el fallo al cliente.
- **Reset tokens no se devuelven al cliente.** Los endpoints de reset (correo + WhatsApp) generan un token largo (`secrets.token_urlsafe(32)`) y solo devuelven la URL de entrega (correo encolado o `wa.me` share link). El admin que dispara la operación nunca ve el token.
- **Sin secretos hardcodeados.** `auth/email.py` exige `SMTP_USER` / `SMTP_PASSWORD` vía env; si faltan, lanza `EmailNotConfigured` y registra el fallo (no envía).
- **Errores de BD nunca se filtran**. Todos los routers usan helpers `commit_or_500()` que loguean `logger.exception(...)` y responden con mensaje genérico.

## Endpoints de salud

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

> **API completa** (~70 endpoints) en [docs/api.md](docs/api.md). Con el backend corriendo,
> Swagger interactivo en `http://localhost:8000/docs` y ReDoc en `/redoc`.

## CI/CD

Push o PR a `develop` / `main` dispara el pipeline en paralelo:

```
lint ──────────────────┐
backend-bdd ───────────┼──→ e2e
frontend-unit (BDD) ───┘
```

Secrets requeridos en el repositorio CI:

| Secret | Descripción |
|---|---|
| `TEST_DATABASE_URL` | PostgreSQL de test (no usar la BD de producción) |
| `TEST_JWT_SECRET` | Secret JWT para los tests (mínimo 16 chars) |

## Seed de desarrollo

Al iniciar el backend por primera vez se ejecuta `seed.py` automáticamente, creando los roles del sistema (`administrador`, `usuario`) y cuentas de prueba:

- `admin@genova.ai` / `admin1234password`
- `user@genova.ai` / `user1234password`

> Las contraseñas son alfanuméricas y ≥ 8 caracteres a propósito para que pasen la validación del flujo de reset.
