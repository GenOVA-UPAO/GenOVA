# GenOVA

Plataforma web para la generación asistida por IA de Objetos Virtuales de Aprendizaje (OVA) con exportación SCORM 1.2. Implementa la metodología 5E completa (ENGAGE, EXPLORE, EXPLAIN, ELABORATE, EVALUATE) y empaqueta los resultados como paquetes SCORM listos para subir a un LMS.

## Contenido

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

> **Documentación histórica, specs y convenciones** viven en el bául Obsidian
> `GenOVA` (`Documents/Bóvedas/GenOVA`), fuera del repositorio. Este README es el
> único overview que se mantiene aquí.

## Verificación

Git hooks vía **Husky** (`pnpm install` los activa con el script `prepare`):

| Hook | Qué corre |
|---|---|
| `pre-commit` | `lint-staged` — ESLint `--fix` + Prettier sobre los archivos **staged** del frontend |
| `commit-msg` | `commitlint` — exige Conventional Commits (`tipo(scope): asunto`) |
| `pre-push` | `pnpm lint` + `pnpm typecheck` + `pnpm test:vitest` + `ruff` backend + **fronteras de arquitectura** (`lint-imports` + `check_module_size.py`); BDD del backend solo si responde en `:8000` |

Saltar un hook puntualmente: `git commit --no-verify` / `git push --no-verify`.

Ejecución manual de cualquiera de los pasos:

```bash
pnpm lint                              # ESLint frontend
pnpm typecheck                         # tsc -b --noEmit
pnpm test:vitest                       # Vitest (componentes)
pnpm test:unit                         # BDD unit (cucumber-js)
pnpm test:e2e                          # Playwright-BDD (el job CI usa LLM_FAKE=1)
cd backend && ruff check . && pytest   # lint + tests backend
sh .husky/pre-push                     # la verificación completa de una vez
```

Smoke tests manuales (playwright-cli, bloques A–F):
[`tests/playwright-smoke/SMOKE_TESTS.md`](tests/playwright-smoke/SMOKE_TESTS.md).

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 (React Compiler) + Vite 8 + React Router 8 + Tailwind CSS 4 + TanStack Query 5 + Radix UI + Sonner. Tests de componente con Vitest + `@testing-library/react` |
| Backend | FastAPI + SQLAlchemy 2 + Uvicorn + SlowAPI. SSE (`sse-starlette`) para progreso; cola durable **arq + Redis** (opcional) con worker separado; observabilidad **Logfire** (opt-in) + Sentry |
| Base de datos | Supabase (PostgreSQL + pgvector) vía `psycopg` |
| Storage | Supabase Storage (`scorm-packages`) — fallback automático a disco local |
| RAG | pgvector + Gemini `gemini-embedding-2` (multimodal: texto + PDF + imagen + audio + video) |
| LLMs | Groq SDK (GPT-OSS 120B/20B, Qwen3.8 27B, Whisper, Orpheus TTS) + OpenRouter (DeepSeek V4 Flash: free & paid fallback) con motor de validación y auto-reparación estructural de HTML |
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
# IDs disponibles: groq-gpt-oss-120b, groq-gpt-oss-20b, groq-qwen3.8-27b, openrouter-deepseek-v4-flash
OVA_ENABLED_LLMS=

# Producción — orígenes permitidos (CORS). Obligatorio si ENV=production.
CORS_ORIGINS=https://tu-dominio.com

# Auth — desactiva el fallback Authorization: Bearer una vez todos los clientes usan cookies
AUTH_ACCEPT_BEARER=1   # default 1 (acepta); pon 0 en producción cuando estés listo

# Pool de conexiones (Supabase Transaction pooler, puerto 6543)
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=10

# Generación — solo CI / pruebas. Nunca en producción.
# LLM_FAKE=1    # HTML determinista sin proveedores (jobs y POST /api/agents/*/generate)
# OVA_RESOURCE_BUDGET_S=240   # techo de reloj por recurso (generate + refine + repair)
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

> Modelo usado: **`gemini-embedding-2`** (GA; `RAG_GEMINI_MODEL` lo cambia).
> Natively multimodal — PDF/imagen/audio/video se embeben directos sin Whisper
> ni vision por separado. Matryoshka truncado a 768-d para encajar en
> `vector(768)`. Fallback estable: `RAG_EMBEDDER=gemini-001` (text-only GA),
> o `RAG_EMBEDDER=local` con `sentence-transformers` (384-d, requiere RAM extra).

