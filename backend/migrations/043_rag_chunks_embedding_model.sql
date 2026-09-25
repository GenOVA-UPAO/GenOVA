-- RAG: qué embedder produjo cada vector.
--
-- Los vectores solo son comparables si consulta y documento salen del mismo
-- modelo con el mismo formato de entrada. Cambiar de gemini-embedding-2-preview
-- a gemini-embedding-2, de v1 a v2 (espacios incompatibles según la guía de
-- Gemini) o los prefijos de tarea de v2 deja los vectores guardados en otro
-- espacio: la búsqueda vectorial devuelve ruido sin dar error.
--
-- `embedding_model` guarda la `fingerprint` del embedder (p. ej.
-- 'gemini:gemini-embedding-2:768:prefix-v1'). NULL = fragmento anterior a esta
-- migración (origen desconocido). `scripts/reindex_rag.py` re-embebe los que no
-- coinciden con el embedder activo. Sin índice: el reindexado es una tarea de
-- mantenimiento y la tabla es pequeña.

ALTER TABLE rag_chunks
    ADD COLUMN IF NOT EXISTS embedding_model TEXT;
