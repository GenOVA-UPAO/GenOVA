# EN-005: Habilitar pipeline RAG end-to-end

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | EN-005 |
| Tipo | Habilitador |
| Épica/Tema | EP6: Base de Conocimiento Contextual RAG |
| Sprint | Sprint 2 |
| Status | done |
| Prioridad | Alta |
| Estimación | 13 SP |
| Dependencia | EN-004 |
| Responsable | — |
| Fase | Prometheus - Detailed Design |
| Fecha creación | 2026-06-01 |
| Fecha actualización | 2026-06-10 |
| Fecha Fin (info) | 2026-06-10 |

## Objetivo

Desarrollar el pipeline técnico completo **embedding → retrieval → generación aumentada**, conectando la BD vectorial (EN-004) con los agentes generadores para reducir alucinaciones y mejorar la precisión del contenido de ML.

## Contexto

Implementado en Sprint 2 como módulo `backend/rag/`. El entry point de ingesta es `ingest_upload()` en `backend/uploads/router.py`. El módulo está compuesto por: `pipeline.py` (orquestador), `parsers.py` (extracción multimodal), `chunker.py` (segmentación), `embedder.py` (vectorización), `store.py` (persistencia) y `retriever.py` (búsqueda y contexto). Los agentes invocados por EN-003 consultan el retriever antes de generar cada recurso 5E.

## Alcance

### Incluye
- **Ingesta**: `parsers.py` extrae texto de PDF, imágenes, audio y video (vía Gemini multimodal para formatos no textuales).
- **Chunking**: `chunker.py` fragmenta con `chunk_size=800`, `overlap=150`, máximo 100 chunks por documento.
- **Embedding**: `embedder.py` vectoriza cada chunk con `gemini-embedding-2-preview` (768-dim).
- **Almacenamiento**: `store.py` persiste en `rag_chunks` (EN-004).
- **Retrieval**: `retriever.py` busca top-`k=5` chunks por similitud coseno; construye contexto máximo de 6 000 caracteres; cache TTL = 3 600 s.
- **Integración con agentes**: los agentes de EN-003 reciben el contexto RAG antes de generar.

### No incluye
- UI de gestión de documentos RAG (gestión es directa vía uploads).
- Evaluación cuantitativa formal con BERTScore (pendiente TA-003 en Sprint 3).
- Ingesta de los 50 recursos de SP-003 (tarea manual post-despliegue).

## Dependencias

- **EN-004** — tabla `rag_chunks` + extensión vector activas.
- **EN-003** — agentes Prometheus invocan el retriever por fase 5E.
- Consumido por **HU-007** (upload de archivos base → ingesta RAG).

## Reglas de negocio

1. **R1** — Flujo de ingesta: `ingest_upload()` → `parse()` → `chunk()` → `embed()` → `store()`.
2. **R2** — Chunker: `chunk_size=800 chars`, `overlap=150 chars`, `max_chunks=100`.
3. **R3** — Retriever: `top_k=5`, `max_context=6000 chars`, cache TTL=3600 s.
4. **R4** — Formatos de archivos: PDF y texto → parseo local; imagen, audio, video → Gemini multimodal directo.
5. **R5** — `GEMINI_API_KEY` es server-only; nunca `VITE_*`.
6. **R6** — Si el retriever falla o retorna vacío, los agentes generan sin contexto RAG (degradación elegante).
7. **R7** — Ningún archivo del módulo `rag/` supera 200 líneas.

## Criterios de aceptación

- `ingest_upload()` procesa un PDF y guarda chunks en `rag_chunks`. **(R1, R2)**
- El retriever retorna 5 chunks relevantes dado un query de ML. **(R3)**
- Imágenes y audio se procesan vía Gemini sin errores. **(R4)**
- `GEMINI_API_KEY` no aparece en logs ni en respuestas HTTP. **(R5)**
- Si el retriever falla, la generación de OVA continúa sin error 500. **(R6)**
- Todos los archivos en `backend/rag/` tienen ≤ 200 líneas. **(R7)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Pipeline RAG end-to-end (EN-005)

  Scenario: Ingesta de documento PDF
    Given un archivo PDF con contenido de ML
    When se llama ingest_upload() con ese archivo
    Then el PDF se parsea, se fragmenta en chunks de ~800 chars
    And cada chunk se vectoriza y se almacena en rag_chunks

  Scenario: Retrieval de contexto para un query
    Given chunks de ML almacenados en rag_chunks
    When el retriever recibe query "¿Qué es el overfitting?"
    Then retorna hasta 5 chunks por similitud coseno
    And el contexto concatenado no supera 6000 caracteres

  Scenario: Degradación elegante sin contexto
    Given que el retriever no encuentra chunks relevantes
    When un agente solicita contexto RAG para generar un recurso
    Then el agente genera el recurso sin contexto
    And no se produce un error 500

  Scenario: Ingesta de imagen vía Gemini
    Given una imagen PNG con un diagrama de red neuronal
    When se llama ingest_upload() con esa imagen
    Then Gemini extrae el texto/descripción de la imagen
    And se genera al menos un chunk almacenado en rag_chunks
```