Primer arranque: aplica migraciones automáticamente — incluye `CREATE EXTENSION vector`. Verifica con `GET /api/rag/health` → `{ pgvector_ready: true }`.

Para desactivar RAG por completo: `RAG_DISABLED=1`.

#### Reindexar embeddings del RAG

**Qué:** cada fragmento guarda en `rag_chunks.embedding_model` qué embedder lo
generó (migración 043; `NULL` = anterior a ella). Si cambia el modelo
(`gemini-embedding-2-preview` → `gemini-embedding-2`, v1 → v2, `RAG_EMBEDDER`,
`RAG_GEMINI_MODEL`), los vectores guardados quedan en otro espacio: la búsqueda
vectorial devuelve ruido **sin dar error** (la rama léxica lo disimula).

**Cuándo:** tras el primer despliegue con un embedder nuevo. El backend lo
detecta al arrancar: en la purga de fragmentos caducados cuenta los desfasados y
registra un warning `RAG: hay fragmentos embebidos con otro modelo…` con
`stale`, `total`, `by_model` y el comando. Solo cuenta: no re-embebe en el
arranque (costaría cuota y dinero y retrasaría el servicio). Con 0 desfasados no
dice nada.

**Cómo** (desde `backend/`, con las variables de producción: `DATABASE_URL`,
`GEMINI_API_KEY`, `RAG_EMBEDDER`/`RAG_GEMINI_MODEL` iguales que el servicio). En el
plan free de Render no hay *Shell*: se lanza en local apuntando a la BD de producción
(`DATABASE_URL` del pooler de Supabase):

```bash
python scripts/reindex_rag.py                    # ensayo: cuenta por modelo, no escribe ni llama a Gemini
python scripts/reindex_rag.py --apply --limit 50 # prueba corta
python scripts/reindex_rag.py --apply            # todo; idempotente y reanudable
```

Confirma cada lote: si se corta (cuota, red), se relanza y sigue por lo que
falte. **Verificar:** repetir el ensayo → `Desfasados: 0`, y
`GET /api/rag/health` → `embedding_model` igual al «Embedder activo» del ensayo.

**Cuánto cuesta:** re-embebe el texto guardado de cada fragmento (≤ 800
caracteres, ~200–250 tokens). Con `gemini-embedding-2` en el nivel de pago, el
texto cuesta 0,20 USD por millón de tokens: 1 000 fragmentos ≈ 0,25 M tokens ≈
0,05 USD; 10 000 ≈ 0,50 USD. En el nivel gratuito no se paga, pero consume la
cuota diaria (si se agota, el script se detiene y se relanza al día siguiente).
Un archivo embebido como binario (PDF, imagen, audio) se re-embebe por su texto
extraído o su descripción, no por el binario.

### SMTP (restablecimiento de contraseña)

`POST /api/auth/reset-password` consume un token enviado por correo. El sender vive en `backend/auth/infrastructure/email_adapters.py`. Override de credenciales:

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

Levanta frontend (`http://localhost:4200`) y backend (`http://localhost:8000`) en contenedores con hot-reload.

### Stack local completo con Postgres + pgvector (sin Supabase)

`docker-compose.dev.yml` es un override que añade un Postgres con pgvector y
reapunta el backend a él por la red interna de compose. Migraciones y seed corren
solos al arrancar el backend:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db backend
# stack completo (incluye frontend en :4200):
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

En el contenedor, `GENOVA_DEV_BACKEND=http://backend:8000` hace que el proxy de
Vite (`/api` y `/auth`) apunte al servicio `backend`. En el host, `pnpm dev`
proxia por defecto a `http://127.0.0.1:8000`. Para un backend en otro puerto
(p. ej. determinista `LLM_FAKE=1` en `:8100`):

```bash
GENOVA_DEV_BACKEND=http://127.0.0.1:8100 pnpm --filter frontend dev --port 4300
```

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
y **BD/Storage → Supabase** (Transaction pooler 6543 + bucket `scorm-packages`). La referencia
completa de variables de entorno está en `backend/.env.example` y `frontend/.env.example`.

