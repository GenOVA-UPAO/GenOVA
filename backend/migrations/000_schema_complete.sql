-- Squash migration: full schema in one idempotent file.
-- All statements use IF NOT EXISTS / IF EXISTS so this is safe to run
-- against an existing database (only missing objects are created).
-- Replaces the 27 incremental migration files that preceded it.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    full_name       VARCHAR(255),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    university_id   INTEGER UNIQUE,
    gender          VARCHAR(20),
    phone_number    VARCHAR(20) UNIQUE,
    llm_settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
    enabled_models  JSONB NOT NULL DEFAULT '[]'::jsonb,
    ova_settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
    theme_settings  JSONB NOT NULL DEFAULT '{"colorMode": "upao", "designMode": "upao", "palette": null}'::jsonb,
    user_api_keys   JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_users_email          ON users (email);
CREATE INDEX IF NOT EXISTS ix_users_university_id  ON users (university_id);
CREATE INDEX IF NOT EXISTS ix_users_phone_number   ON users (phone_number);

-- Column added after initial schema — safe no-op on fresh DBs.
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_settings JSONB NOT NULL
    DEFAULT '{"colorMode": "upao", "designMode": "upao", "palette": null}'::jsonb;

-- ---------------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(64) UNIQUE NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- ---------------------------------------------------------------------------
-- ovas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ovas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id),
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'borrador',
    file_path           TEXT,
    storage_key         TEXT,
    current_version_id  UUID,
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_ovas_user_id ON ovas (user_id);
CREATE INDEX IF NOT EXISTS idx_ovas_created_at ON ovas (created_at);
CREATE INDEX IF NOT EXISTS idx_ovas_active ON ovas (user_id, created_at)
    WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- ---------------------------------------------------------------------------
-- user_roles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
    user_id    UUID NOT NULL REFERENCES users(id),
    role_id    UUID NOT NULL REFERENCES roles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);

