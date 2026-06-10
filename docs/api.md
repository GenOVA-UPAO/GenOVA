# Referencia de API REST

Backend FastAPI de GenOVA. Todos los endpoints cuelgan de la base configurada en
`VITE_API_BASE_URL` (dev: `http://localhost:8000`).

> **Swagger interactivo**: con el backend corriendo, abre `http://localhost:8000/docs`
> (Swagger UI) o `http://localhost:8000/redoc` (ReDoc) para explorar y probar todo en vivo.

**Convenciones de la columna Auth**:
- `—` público (sin token)
- `user` requiere sesión (`Depends(get_current_user)`)
- `admin` requiere rol administrador (`Depends(require_admin)`)

> Los routers de **auth**, **roles** y **users** están montados por duplicado: bajo
> `/api/...` (canónico) y sin el prefijo `/api` (`/auth`, `/roles`, `/users`) por
> compatibilidad. Abajo se listan solo las rutas canónicas `/api/*`.

---

## Health

| Método | Ruta | Propósito | Auth | Rate-limit |
|---|---|---|---|---|
| GET | `/health` | Liveness raíz | — | — |
| GET | `/api/health` | Liveness del scope API | — | — |
| GET | `/api/db/health` | Conectividad a PostgreSQL (`SELECT 1`) | — | — |
| GET | `/api/agents/health` | Salud del módulo agents/5E | — | — |
| GET | `/api/rag/health` | Salud RAG (embedder, dim vector, pgvector listo) | — | — |
| GET | `/api/scorm/health` | Salud del módulo SCORM | — | — |
| GET | `/api/ova/health` | Salud del módulo OVA | — | — |
| GET | `/api/uploads/health` | Salud del módulo uploads | — | — |

## Auth (`/api/auth`)

| Método | Ruta | Propósito | Auth | Rate-limit |
|---|---|---|---|---|
| POST | `/api/auth/login` | Login con email/contraseña; emite cookie httpOnly `genova_token` | — | 10/min |
| POST | `/api/auth/register` | Registro de cuenta nueva | — | 5/min |
| POST | `/api/auth/logout` | Cierra sesión (borra la cookie) | — | — |
| GET | `/api/auth/me` | Perfil + rol del usuario actual | user | — |
| POST | `/api/auth/reset-password` | Solicita correo de restablecimiento | — | 10/min |

## OVA — generación y descarga (`/api/ova`)

| Método | Ruta | Propósito | Auth | Rate-limit |
|---|---|---|---|---|
| GET | `/api/ova/llm-options` | Modelos LLM habilitados para el selector | — | — |
| POST | `/api/ova/save` | Guarda OVA generada (crea versión, fases, zip SCORM) | user | — |
| GET | `/api/ova/{ova_id}/scorm` | Descarga el zip SCORM (endpoint legacy) | user | — |

## OVA — listado y papelera (`/api/ovas`)

| Método | Ruta | Propósito | Auth | Rate-limit |
|---|---|---|---|---|
| GET | `/api/ovas` | Lista las OVAs del usuario (paginado, búsqueda, sin borradas) | user | — |
| GET | `/api/ovas/{ova_id}/download` | Descarga SCORM (preferido; 302 a signed URL) | user | — |
| PATCH | `/api/ovas/{ova_id}/metadata` | Edita título y descripción | user | — |
| DELETE | `/api/ovas/{ova_id}` | Soft-delete (marca `deleted_at`) | user | — |
| GET | `/api/ovas/papelera` | Lista OVAs en papelera (paginado) | user | — |
| GET | `/api/ovas/papelera/count` | Conteo de OVAs en papelera | user | — |
| PATCH | `/api/ovas/{ova_id}/restaurar` | Restaura desde la papelera | user | — |
| DELETE | `/api/ovas/{ova_id}/permanente` | Borrado definitivo (elimina el archivo SCORM) | user | — |
| POST | `/api/ovas/lote/papelera` | Soft-delete en lote | user | — |
| POST | `/api/ovas/lote/restaurar` | Restaurar en lote | user | — |
| DELETE | `/api/ovas/lote/permanente` | Borrado definitivo en lote | user | — |
| POST | `/api/ovas/{ova_id}/duplicar` | Duplica la OVA con título renombrado | user | — |

## OVA — edición y regeneración (`/api/ovas`)

| Método | Ruta | Propósito | Auth | Rate-limit |
|---|---|---|---|---|
| GET | `/api/ovas/{ova_id}/editar` | Vista completa de edición (versiones, fases, contenido) | user | — |
| GET | `/api/ovas/{ova_id}/versiones` | Lista versiones de la OVA | user | — |
| PATCH | `/api/ovas/{ova_id}/fases/{fase_id}` | Edita contenido de fase; auto-bump de versión | user | — |
| GET | `/api/ovas/{ova_id}/export-scorm` | Exporta SCORM desde el editor | user | — |
| POST | `/api/ovas/{ova_id}/regenerar` | Inicia job de regeneración de fase con LLM | user | — |
| GET | `/api/ovas/{ova_id}/regenerar/{job_id}/progress` | Poll del progreso de regeneración | user | — |