**Un proceso o varios (`REDIS_URL`)**: `render.yaml` despliega un solo proceso web sin
Redis. Así, los límites por email del login y de «Probar un modelo» se comparten en
Postgres (`throttle_hits`) y el límite por IP de SlowAPI, en memoria, es exacto. Con
varios procesos (`WEB_CONCURRENCY>1`, `uvicorn --workers N`) o instancias, `REDIS_URL`
es **obligatorio**: sin él el límite por IP real es N veces mayor (el backend avisa al
arrancar con `ENV=production`: `rate limits per process`). Ojo: con `REDIS_URL` la
generación de OVA se encola en arq, así que hay que desplegar también el worker
(`backend/Dockerfile.worker`). En Render el Key Value tiene plan free, pero el worker no
(bloque comentado al final de `render.yaml`).

**Tras desplegar un cambio de embedder**: reindexar el RAG (ver «Reindexar embeddings del
RAG»); el backend lo avisa en los logs del arranque.

## Scripts disponibles (raíz)

| Comando | Acción |
|---------|--------|
| `pnpm dev` | Frontend en modo desarrollo (`http://localhost:4200`, proxy `/api` y `/auth`) |
| `pnpm build` | Build de producción del frontend (`frontend/dist/`) |
| `pnpm --filter frontend preview` | Previsualiza el build (`http://localhost:4200`) |
| `pnpm lint` | ESLint sobre el frontend (typescript-eslint **type-checked strict** + react + react-hooks + jsx-a11y + sonarjs + prettier; fronteras de features y anti-barrels en `error`; caps de tamaño y complejidad) |
| `pnpm typecheck` | Chequeo de tipos TypeScript (`tsc -b --noEmit`) |
| `pnpm format` | Prettier sobre el frontend |
| `pnpm test:vitest` | Tests de componente (Vitest + Testing Library) |
| `pnpm test:unit` | BDD unit (cucumber-js, sin browser/backend; corre TS vía `tsx`) |
| `pnpm test:e2e` | E2E (playwright-bdd). En CI el backend corre con `LLM_FAKE=1` |
| `pnpm test:a11y` | Auditoría axe-core (WCAG 2.0 A/AA); el job `e2e` de CI la corre al final |
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

# Arquitectura: fronteras de import entre dominios (~40 contratos en
# pyproject.toml → [tool.importlinter]) y tamaño de módulos (aviso, no bloquea)
uv run lint-imports
uv run python scripts/check_module_size.py