-- ---------------------------------------------------------------------------
-- user_links
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    linked_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    invite_email    VARCHAR(255),
    code_hash       VARCHAR(255) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    expires_at      TIMESTAMPTZ NOT NULL,
    consumed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_links_owner          ON user_links (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_user_links_linked         ON user_links (linked_user_id);
CREATE INDEX IF NOT EXISTS idx_user_links_invite_email   ON user_links (invite_email);
CREATE INDEX IF NOT EXISTS idx_user_links_status_expires ON user_links (status, expires_at);

-- ---------------------------------------------------------------------------
-- ova_versions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ova_versions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ova_id         UUID NOT NULL REFERENCES ovas(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    prompt         TEXT NOT NULL,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_ova_versions_ova_id ON ova_versions (ova_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_version_per_ova ON ova_versions (ova_id)
    WHERE is_active = TRUE;

-- ---------------------------------------------------------------------------
-- ova_phases
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ova_phases (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id       UUID NOT NULL REFERENCES ova_versions(id) ON DELETE CASCADE,
    phase_type       VARCHAR(30) NOT NULL,
    phase_order      INTEGER NOT NULL,
    content          TEXT NOT NULL,
    regenerated      BOOLEAN NOT NULL DEFAULT FALSE,
    resource_type_id INTEGER,
    title            VARCHAR(120),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_ova_phases_version_id ON ova_phases (version_id);

-- ---------------------------------------------------------------------------
-- ova_phase_versions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ova_phase_versions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id     UUID NOT NULL REFERENCES ova_phases(id) ON DELETE CASCADE,
    ova_id       UUID NOT NULL REFERENCES ovas(id) ON DELETE CASCADE,
    minor_number INTEGER NOT NULL DEFAULT 1,
    content      TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_ova_phase_versions_phase_id ON ova_phase_versions (phase_id);
CREATE INDEX IF NOT EXISTS ix_ova_phase_versions_ova_id   ON ova_phase_versions (ova_id);

-- ---------------------------------------------------------------------------
-- lab_results
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lab_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase           VARCHAR(20) NOT NULL,
    resource_type   INTEGER NOT NULL,
    concept         VARCHAR(500) NOT NULL,
    prompt_text     TEXT NOT NULL,
    model_id        VARCHAR(100) NOT NULL,
    provider        VARCHAR(50) NOT NULL,
    html_content    TEXT,
    raw_json        JSONB,
    quality_checks  JSONB,
    was_selected    BOOLEAN NOT NULL DEFAULT FALSE,
    generation_ms   INTEGER,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by      UUID REFERENCES users(id)
);

-- ---------------------------------------------------------------------------
-- rag_chunks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rag_chunks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    upload_id       UUID NOT NULL,
    ova_id          UUID REFERENCES ovas(id) ON DELETE SET NULL,
    source_filename TEXT NOT NULL,
    chunk_index     INTEGER NOT NULL,
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_rag_chunks_upload_id    ON rag_chunks (upload_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_expires_at  ON rag_chunks (expires_at);

-- pgvector embedding column — only add if missing (vector extension must be loaded first).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rag_chunks' AND column_name = 'embedding'
    ) THEN
        ALTER TABLE rag_chunks ADD COLUMN embedding vector(768);
    END IF;
END$$;

-- ---------------------------------------------------------------------------
-- password_reset_tokens
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id),
    token      VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- ---------------------------------------------------------------------------
-- platform_config
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_config (
    key        VARCHAR(128) PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- catalog_cache
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalog_cache (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider   VARCHAR(20) UNIQUE NOT NULL,
    raw_data   JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_catalog_cache_provider ON catalog_cache (provider);

-- ---------------------------------------------------------------------------
-- ova_error_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ova_error_logs (
    error_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ova_id         UUID,
    job_id         UUID,
    job_resource_id UUID,
    user_id        UUID,
    error_category VARCHAR(20) NOT NULL DEFAULT 'other',
    message        TEXT NOT NULL DEFAULT '',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_ova_error_logs_ova_id ON ova_error_logs (ova_id);

-- ---------------------------------------------------------------------------
-- ova_jobs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ova_jobs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ova_id      UUID REFERENCES ovas(id) ON DELETE SET NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'queued',
    prompt      TEXT NOT NULL DEFAULT '',
    params      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at  TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_ova_jobs_user_id ON ova_jobs (user_id);
CREATE INDEX IF NOT EXISTS ix_ova_jobs_ova_id  ON ova_jobs (ova_id);

-- ---------------------------------------------------------------------------
-- ova_job_resources
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ova_job_resources (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id         UUID NOT NULL REFERENCES ova_jobs(id) ON DELETE CASCADE,
    phase_type     VARCHAR(30) NOT NULL,
    phase_order    INTEGER NOT NULL,
    resource_type  VARCHAR(40),
    resource_order INTEGER NOT NULL DEFAULT 0,
    status         VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempts       INTEGER NOT NULL DEFAULT 0,
    error_id       UUID,
    ova_phase_id   UUID REFERENCES ova_phases(id) ON DELETE SET NULL,
    content        TEXT,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_ova_job_resources_job_id       ON ova_job_resources (job_id);
CREATE INDEX IF NOT EXISTS idx_ova_job_resources_order       ON ova_job_resources (job_id, phase_order, resource_order);

-- ---------------------------------------------------------------------------
-- RLS (service role bypasses — no functional impact; blocks anon/authenticated)
-- Conditional: only ALTER TABLE when RLS is not yet enabled so we avoid
-- acquiring ACCESS EXCLUSIVE locks on tables that already have RLS on
-- (which would block during blue-green deploys with live connections).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    tbl text;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'users', 'ovas', 'sessions', 'roles', 'user_roles', 'user_links',
        'ova_versions', 'ova_phases', 'ova_phase_versions', 'lab_results',
        'rag_chunks', 'password_reset_tokens', 'platform_config', 'catalog_cache',
        'ova_error_logs', 'ova_jobs', 'ova_job_resources'
    ]
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_class WHERE relname = tbl AND relrowsecurity = true
        ) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
        END IF;
    END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Data fix: orphan OVAs stuck in 'generando' with no associated job
-- ---------------------------------------------------------------------------
UPDATE ovas
SET status = 'error'
WHERE status = 'generando'
  AND id NOT IN (
      SELECT DISTINCT ova_id FROM ova_jobs WHERE ova_id IS NOT NULL
  );
