# Esquema de base de datos

PostgreSQL (Supabase) + extensión **pgvector**. Las migraciones viven en
`backend/migrations/` (`001`–`017`) y se aplican **automáticamente al arrancar** vía
`run_migrations()`; cada archivo corre como máximo una vez por base (registro en
`_migrations_applied`, bootstrapped por la 016). Siguiente migración: crear
`backend/migrations/018_<nombre>.sql`.

El modelo ORM (SQLAlchemy 2) vive en `backend/models.py`.

---

## Tablas

### `users`
- `id` UUID **PK**
- `email` VARCHAR(255) **único**, indexado
- `password_hash` VARCHAR(255) — bcrypt
- `failed_login_attempts` INTEGER (default 0)
- `locked_until` TIMESTAMPTZ, nullable — lockout tras 5 intentos
- `full_name` VARCHAR(255), nullable
- `is_active` BOOLEAN (default true)
- `university_id` INTEGER único, nullable, indexado
- `gender` VARCHAR(20), nullable
- `phone_number` VARCHAR(20) único, nullable, indexado
- `created_at` / `updated_at` TIMESTAMPTZ

### `ovas`
- `id` UUID **PK**
- `user_id` UUID **FK→users.id**, indexado
- `title` VARCHAR(255)
- `description` TEXT, nullable
- `status` VARCHAR(20) (default `borrador`)
- `file_path` TEXT, nullable — ruta del fallback en disco local
- `storage_key` TEXT, nullable — object key en Supabase Storage
- `current_version_id` UUID, nullable
- `deleted_at` TIMESTAMPTZ, nullable — flag de **soft-delete**
- `created_at` / `updated_at` TIMESTAMPTZ
- **Índice parcial**: `idx_ovas_active (user_id, created_at) WHERE deleted_at IS NULL`

### `ova_versions`
- `id` UUID **PK**
- `ova_id` UUID **FK→ovas.id** ON DELETE CASCADE, indexado
- `version_number` INTEGER
- `prompt` TEXT
- `is_active` BOOLEAN (default true)
- `created_at` TIMESTAMPTZ
- **Índice único parcial**: `uq_one_active_version_per_ova (ova_id) WHERE is_active = TRUE`

### `ova_phases`
- `id` UUID **PK**
- `version_id` UUID **FK→ova_versions.id** ON DELETE CASCADE, indexado
- `phase_type` VARCHAR(30) — `ENGAGE` o `EXPLORE`
- `phase_order` INTEGER
- `content` TEXT — HTML del recurso
- `regenerated` BOOLEAN (default false)
- `resource_type_id` INTEGER, nullable — 1–10 (tipo de recurso dentro de la fase)
- `title` VARCHAR(120), nullable — etiqueta legible para la navegación SCORM
- `created_at` TIMESTAMPTZ

### `sessions`
- `id` UUID **PK**
- `user_id` UUID **FK→users.id**
- `created_at` / `expires_at` TIMESTAMPTZ

### `roles`
- `id` UUID **PK**
- `name` VARCHAR(64) **único**
- `description` TEXT, nullable
- `permissions` **JSONB** (default `[]`)
- `created_at` TIMESTAMPTZ

### `user_roles`
- `user_id` UUID **FK→users.id** (PK compuesta)
- `role_id` UUID **FK→roles.id** (PK compuesta)
- `created_at` TIMESTAMPTZ

### `password_reset_tokens`
- `id` UUID **PK**
- `user_id` UUID **FK→users.id**
- `token` VARCHAR(255) **único**
- `created_at` / `expires_at` TIMESTAMPTZ

### `rag_chunks`
- `id` UUID **PK**
- `user_id` UUID **FK→users.id** ON DELETE CASCADE, indexado
- `upload_id` UUID, indexado — agrupa chunks del mismo archivo
- `ova_id` UUID **FK→ovas.id** ON DELETE SET NULL, nullable — liga chunks a una OVA
- `source_filename` TEXT · `chunk_index` INTEGER · `content` TEXT
- `embedding` **vector(768)** — pgvector; 768-d (Gemini) o 384-d (local MiniLM)
- `created_at` TIMESTAMPTZ
- `expires_at` TIMESTAMPTZ — chunks sueltos expiran 1 h tras crearse; los ligados a una
  OVA viven hasta el borrado de la OVA
- **Índices**: `idx_rag_chunks_expires_at (expires_at)` · embedding **ivfflat**
  (`vector_cosine_ops`, `lists=50`)

---

## Notas

- **Soft-delete de OVAs**: el listado normal filtra `deleted_at IS NULL`; la papelera lista
  lo contrario. El índice parcial mantiene rápido el listado activo.
- **Una versión activa por OVA**: garantizado por el índice único parcial.
- **Purga RAG**: al arrancar, `purge_expired()` borra chunks vencidos (`expires_at < now()`)
  en un hilo de fondo para no bloquear el cold boot.
- **pgvector**: la dimensión depende del embedder (768 Gemini / 384 local). Ver
  [generacion-5e.md](generacion-5e.md) y la sección RAG del [README](../README.md).

_Fuentes: `backend/migrations/001_init.sql`–`017_soft_delete_indexes.sql`, `backend/models.py`._