## Agents / 5E (`/api/agents`)

| Método | Ruta | Propósito | Auth | Rate-limit |
|---|---|---|---|---|
| GET | `/api/agents/engage/recursos` | Lista los 10 tipos de recurso ENGAGE + metadata | — | — |
| POST | `/api/agents/engage/generate` | Genera un recurso ENGAGE (pipeline texto→JSON→HTML) | user | 5/min |
| GET | `/api/agents/explore/recursos` | Lista los 10 tipos de recurso EXPLORE + metadata | — | — |
| POST | `/api/agents/explore/generate` | Genera un recurso EXPLORE (pipeline texto→JSON→HTML) | user | 5/min |

> Detalle del pipeline, tipos de recurso y cadena de fallback LLM en
> [generacion-5e.md](generacion-5e.md).

## Labs — sandbox de prompts (`/api/labs`, solo admin)

| Método | Ruta | Propósito | Auth | Rate-limit |
|---|---|---|---|---|
| GET | `/api/labs/models` | Modelos LLM disponibles para experimentos | admin | — |
| GET | `/api/labs/prompts/{phase}/{resource_type}` | Plantilla base de prompt de un recurso | admin | — |
| POST | `/api/labs/generate` | Lanza job multi-modelo (1–3 configs) | admin | 5/min |
| GET | `/api/labs/generate/{job_id}/results` | Poll de resultados del job | admin | — |
| POST | `/api/labs/improve-prompt` | Mejora el prompt ganador vía LLM orquestador | admin | 10/min |
| GET | `/api/labs/results` | Resultados recientes (filtrables por fase/tipo) | admin | — |
| PATCH | `/api/labs/results/{result_id}/select` | Marca un resultado como ganador | admin | — |
| GET | `/api/labs/results/{result_id}/scorm` | Exporta un resultado como SCORM | admin | — |

> Doc funcional de Labs: [labs.md](labs.md).

## RAG (`/api/rag`)

| Método | Ruta | Propósito | Auth | Rate-limit |
|---|---|---|---|---|
| GET | `/api/rag/health` | Estado (embedder, dim, pgvector) | — | — |
| GET | `/api/rag/chunks/by-upload/{upload_id}` | Lista chunks de un upload (debug) | user | — |

## Uploads (`/api/uploads`)

| Método | Ruta | Propósito | Auth | Rate-limit |
|---|---|---|---|---|
| GET | `/api/uploads/temp` | Lista los archivos temporales del usuario | user | — |
| POST | `/api/uploads/temp` | Sube 1+ archivos (ingesta RAG bajo demanda) | user | — |
| DELETE | `/api/uploads/temp/{upload_id}` | Elimina un upload temporal | user | — |

## Roles (`/api/roles`, solo admin)

| Método | Ruta | Propósito | Auth | Rate-limit |
|---|---|---|---|---|
| GET | `/api/roles` | Lista roles con conteo de usuarios y permisos | admin | — |
| POST | `/api/roles` | Crea un rol | admin | — |
| PATCH | `/api/roles/{id}` | Edita rol (bloquea roles de sistema) | admin | — |
| DELETE | `/api/roles/{id}` | Elimina rol (flujo de reasignación) | admin | — |

## Users (`/api/users`)

| Método | Ruta | Propósito | Auth | Rate-limit |
|---|---|---|---|---|
| PATCH | `/api/users/me` | Edita perfil propio (email, nombre, university_id, gender, phone) | user | — |
| POST | `/api/users/me/change-password` | Cambia contraseña (exige la actual) | user | — |
| GET | `/api/users/admin` | Lista usuarios (paginado, búsqueda) | admin | — |
| PATCH | `/api/users/admin/{user_id}` | Edita perfil de un usuario | admin | — |
| PATCH | `/api/users/admin/{user_id}/status` | Activa/desactiva cuenta | admin | — |
| PATCH | `/api/users/admin/{user_id}/role` | Asigna/cambia rol | admin | — |
| POST | `/api/users/admin/{user_id}/unlock` | Desbloquea cuenta (resetea intentos) | admin | — |
| POST | `/api/users/admin/{user_id}/reset-password-email` | Envía reset por correo | admin | — |
| POST | `/api/users/admin/{user_id}/reset-password-whatsapp` | Genera link de reset por WhatsApp | admin | — |

---

## Notas de seguridad relevantes

- El JWT viaja como cookie **httpOnly** `genova_token` (`Secure; SameSite=Strict`),
  no en el body. El frontend usa `credentials: 'include'`. Ver
  [README](../README.md#endurecimiento-de-seguridad).
- Los tokens de reset **nunca** se devuelven al cliente: el endpoint solo retorna el
  canal de entrega (correo encolado o link `wa.me`).
- Endpoints con input externo llevan `@limiter.limit(...)` (SlowAPI) — ver columna Rate-limit.

_Fuentes: `backend/main.py` (montaje de routers) y cada `backend/*/router.py`._