# Tests manuales contra API en vivo:
python tests/test_agents_io.py
python tests/test_resource_quality.py
python tests/test_rag_uploads.py
```

Override env para los tests manuales: `BASE`, `EMAIL`, `PASS`, `PHASE`, `TYPE`, `CONCEPT`.

## Estructura del monorepo

```
GenOVA/
├── .github/                 # CI: lint-frontend, typecheck-frontend, lint-backend, backend-bdd,
│                            # api-contract, frontend-unit, frontend-vitest, security-audit, e2e
├── .husky/                  # git hooks: pre-commit (lint-staged), commit-msg (commitlint), pre-push
├── commitlint.config.mjs    # Conventional Commits
├── lint-staged.config.mjs   # ESLint --fix + Prettier sobre archivos staged del frontend
├── frontend/                # React 19 + Vite 8 (ESLint type-checked, React Compiler, fronteras de features)
│   └── src/
│       ├── app/             # router, layouts, loaders
│       ├── core/            # auth, UI Radix, http (apiFetch/apiJson), tema
│       └── features/        # auth, ova-library, ova-workspace, admin, profile, analytics, llm-settings
├── backend/                 # FastAPI
│   ├── pyproject.toml       # uv + ruff + pytest + import-linter (~40 contratos)
│   ├── requirements.txt     # pip (sincronizado con pyproject)
│   ├── requirements-dev.txt # pip — extras de desarrollo
│   ├── .python-version      # 3.11 (uv lo lee)
│   ├── models.py            # Registro agregado del ORM (punto de corte sancionado)
│   ├── auth/                # Hexagonal: login, registro, JWT, reset-password + SMTP
│   ├── ova/                 # Hexagonal: CRUD, versiones, papelera, duplicar
│   ├── generation/          # Hexagonal: jobs (runner/arq) + regen 5E por fases
│   ├── llm/                 # Soporte KISS: catálogo, routers y fallbacks (Groq/OpenRouter)
│   ├── rag/                 # Hexagonal: ingesta + retrieval pgvector (multimodal Gemini)
│   ├── roles/               # Hexagonal (piloto): CRUD de roles y permisos (JSONB)
│   ├── users/               # Hexagonal: ajustes propios + administración + analítica
│   ├── scorm/               # dominio puro de empaquetado SCORM 1.2 + router de health
│   ├── storage/             # Adaptador outbound: Supabase Storage (signed URLs)
│   ├── prometheus/          # Soporte KISS: motor LangGraph de generación
│   ├── uploads/             # Hexagonal: subida temporal de archivos (alimenta RAG)
│   ├── migrations/          # SQL aplicados al arrancar (auto-migración en lifespan)
│   ├── main.py              # Entry point (CORS, logging, lifespan, registro de routers)
│   ├── worker.py            # Worker arq (cola durable opcional)
│   └── seed.py              # Roles + usuarios de prueba
├── scorm-template/          # Plantilla base SCORM 1.2
├── tests/                   # BDD unit (cucumber-js), e2e (playwright-bdd), a11y, carga
├── .editorconfig            # Estilo universal (LF, UTF-8, 2/4 spaces)
└── docker-compose.yml
```

## Convenciones de código

### Tamaño (cohesión, no un cap de líneas)

Lo que importa es **una sola responsabilidad por unidad**, no un límite de líneas por archivo.

| Nivel | Regla | Umbral | Severidad |
|---|---|---|---|
| Función / método | Frontend: ESLint `max-lines-per-function` + `complexity` · Backend: ruff `PLR0915` + `C901` | Frontend: 80 líneas / complejidad 10 · Backend: ~30 statements / complejidad 10 | error (frontend); backend `error` en dominios migrados, `warn` en el resto |
| Nº de argumentos | ESLint `max-params` · ruff `PLR0913` | 4 (frontend, error) · 4–6 (backend, warn) | ver regla |
| Componente / clase | `react/no-multi-comp` · ESLint `max-classes-per-file` | 1 por archivo | error (frontend) |
| Archivo / módulo | ESLint `max-lines` (frontend) · `backend/scripts/check_module_size.py` | 250 (frontend, error) · 400 (backend, aviso) | frontend rompe lint; backend no bloquea build |

Excepciones declaradas en `backend/pyproject.toml → per-file-ignores`: `tests/**`, `tools/**`,
`scripts/**`, y los subdominios de soporte con tratamiento ligero (`prometheus/**`, `llm/**`,
`users/**`, `generation/**` en las reglas de complejidad) y ficheros de datos (`*_data.py`,
catálogos). Estas excepciones son deuda marcada: se eliminan línea a línea cuando el código
las merece, no de golpe.

### Arquitectura

#### Backend — hexagonal por dominio

Ejemplo canónico: `backend/roles/` (el piloto). Cada dominio con hexagonal estricto tiene
exactamente este esqueleto:

```
backend/<dominio>/
├── domain/              # Entidades, value objects, errores y políticas PURAS.
│                        # Sin fastapi, sin sqlalchemy, sin pydantic. Si esto importa
│                        # un framework, la frontera está rota.
├── application/         # ports.py (Protocol — contratos estructurales), dto.py
│                        # (@dataclass de entrada/salida), use_cases/<verbo>_<sustantivo>.py
│                        # (una clase por fichero con .execute()). Sin I/O.
├── infrastructure/      # Adaptadores SQLAlchemy que implementan los puertos, mappers,
│                        # clientes externos. No importa application: los Protocol son
│                        # estructurales. El ORM llega por `from models import X`.
├── interface/http/      # Routers FINOS: validan el request, invocan el caso de uso
│                        # y traducen. error_map.py traduce errores de dominio → HTTP.
│                        # El sobre JSON de cada endpoint se copia tal cual está hoy.
└── container.py         # Composition root: build_<dominio>(db=Depends(get_db)) →
                         # dataclass con los casos de uso. FastAPI ES el contenedor.
```

Los routers consumen `Depends(build_<dominio>())`; los errores de dominio suben y
`error_map.py` los baja a HTTP con el mismo cuerpo que antes del refactor (byte a byte).

**Quién adopta qué, y por qué:**

| Dominio | Estado | Motivo |
|---|---|---|
| `roles`, `auth`, `users`, `ova`, `generation`, `rag`, `uploads` | Hexagonal completo | Agregados de negocio con lógica y estado propios |
| `scorm` | dominio puro + router de health, **sin** capa de aplicación | Ensamblar el zip no tiene caso de uso HTTP que lo justifique |
| `storage` | adaptador outbound puro (`port.py` + `supabase.py`) | Solo habla con Supabase Storage; prohibido que toque HTTP/ORM |
| `prometheus` (motor LangGraph) y `llm` (catálogo/proveedores) | **KISS por diseño**, no por deuda | Subdominios de soporte: no tienen entidad agregada ni ciclo de vida propio. Adoptar entity/VO/DTO/use-case era ceremonia sin retorno. Se les exige solo perímetro: cero `fastapi` dentro y fronteras con import-linter |

#### Puntos de corte sancionados (los "por qué" que se pierden sin documentar)

- **`models.py` NO está en `root_packages` de import-linter a propósito.** Es el registro
  agregado del ORM (re-exporta cada clase para poblar `Base.metadata`). Al no ser paquete
  raíz, import-linter no atraviesa `from models import X`: ese patrón NO acopla dominios a
  ojos de los contratos y es la vía legítima para *entidades de persistencia*.
  ⚠️ Meterlo en `root_packages` reacoplaría los 11 dominios de golpe. No hacerlo.
- **`ova/__init__.py` re-exporta con `__getattr__` (PEP 562), no con imports ansiosos.**
  `models.py` importa `ova.infrastructure.orm` (línea 30), lo que ejecuta `ova/__init__.py`
  a mitad de la carga de `models`; si el `__init__` importara `ova.application.*` de forma
  ansiosa, `edit_helpers` haría `from models import Ova` sobre un módulo a medio cargar →
  ImportError circular. Los re-export perezosos (`ensure_version_exists`, `get_active_version`,
  `is_ova_owner`, `ova_output_dir`, `persist_scorm_zip`) son la superficie pública que
  consumen otros dominios — nunca `ova.interface` (crearía un ciclo con `generation`).
- **`auth.dependencies`** (`get_current_user` / `require_admin` / `require_permission`) es
  la superficie transversal de guards, consumida por ~40 módulos: equiparable a
  `core.database.get_db`. Cualquier `*.interface` puede importarla; es un edge sancionado,
  no un acoplamiento a perseguir.
- **`auth.infrastructure.cookies`** (limpiar cookie de auth) y **`llm.clients.key_resolver.mask_key`**
  son los otros edges entre dominios explícitamente permitidos y listados en los contratos.

#### Cómo se enforza todo

| Herramienta | Qué vigila | Dónde corre |
|---|---|---|
| `lint-imports` (import-linter) | ~40 contratos en `backend/pyproject.toml → [tool.importlinter]`: pureza de cada `domain/`, capas `interface → container → application → domain`, independencia entre dominios, perímetro de `prometheus`/`llm` | `pre-push`, CI (job `lint-backend`), ejecutable a mano desde `backend/` |
| `eslint-plugin-boundaries` | frontend: `feature → core` / su propia feature (nunca otra feature), `core → core`, `app` → cualquiera — en `error` | `pnpm lint`, `pre-commit` (vía lint-staged), CI |
| `eslint-plugin-no-barrel-files` | nada de `index.ts` que solo re-exporta; importar del módulo fuente | ídem |
| `scripts/check_module_size.py` | ningún `.py` supera 400 líneas de código (aviso, no bloquea) | ídem |

Los cuatro corren en `.husky/pre-push` y en `.github/workflows/ci.yml`
(`lint-backend` incluye import-linter y tamaño de módulos; `lint-frontend` corre
`pnpm lint`; `typecheck-frontend` y `frontend-vitest` son jobs paralelos).

#### Frontend — features con fronteras enforced

`eslint-plugin-boundaries` (en `error`): `feature → core` / su propia feature (nunca otra
feature); `core → core` (nunca `feature`); `app → cualquiera`. Sin barrel files
(`eslint-plugin-no-barrel-files`, hard error). La capa de acceso a datos (`api/*.api.ts` con
`apiJson` y `hooks/use-*.ts` con TanStack Query) está separada de la presentación; los
componentes solo orquestan interfaz y layout (`react/no-multi-comp`, un componente por archivo).
Radix e iconos de Phosphor se consumen únicamente a través de `@/core/components/ui/*` y
`<Icon name="..." />`.

Mobile-first: alturas en `vh` con `min-h`/`max-h`, modales en bottom-sheet en mobile y
centrados en `sm+`, tablas con `overflow-x-auto` y `min-w-[…]` por columna.

#### Backend — núcleo de ejecución (lateral, comportamiento de infraestructura)

`generation/jobs/` y `generation/regen/` viven fuera de los cuatro directorios formales a
propósito: son el core de ejecución en hilos/worker (runner, sweep, materialización, regen)
con anclas de tests que hacen monkeypatch de sus atributos (`jobs_runner.SessionLocal`,
`jobs_materialize._persist_scorm`, …). Moverlos rompería tests y consumers sin ganar nada:
los edges hacia `prometheus`/`llm`/`scorm`/`rag`/`storage` que quedan ahí son de
infraestructura y están cubiertos por contratos. Los edge HTTP (`regen_router.router`,
`jobs_service.sweep_stale_jobs_for_ovas`) se resuelven desde esas rutas exactas porque `ova`
los importa.

## Funcionalidades principales

- **Crear OVA**: prompt + nivel educativo + (opcional) archivos de apoyo → elige al menos **2 fases 5E** y hasta **4 recursos por fase** → genera en un work-pool con progreso en vivo por recurso → validación HTML/JS y auto-reparación en el backend → guarda parciales (si algún recurso falla) y empaqueta todo en un único paquete SCORM con un recurso navegable por cada selección exitosa.
- **Mis OVAs**: listado con búsqueda/paginación, edición de fases, regeneración de fases con agentes LLM reales (a través de `resource_type_id` y título), versión activa y descarga SCORM, duplicar, mover a papelera.
- **Papelera**: soft-delete con restauración individual o masiva.
- **Perfil**: edición de datos personales (incluye `university_id`, `gender`, `phone_number`) y cambio de contraseña.
- **Analítica**: `/analytics` — métricas de aprendizaje (API exige permiso `view_analytics`).
- **Modelos de IA**: `/models` — catálogo, claves de proveedor y cadena de fallback.
- **Administración (solo `administrador`)**:
  - `/admin/roles` — CRUD de roles y sus permisos (JSONB), con flujo de "eliminar y reasignar".
  - `/admin` — listado de usuarios y asignación de roles.

## Cómo funciona la generación (5E)

GenOVA aplica la metodología **5E** completa (**ENGAGE, EXPLORE, EXPLAIN, ELABORATE,
EVALUATE**), cada fase con **10 tipos de recurso** (cómic, podcast, gamificación, dilema
ético, escape room, simulador…).
El backend genera los recursos en un work-pool (entrada única `generate_resource`) con
un pipeline `texto → JSON → HTML`, valida y auto-repara el HTML (incluye callbacks SCORM)
y comprueba la **sintaxis del JavaScript** inline con QuickJS. Si el modelo corta la
salida por el tope de tokens (`finish_reason=length`), el router **continúa** hasta dos
veces. Un **presupuesto de reloj por recurso** (default 240 s, `OVA_RESOURCE_BUDGET_S`)
corta refine/repair cuando se agota y se queda con el mejor HTML. Con tema UPAO, el
servidor inyecta la hoja base y la librería de **componentes UPAO** (`<upao-header>`,
`<upao-card>`, `<upao-question>`, …) para que el modelo no reescriba el runtime.
Recurre a una **cadena de fallback** entre proveedores (Groq + OpenRouter) y empaqueta
todo en un único SCORM 1.2. Opcionalmente ancla la generación con **RAG** (archivos del
usuario) e inserta imágenes (HF FLUX.1-schnell) y audio (TTS Groq).

Para CI, e2e y pruebas sin gastar cuota: `LLM_FAKE=1` sustituye el grafo y
`POST /api/agents/*/generate` por HTML determinista (nunca en producción). Detalle
de cómo correr la suite local contra un backend fake en `:8100`: [`tests/README.md`](tests/README.md).

## Rutas del frontend

React Router 8 (`frontend/src/app/router.tsx`). Los loaders `requireAuth`,
`requireGuest` y `requireAdmin` viven en `frontend/src/core/auth/guards.ts`.
Hay redirecciones de URLs antiguas (`/crear-ova` → `/crear`, `/modelos` → `/models`,
`/ova/:id/workspace` → `/workspace/:id`, etc.).

| Ruta | Página | Acceso |
|---|---|---|
| `/login`, `/register` | Login / Registro | Guest (`requireGuest`; si hay sesión → `/dashboard`) |
| `/forgot-password`, `/reset-password` | Recuperación de contraseña | Guest |
| `/verify-email` | Verificación de correo | Público (sin redirect de guest) |
| `/dashboard` | Dashboard | Protegido (`requireAuth`) |
| `/crear` | Crear OVA (workspace en modo creación) | Protegido |
| `/mis-ovas` | Mis OVAs (listado/búsqueda) | Protegido |
| `/workspace/:id` | Workspace del OVA (edición) | Protegido |
| `/papelera` | Papelera (soft-delete) | Protegido |
| `/profile` | Perfil | Protegido |
| `/analytics` | Analítica | Protegido (API: permiso `view_analytics`) |
| `/models` | Catálogo y asignación de modelos LLM | Protegido |
| `/explore`, `/engage/:id` | Playground de fases 5E | Protegido |
| `/admin` | Gestión de usuarios | Admin (`requireAdmin`) |
| `/admin/roles` | CRUD de roles y permisos | Admin |

## Endurecimiento de seguridad

- **JWT_SECRET** validado en arranque (hard-fail si débil o `<16` chars).
- **Hash dummy** en `login` para igualar tiempos entre "usuario inexistente" y "contraseña incorrecta" → no enumeración por timing.
- **Pydantic** `LoginRequest` / `RegisterRequest` con `EmailStr` y `Field(max_length=128)` sobre password (anti-DoS bcrypt, que trunca a 72 bytes igual).
- **Rate-limit** vía SlowAPI: `/login` 10/min, `/register` 5/min, `/reset-password` 10/min por IP.
- **JWT extendido** con `iat`, `jti`, `iss=genova` (preparado para revocación vía blocklist).
- **CORS** restringido a métodos `GET/POST/PATCH/PUT/DELETE/OPTIONS` y headers `Authorization, Content-Type, Accept, X-Requested-With`.
- **Lockout**: 5 intentos fallidos → 15 min bloqueo.
- **Fallback chain LLM**: errores recuperables (rate-limit, 402, 5xx) caen a un modelo Groq de respaldo en lugar de exponer el fallo al cliente.
- **Reset tokens no se devuelven al cliente.** El endpoint de reset por correo genera un token largo (`secrets.token_urlsafe(32)`) y solo confirma que el correo fue encolado. El admin que dispara la operación nunca ve el token.
- **Sin secretos hardcodeados.** `auth/infrastructure/email_adapters.py` exige `SMTP_USER` / `SMTP_PASSWORD` vía env; si faltan, lanza `EmailNotConfigured` y registra el fallo (no envía).
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

> **API completa** (~70 endpoints): con el backend corriendo, Swagger interactivo en
> `http://localhost:8000/docs` y ReDoc en `/redoc`.

