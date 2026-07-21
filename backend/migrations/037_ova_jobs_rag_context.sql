-- Persiste el contexto RAG que el concierge inyectó en la generación (OE2).
-- Sin esta columna el contexto solo vivía en el estado de LangGraph y se perdía
-- al terminar el job, así que no había forma de auditar contra qué material se
-- generó cada OVA ni de medir la precisión de contenido frente al RAG.
-- Un contexto por job: todos los recursos del job comparten el mismo concepto.

ALTER TABLE ova_jobs
    ADD COLUMN IF NOT EXISTS rag_context TEXT;

COMMENT ON COLUMN ova_jobs.rag_context IS
    'Bloque de fuentes recuperado por el concierge e inyectado en los prompts. '
    'NULL = generación sin material del usuario (no evaluable para OE2).';
