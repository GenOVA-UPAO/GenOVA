-- RAG chunk store. Each row = one (chunk_text, embedding) pair from a user upload.
-- Chunks belong to an upload (created at /api/uploads/temp time) and become tied
-- to an ova when the upload is consumed by generation. Untied chunks expire 1 h
-- after creation; tied chunks live until the OVA is deleted.

CREATE TABLE IF NOT EXISTS rag_chunks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    upload_id       UUID NOT NULL,
    ova_id          UUID NULL REFERENCES ovas(id) ON DELETE SET NULL,
    source_filename TEXT NOT NULL,
    chunk_index     INTEGER NOT NULL,
    content         TEXT NOT NULL,
    embedding       vector(768) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS rag_chunks_upload_idx ON rag_chunks(upload_id);
CREATE INDEX IF NOT EXISTS rag_chunks_user_idx ON rag_chunks(user_id);
CREATE INDEX IF NOT EXISTS rag_chunks_expiry_idx ON rag_chunks(expires_at)
    WHERE ova_id IS NULL;
CREATE INDEX IF NOT EXISTS rag_chunks_embedding_idx ON rag_chunks
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
