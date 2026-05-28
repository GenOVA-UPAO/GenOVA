-- Partial index: speeds `WHERE deleted_at IS NULL` listing queries on ovas.
CREATE INDEX IF NOT EXISTS idx_ovas_active
    ON ovas (user_id, created_at)
    WHERE deleted_at IS NULL;

-- RAG purge runs `WHERE expires_at < NOW()`; a btree on expires_at avoids the
-- full scan once the table grows past a few thousand rows.
CREATE INDEX IF NOT EXISTS idx_rag_chunks_expires_at
    ON rag_chunks (expires_at);
