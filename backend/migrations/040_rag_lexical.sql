-- RAG: búsqueda léxica para el modo híbrido (pieza 2).
--
-- Columna generada tsvector con la configuración 'spanish' (presente en
-- PostgreSQL estándar y por tanto en Supabase/pgvector: se verifica con
-- to_tsvector('spanish', ...) al desplegar). La configuración 'spanish'
-- conserva intactos los términos exactos académicos (ReLU, softmax,
-- backpropagation, CNN, nombres de autores/datasets) — justo lo que la
-- búsqueda puramente vectorial trata peor.
--
-- to_tsvector(regconfig, text) es IMMUTABLE (con la configuración explícita),
-- requisito para una columna GENERATED STORED. Índice GIN para la consulta
-- websearch_to_tsquery del camino de recuperación.

ALTER TABLE rag_chunks
    ADD COLUMN IF NOT EXISTS content_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('spanish', content)) STORED;

CREATE INDEX IF NOT EXISTS rag_chunks_content_tsv_idx ON rag_chunks
    USING GIN (content_tsv);
