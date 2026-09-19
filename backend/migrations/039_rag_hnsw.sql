-- RAG: índice HNSW en lugar de IVFFlat (piezas incrementales + recall).
--
-- ¿Por qué? IVFFlat con lists=50 está dimensionado para ~50k filas por lista
-- (~25k-50k docs); con corpus pequeño rinde peor que un escaneo secuencial y,
-- con ivfflat.probes=1 (su defecto), sondea UNA sola lista: el recall se
-- desploma. Además, IVFFlat se degrada sin REINDEX cuando los datos entran de
-- forma continua (el caso de esta app: los usuarios suben documentos a todas
-- horas). HNSW se actualiza incrementalmente y no pierde recall con corpus
-- pequeño.
--
-- Parámetros (pgvector): m = 16 y ef_construction = 64 (los valores por
-- defecto de pgvector). Con el volumen real de esta app (chunks por usuario,
-- corpus de miles, no millones) m=16 equilibra recall/memoria y mantiene la
-- construcción barata en inserciones incrementales; subirlos duplicaría el
-- coste de build sin beneficio medible a esta escala. ef_search se fija en la
-- consulta (40 = defecto de pgvector, explícito para que el plan sea
-- predecible).
--
-- Estado honesto en el momento de la migración: rag_chunks tenía 0 filas en
-- el entorno de desarrollo — con corpus diminuto la diferencia no se mide en
-- recall; el argumento fuerte es el de inserciones incrementales sin REINDEX.

DROP INDEX IF EXISTS rag_chunks_embedding_idx;

CREATE INDEX IF NOT EXISTS rag_chunks_embedding_hnsw_idx ON rag_chunks
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
