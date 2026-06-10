# EN-004: Habilitar pgvector (BD Vectorial)

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | EN-004 |
| Tipo | Habilitador |
| Épica/Tema | EP6: Base de Conocimiento Contextual RAG |
| Sprint | Sprint 2 |
| Status | done |
| Prioridad | Alta |
| Estimación | 8 SP |
| Dependencia | — |
| Responsable | — |
| Fase | Prometheus - Detailed Design |
| Fecha creación | 2026-05-25 |
| Fecha actualización | 2026-06-10 |
| Fecha Fin (info) | 2026-05-30 |

## Objetivo

Desplegar y configurar la base vectorial **pgvector** en Supabase para almacenar embeddings de contenido de ML; fundamento del RAG para que los agentes consulten contenido verificado y reduzcan alucinaciones.

## Contexto

Implementado en Sprint 2. La extensión `pgvector` se habilita en `backend/migrations/010_pgvector.sql`. Los embeddings se generan con `gemini-embedding-2-preview` (768 dimensiones) en `backend/rag/embedder.py`. El índice `ivfflat` con `vector_cosine_ops` y 50 listas permite búsqueda eficiente por similitud coseno. El modelo se controla con `RAG_EMBEDDER`; la dimensión con `VECTOR_DIM=768`.

## Alcance

### Incluye
- Extensión `vector` en Supabase (migración 010).
- Tabla `rag_chunks` con columna `embedding vector(768)`.
- Índice `ivfflat` con `vector_cosine_ops` (50 listas) sobre la columna `embedding`.
- `rag/embedder.py`: genera embeddings vía `gemini-embedding-2-preview` por defecto.
- Variables de entorno `VECTOR_DIM` y `RAG_EMBEDDER`.

### No incluye
- Pipeline de ingesta (→ EN-005).
- Ingesta de los 50 recursos de SP-003 (pendiente).
- Modelos alternativos de embedding distintos a Gemini.

## Dependencias

- **EN-008** — Supabase PostgreSQL habilitado con SQLAlchemy (base de datos activa).
- Requerido por **EN-005** (pipeline RAG usa la tabla y el índice).

## Reglas de negocio

1. **R1** — Migración 010 ejecuta `CREATE EXTENSION IF NOT EXISTS vector`.
2. **R2** — Tabla `rag_chunks`: `id UUID PK`, `content TEXT`, `source TEXT`, `embedding vector(768)`, `created_at TIMESTAMPTZ`.
3. **R3** — Índice `ivfflat` con `vector_cosine_ops`; `lists = 50`.
4. **R4** — Modelo por defecto: `gemini-embedding-2-preview`; configurable con `RAG_EMBEDDER`.
5. **R5** — `VECTOR_DIM=768`; cambiar la dimensión requiere reindexar la tabla.
6. **R6** — Consultas de similitud usan operador coseno (`<=>`) y retornan top-k resultados.
7. **R7** — `GEMINI_API_KEY` es server-only; nunca `VITE_*`.

## Criterios de aceptación

- Migración 010 crea extensión `vector` sin errores. **(R1)**
- Tabla `rag_chunks` existe con columna `embedding vector(768)`. **(R2)**
- Índice `ivfflat` con `vector_cosine_ops` creado correctamente. **(R3)**
- `rag/embedder.py` genera embeddings de 768 dimensiones con `gemini-embedding-2-preview`. **(R4, R5)**
- Consulta `ORDER BY embedding <=> $1 LIMIT 5` retorna resultados sin errores. **(R6)**
- `GEMINI_API_KEY` no aparece en ningún archivo `VITE_*` ni en logs. **(R7)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Habilitar pgvector — BD Vectorial (EN-004)

  Scenario: Migración activa la extensión vector
    Given la migración 010 no ha sido aplicada
    When se ejecuta run_migrations()
    Then la extensión "vector" existe en la base de datos
    And la tabla "rag_chunks" existe con columna "embedding vector(768)"

  Scenario: Generar embedding de un texto
    Given el embedder configurado con gemini-embedding-2-preview
    When se llama embed_text("Aprendizaje supervisado en ML")
    Then se retorna un vector de 768 dimensiones
    And el vector puede almacenarse en rag_chunks sin error

  Scenario: Consulta de similitud coseno
    Given existen chunks en rag_chunks con embeddings almacenados
    When se ejecuta una consulta top-5 por similitud coseno
    Then se retornan 5 filas ordenadas por distancia coseno ascendente
    And la consulta completa en menos de 500 ms
```