## CI/CD

Push o PR a `develop` / `main` dispara el pipeline en `.github/workflows/ci.yml`.
Los jobs de lint, typecheck, tests y auditoría corren en paralelo; `e2e` espera
a lint/typecheck/BDD/unitarios (no a `api-contract` ni `security-audit`):

```
lint-frontend (pnpm lint) ──────────────┐
typecheck-frontend (pnpm typecheck) ────┤
lint-backend (ruff + import-linter      │
  + tamaño de módulos) ─────────────────┼──→ e2e (playwright-bdd, LLM_FAKE=1;
backend-bdd (pytest-bdd, coverage) ─────┤     al final, a11y informativo)
frontend-unit (cucumber-js BDD) ────────┤
frontend-vitest (pnpm test:vitest) ─────┘

api-contract (Schemathesis, continue-on-error)
security-audit (pnpm audit --prod + pip-audit)
```

El job `e2e` (y `api-contract`) levantan un Postgres efímero con pgvector; no
hace falta `TEST_DATABASE_URL` en ese workflow. Esos secretos sí los usa
`.github/workflows/load-test.yml`.

| Secret | Dónde | Descripción |
|---|---|---|
| `TEST_DATABASE_URL` | `load-test.yml` | PostgreSQL de test (no usar la BD de producción) |
| `TEST_JWT_SECRET` | `load-test.yml` | Secret JWT para los tests (mínimo 16 chars) |

## Seed de desarrollo

Al iniciar el backend por primera vez se ejecuta `seed.py` automáticamente, creando los roles del sistema (`administrador`, `usuario`) y cuentas de prueba:

- `admin@genova.ai` / `admin1234password`
- `user@genova.ai` / `user1234password`

> Las contraseñas son alfanuméricas y ≥ 8 caracteres a propósito para que pasen la validación del flujo de reset.
