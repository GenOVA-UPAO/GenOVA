# Arquitectura de GenOVA

GenOVA es una plataforma web para la generación asistida por IA de Objetos Virtuales de Aprendizaje (OVA) con exportación SCORM 1.2. Implementada como un monorepo pnpm con frontend React y backend FastAPI.

---

## Tabla de Contenidos

1. [Vista General](#1-vista-general)
2. [Estructura del Monorepo](#2-estructura-del-monorepo)
3. [Frontend](#3-frontend)
4. [Backend](#4-backend)
5. [Base de Datos](#5-base-de-datos)
6. [Agentes de IA](#6-agentes-de-ia)
7. [Exportación SCORM](#7-exportación-scorm)
8. [Flujos Principales](#8-flujos-principales)
9. [Despliegue](#9-despliegue)

---

## 1. Vista General

```
┌──────────────────────────────────────────────────────────┐
│                       Cliente (Browser)                   │
│              React 19 + Vite + Tailwind CSS 4            │
└─────────────────────────┬────────────────────────────────┘
                          │ HTTP / REST
                          │
┌─────────────────────────▼────────────────────────────────┐
│                   FastAPI (Python)                        │
│    Auth · OVA · Agents · Roles · Users · Uploads · RAG   │
└──────┬──────────────────┬──────────────────┬─────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
 PostgreSQL          SCORM Output        LLM APIs
 (Supabase)     backend/scorm_output/  Groq · OpenRouter
```

**Stack:**

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, React Router 7, Tailwind CSS 4, Vite 8 |
| Backend | FastAPI 0.122, Uvicorn, SQLAlchemy 2.0 |
| Base de datos | PostgreSQL vía Supabase (psycopg3) |
| Auth | PyJWT (HS256) + bcrypt |
| LLMs | Groq SDK, OpenAI SDK → OpenRouter |
| Infraestructura | Docker Compose + Nginx |

---

## 2. Estructura del Monorepo

```
GenOVA/
├── frontend/                  # App React
│   ├── src/
│   │   ├── App.jsx            # Rutas + AdminRoute guard
│   │   ├── pages/             # 14 páginas
│   │   ├── components/        # Componentes reutilizables
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # Clientes HTTP
│   │   ├── layout/            # Navbar, Sidebar, MainContainer
│   │   └── lib/               # auth.js, supabaseClient.js, utils
│   ├── vite.config.js
│   └── package.json
│
├── backend/                   # API FastAPI
│   ├── main.py                # Punto de entrada, registro de routers
│   ├── models.py              # Modelos SQLAlchemy
│   ├── database.py            # Engine + SessionLocal
│   ├── security.py            # bcrypt + JWT
│   ├── seed.py                # Datos iniciales (roles + usuarios)
│   ├── auth/                  # Rutas + dependencias de autenticación
│   ├── ova/                   # CRUD OVA, generación, versiones
│   ├── agents/                # Generación de recursos 5E por LLM
│   ├── scorm/                 # Empaquetado SCORM 1.2
│   ├── roles/                 # CRUD roles y permisos
│   ├── users/                 # Perfil + admin de usuarios
│   ├── uploads/               # Archivos temporales
│   ├── rag/                   # Módulo RAG (stub)
│   └── migrations/            # SQL aplicados en orden al arrancar
│
├── deploy/nginx/default.conf  # Proxy inverso: /api/* → backend
├── docker-compose.yml         # Dev (hot-reload)
├── docker-compose.prod.yml    # Prod (Nginx en puerto 80)
└── pnpm-workspace.yaml
```

---

## 3. Frontend

### 3.1 Rutas y Protección (`App.jsx`)

```
/login                 → LoginPage          (pública)
/register              → RegisterPage       (pública)
/dashboard             → DashboardPage      (autenticada)
/crear-ova             → CrearOvaPage       (autenticada)
/mis-ovas              → MisOvasPage        (autenticada)
/ovas/:ovaId/edit      → EditarOvaPage      (autenticada)
/papelera              → PapeleraPage       (autenticada)
/profile               → ProfilePage        (autenticada)
/metodologia           → MetodologiaPage    (autenticada)
/metodologia/engage    → EngagePage         (autenticada)
/metodologia/explore   → ExplorePage        (autenticada)
/admin/roles           → AdminRolesPage     (AdminRoute)
/admin/users           → AdminUsersPage     (AdminRoute)
*                      → NotFoundPage
```

`AdminRoute` llama a `GET /api/auth/me` y verifica `role === "administrador"`. La expiración del token se comprueba cada 60 s.

### 3.2 Layout

```
AppLayout
├── Navbar          (marca, menú horizontal, logout)
├── Sidebar         (colapsable, links de navegación)
└── MainContainer   (<Outlet /> de React Router)
```

### 3.3 Páginas Principales

| Página | Responsabilidad |
|--------|----------------|
| `CrearOvaPage` | Wizard: prompt → selección de recursos ENGAGE/EXPLORE → generación → descarga |
| `MisOvasPage` | Listado, búsqueda, descarga SCORM, duplicar, mover a papelera, editar metadatos |
| `EditarOvaPage` | Edición inline de fases, historial de versiones, regeneración parcial |
| `EngagePage` | Generación de 10 tipos de recursos para la fase ENGAGE |
| `ExplorePage` | Generación de 10 tipos de recursos para la fase EXPLORE |
| `AdminRolesPage` | CRUD de roles y sus permisos (JSONB) |
| `AdminUsersPage` | Listado paginado de usuarios, asignación de roles |

### 3.4 Hooks Clave

| Hook | Responsabilidad |
|------|----------------|
| `useOvaCreation` | Flujo wizard completo de creación de OVA |
| `useOvaGeneration` | Dispara job de generación y gestiona LLM seleccionado |
| `useOvaProgressPolling` | Polling a `/api/ova/generate/{job_id}/progress` cada 1 s |
| `useOvaList` | Listado, búsqueda, paginación, acciones en lote |
| `usePhaseGeneration` | Generación de recurso para una fase individual |
| `useEngageGeneration` | Wrapper de `usePhaseGeneration` para ENGAGE |
| `useRegenEditor` | Regeneración de fases desde el editor |
| `useRoles` / `useUsersAdmin` | Datos para páginas de administración |

### 3.5 Servicios HTTP (`services/`)

Todos los servicios leen el JWT con `getToken()` de `lib/auth.js` y lo envían en `Authorization: Bearer <token>`.

```
ovaCreationService.js   → /api/ova/*
engageService.js        → /api/agents/engage/*
exploreService.js       → /api/agents/explore/*
ovaGenerationService.js → /api/ova/generate
ovaHistoryService.js    → /api/ovas/:id/versions
ovaEditService.js       → /api/ovas/:id/phases
scormExportService.js   → /api/ova/:id/scorm
uploadService.js        → /api/uploads/temp
```

### 3.6 Utilidades (`lib/`)

- **`auth.js`** — `getToken()`, `saveToken()`, `clearToken()`, `decodeToken()`, `isTokenExpired()`
- **`supabaseClient.js`** — cliente Supabase (storage de archivos)
- **`permissions.js`** — constante `AVAILABLE_PERMISSIONS` (strings de permisos disponibles)
- **`roleUtils.js`** — `getRoleColorClasses(roleName)` → clases Tailwind por rol

---

## 4. Backend

### 4.1 Punto de Entrada (`main.py`)

Al arrancar:
1. Aplica migraciones SQL (`run_migrations.py`)
2. Ejecuta `Base.metadata.create_all(engine)`
3. Ejecuta `seed_db()` (roles y usuarios por defecto)
4. Registra todos los routers bajo sus prefijos

Configuración CORS: permite orígenes de `frontend/.env` + `CORS_ORIGINS` del backend.

### 4.2 Routers y Prefijos

| Módulo | Prefijo | Descripción |
|--------|---------|-------------|
| `auth/router.py` | `/api/auth` | Login, registro, me, cambio de contraseña |
| `ova/router.py` | `/api/ova` | Guardar, listar, obtener OVA |
| `ova/generation_router.py` | `/api/ova` | Iniciar job, polling de progreso |
| `ova/edit_router.py` | `/api/ovas` | Editar fases, regenerar |
| `ova/history_router.py` | `/api/ovas` | Historial de versiones |
| `ova/duplicate_router.py` | `/api/ovas` | Duplicar OVA |
| `ova/trash_router.py` | `/api/ovas` | Papelera (soft-delete / restore) |
| `agents/engage_router.py` | `/api/agents/engage` | Recursos fase ENGAGE |
| `agents/explore_router.py` | `/api/agents/explore` | Recursos fase EXPLORE |
| `scorm/router.py` | `/api/ova` | Descarga ZIP SCORM |
| `roles/router.py` | `/api/roles` | CRUD roles |
| `users/admin_router.py` | `/api/users` | Admin de usuarios |
| `users/profile_router.py` | `/api/users/profile` | Perfil del usuario actual |
| `uploads/router.py` | `/api/uploads` | Subida de archivos temporales |
| `rag/router.py` | `/api/rag` | RAG (stub) |

### 4.3 Autenticación (`auth/`)

**`dependencies.py`** — Dependencias FastAPI reutilizables:

```python
get_current_user   # Bearer JWT → User (401 si inválido/expirado)
require_admin      # get_current_user + verifica rol "administrador" (403 si no)
```

**`router.py`** — Endpoints:

```
POST /api/auth/login           # Credenciales → JWT (24 h)
POST /api/auth/register        # Email + password → User + rol "usuario"
GET  /api/auth/me              # Token → User con roles
POST /api/auth/change-password # Old + new password
POST /api/auth/refresh         # Reemite token si está próximo a expirar
```

Protección contra fuerza bruta: `failed_login_attempts` + `locked_until` en el modelo `User`.

### 4.4 Ciclo de Vida de OVA

```
                    ┌──────────────┐
                    │  CrearOVA    │
                    │  (frontend)  │
                    └──────┬───────┘
                           │ POST /api/ova/generate
                           ▼
                    ┌──────────────┐
                    │  generation  │    _generation_jobs
                    │  _router.py  │ ──────────────────── dict en memoria
                    └──────┬───────┘    {job_id: {status, progress, ...}}
                           │ hilo background
                           ▼
                    ┌──────────────┐
                    │  Agentes IA  │  Genera contenido de fases (5E)
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ scorm/service│  build_scorm_zip_bytes()
                    └──────┬───────┘
                           │
                           ▼
              backend/scorm_output/{ova_id}_v{N}.zip
                    + OVA + OvaVersion + OvaPhase → DB
```

Polling: `GET /api/ova/generate/{job_id}/progress` hasta `status == "success"`.

**Invariante de versiones**: índice único parcial `(ova_id, is_active=TRUE)` — siempre una sola versión activa por OVA. Cada edición crea una `OvaVersion` nueva y desactiva la anterior.

---

## 5. Base de Datos

### 5.1 Modelo Entidad-Relación

```
User ──< UserRole >── Role
  │
  └──< Ova ──< OvaVersion ──< OvaPhase
                   │
                   └── current_version_id (FK en Ova)

User ──< Session
User ──< PasswordResetToken
```

### 5.2 Modelos Principales

**User**

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID PK | server_default gen_random_uuid() |
| `email` | str unique | indexado |
| `password_hash` | str | bcrypt |
| `full_name` | str? | |
| `is_active` | bool | default True |
| `failed_login_attempts` | int | default 0 |
| `locked_until` | datetime? | bloqueo temporal |

**Ova**

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK | → User |
| `title` | str(80) | extraído del prompt |
| `description` | str | prompt completo |
| `status` | str | borrador / generando / listo / error |
| `file_path` | str? | ruta al .zip activo |
| `current_version_id` | UUID FK? | → OvaVersion activa |
| `deleted_at` | datetime? | soft-delete |

**OvaVersion**

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID PK | |
| `ova_id` | UUID FK | → Ova (cascade delete) |
| `version_number` | int | incremental |
| `prompt` | str | |
| `is_active` | bool | índice único parcial con ova_id |

**OvaPhase**

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID PK | |
| `version_id` | UUID FK | → OvaVersion (cascade delete) |
| `phase_type` | str | engage / explore / explain / elaborate / evaluate |
| `phase_order` | int | 1..5 |
| `content` | str | HTML/JSON generado |
| `regenerated` | bool | default False |

**Role**

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID PK | |
| `name` | str unique | "administrador", "usuario" |
| `permissions` | JSONB | array de strings |

### 5.3 Variables de Entorno (Backend)

```env
DATABASE_URL=postgresql+psycopg://...supabase.com.../postgres?sslmode=require
JWT_SECRET=<cadena segura>
JWT_ALGORITHM=HS256
JWT_EXPIRES_MINUTES=1440
OVA_ENABLED_LLMS=openai,gemini,claude
MIN_PROMPT_CHARS=10
OVA_GENERATION_DURATION_SECONDS=14
OVA_GENERATION_JOB_TTL_SECONDS=300
GROQ_API_KEY=
OPENROUTER_API_KEY=
```

### 5.4 Variables de Entorno (Frontend)

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_MIN_PROMPT_CHARS=10
```

---

## 6. Agentes de IA

### 6.1 Enrutamiento LLM (`agents/llm_router.py`)

| Tarea | Proveedor | Modelo |
|-------|-----------|--------|
| `texto` | Groq | llama-3.3-70b-versatile |
| `codigo` | OpenRouter | qwen/qwen3-coder:free |
| `orquestador` | Groq | openai/gpt-oss-120b (reasoning_effort=medium) |
| `razonamiento` | Groq | qwen/qwen3-32b (reasoning_effort=default) |
| `vision` | Groq | llama-4-scout-17b |
| `audio STT` | Groq | Whisper (límite 19.5 MB) |
| `audio TTS` | Orpheus | WAV output |

Fallback automático a OpenRouter si Groq responde con HTTP 429.

### 6.2 Patrón de Generación de Recursos (2 pasos)

```
1. generar_texto(prompt_texto(...))   →  JSON estructurado del recurso
2. generar_texto(prompt_html(...))    →  HTML renderizable (via agente "codigo")
```

Ambos routers (engage y explore) devuelven `{resource_json, html_preview}`.

### 6.3 Tipos de Recursos por Fase

**ENGAGE** (`/api/agents/engage/generate`)  
**EXPLORE** (`/api/agents/explore/generate`)

Ambas fases soportan 10 tipos de recursos:

| # | Tipo | Descripción |
|---|------|-------------|
| 1 | `podcast` | Guión HTML con reproductor de audio |
| 2 | `simulador` | Simulación interactiva HTML/JS |
| 3 | `texto` | Artículo explicativo con formato |
| 4 | `quiz` | Cuestionario con feedback inmediato |
| 5 | `interactive` | Actividad interactiva HTML |
| 6 | `codigo` | Bloque de código con explicación |
| 7 | `video` | (no disponible aún) |
| 8 | `audio` | TTS generado (WAV) |
| 9 | `image` | Análisis de imagen vía visión |
| 10 | `herramienta` | Herramienta educativa específica |

### 6.4 Subida de Archivos para Generación

```
Tipos permitidos:   PDF, DOCX, PPTX (documentos)
                    MP3, WAV, M4A, OGG, WebM (audio → Whisper)
                    JPEG, PNG, GIF, WebP (imagen → visión)

Límites:            50 MB por archivo
                    5 archivos por petición

Almacenamiento:     backend/uploads/{user_id}/  (temporal)
Ciclo de vida:      Cargados antes de generar → leídos durante generación → eliminados
```

---

## 7. Exportación SCORM

`backend/scorm/service.py` — `build_scorm_zip_bytes(course_title, module_title, phases) -> bytes`

Estructura del ZIP generado:

```
{ova_id}_v{N}.zip
├── imsmanifest.xml          # Manifiesto SCORM 1.2
├── index.html               # Punto de entrada
└── resources/
    ├── content.html         # Contenido de las fases 5E
    ├── styles.css           # Estilos embebidos
    ├── scorm.js             # Runtime SCORM (tracking de compleción)
    └── app.js               # Navegación entre fases
```

El runtime SCORM 1.2 en `scorm.js` reporta `cmi.core.lesson_status = "completed"` al LMS cuando el estudiante finaliza todas las fases.

---

## 8. Flujos Principales

### 8.1 Registro e Inicio de Sesión

```
1. POST /api/auth/register  →  crea User + asigna rol "usuario"
2. POST /api/auth/login     →  valida credenciales → JWT (24 h)
3. Frontend guarda JWT en localStorage
4. Cada request envía: Authorization: Bearer <token>
```

### 8.2 Creación de OVA

```
1. Usuario escribe prompt (mín. 10 caracteres)
2. Selecciona tipo de recurso ENGAGE + tipo EXPLORE
3. (Opcional) sube archivos de apoyo (PDF, audio, imagen)
4. POST /api/ova/generate  →  { job_id }
5. Polling GET /api/ova/generate/{job_id}/progress cada 1 s
   5% → 20% → 45% → 70% → 90% → 100%
6. Backend (hilo):
   a. Llama a agentes IA → genera fases
   b. build_scorm_zip_bytes() → escribe .zip
   c. Persiste OVA + OvaVersion + OvaPhases en DB
7. GET /api/ova/{ova_id}/scorm  →  descarga ZIP
```

### 8.3 Edición de OVA

```
1. GET /api/ovas/{ova_id}          →  OVA + versión activa + fases
2. Usuario edita contenido inline
3. PATCH /api/ovas/{ova_id}/phases/{phase_id}  →  guarda fase individual
4. O: POST /api/ovas/{ova_id}/regenerate       →  crea nueva OvaVersion
   a. Desactiva versión anterior (is_active = False)
   b. Activa nueva versión (is_active = True)
   c. Escribe nuevo SCORM zip
```

### 8.4 Generación de Recurso Standalone (Engage/Explore)

```
1. POST /api/agents/engage/generate  {resource_type, concept}
2. Backend:
   a. prompt_texto(resource_type, concept) → generar_texto() → JSON
   b. prompt_html(resource_type, concept, json) → generar_texto() → HTML
3. Respuesta: {resource_json, html_preview}
4. Frontend muestra preview en modal
```

---

## 9. Despliegue

### Desarrollo

```bash
pnpm dev:docker   # docker-compose.yml
                  # frontend → http://localhost:5173  (hot-reload)
                  # backend  → http://localhost:8000  (uvicorn --reload)
```

### Producción

```bash
pnpm prod:docker  # docker-compose.prod.yml
                  # Nginx en puerto 80
                  # /api/*  →  backend:8000
                  # /*      →  frontend (static build)
```

**Nginx** (`deploy/nginx/default.conf`):

```nginx
location /api/ {
    proxy_pass http://backend:8000/;
}
location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
}
```

### Migraciones SQL

Se aplican automáticamente al arrancar el backend en orden alfabético:

```
backend/migrations/
├── 001_init.sql
├── 002_roles.sql
├── 003_...
├── 004_...
└── 005_ova_versions_phases.sql
```

Para aplicar manualmente:

```bash
cd backend
python run_migrations.py
```
