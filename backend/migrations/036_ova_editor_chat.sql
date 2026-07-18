-- Historial de chat del workspace de edición (prompts, selecciones, regeneraciones).
-- Persistido por OVA; el backend (postgres) escribe/lee; RLS deny-all para PostgREST.

CREATE TABLE IF NOT EXISTS ova_editor_chat_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ova_id          UUID NOT NULL REFERENCES ovas(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL,
    kind            VARCHAR(40) NOT NULL DEFAULT 'message',
    text            TEXT NOT NULL DEFAULT '',
    status          VARCHAR(20),
    percentage      INTEGER,
    resource_labels JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ova_editor_chat_ova_created
    ON ova_editor_chat_messages (ova_id, created_at ASC);

ALTER TABLE ova_editor_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS backend_only ON ova_editor_chat_messages;
CREATE POLICY backend_only ON ova_editor_chat_messages USING (false);
