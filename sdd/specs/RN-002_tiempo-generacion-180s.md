# RN-002: Tiempo de generación ≤ 180 segundos (MTTG)

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | RN-002 |
| Tipo | Req. No Funcional |
| Épica/Tema | EP6: Base de Conocimiento Contextual RAG |
| Sprint | Sprint 2 |
| Status | spec_ready |
| Prioridad | Alta |
| Estimación | 8 SP |
| Dependencia | EN-003, EN-005 |
| Responsable | — |
| Fase | Prometheus - Detailed Design |
| Fecha creación | 2026-06-11 |
| Fecha actualización | 2026-06-10 |
| Fecha Fin (info) | 2026-06-13 |

## Objetivo

Garantizar que el tiempo desde el envío del prompt hasta la disponibilidad del paquete SCORM sea ≤ 180 s (MTTG — Mean Time To Generation); rendimiento mínimo aceptable para el flujo de los 60+ estudiantes de la evaluación SUS.

## Contexto

Criterio del Charter: una espera > 3 minutos rompe el flujo pedagógico y reduce la adopción. El pipeline actual usa orquestación Prometheus (EN-003) con LangGraph que ejecuta las 5 fases en paralelo cuando no hay dependencias; el RAG (EN-005) añade latencia de retrieval pero reduce la latencia total al evitar reintentos por contenido incorrecto. La medición formal (10+ generaciones, P50/P90) está pendiente de ejecutarse como parte de RN-004.

## Alcance

### Incluye
- Definición del criterio MTTG y cómo se mide.
- Identificación de la ruta crítica (retrieval RAG → generación LLM por fase → empaquetado SCORM).
- Metodología de medición: `backend/tests/test_latency.py`, 10+ generaciones, P50/P90.
- Umbrales de aceptación para P50 y P90.

### No incluye
- Optimizaciones de latencia específicas (caen en TA-003 o mejoras futuras de EN-003).
- Medición de latencia de endpoints no-LLM (→ RN-001, Sprint 3).
- Garantías de SLA de terceros (Groq, OpenRouter, Gemini).

## Dependencias

- **EN-003** — orquestador Prometheus define la ruta crítica de generación.
- **EN-005** — retrieval RAG añade latencia medible al pipeline.
- Verificado por **RN-004** (smoke test ejecuta el pipeline completo y registra tiempos).

## Reglas de negocio

1. **R1** — **MTTG** se define como: tiempo desde `POST /api/ova/jobs` hasta que el job retorna `status: "done"` con el paquete SCORM disponible.
2. **R2** — El criterio de aprobación es P50 ≤ 180 s y P90 ≤ 240 s, medidos sobre ≥ 10 generaciones con temas distintos.
3. **R3** — La ruta crítica es: retrieval RAG (top_k=5) → generación LLM de las 5 fases → empaquetado SCORM. Las fases sin dependencia entre sí se ejecutan en paralelo vía LangGraph.
4. **R4** — Si P90 > 240 s, se documenta como deuda técnica y se escala en Sprint 3 (optimización de prompts o paralelismo adicional).
5. **R5** — Cada medición registra: topic, nivel, tiempo_total_s, fase más lenta, provider LLM usado (Groq/OpenRouter).

## Criterios de aceptación

- Medición ejecutada sobre ≥ 10 generaciones con temas distintos de ML. **(R2)**
- P50 ≤ 180 s registrado en el reporte de RN-004. **(R2)**
- La ruta crítica identificada documenta cuál fase es la más lenta. **(R3, R5)**
- Si P90 > 240 s, el hallazgo queda documentado como deuda técnica. **(R4)**
- Cada ejecución registra provider LLM y tiempo por fase. **(R5)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Tiempo de generación MTTG ≤ 180 s (RN-002)

  Scenario: Generación completa dentro del límite
    Given un usuario autenticado
    When envía POST /api/ova/jobs con topic "Redes neuronales" y level "intermedio"
    Then el job completa con status "done" en menos de 180 segundos
    And el paquete SCORM está disponible para descarga

  Scenario: Registro de métricas por generación
    Given una generación que completa con éxito
    When se registran las métricas de rendimiento
    Then el registro incluye tiempo_total_s, fase más lenta y provider LLM
    And el P50 calculado sobre 10 generaciones es ≤ 180 s

  Scenario: P90 fuera de rango documenta deuda técnica
    Given 10 generaciones medidas con P90 > 240 s
    When se analiza el reporte
    Then el hallazgo se documenta como deuda técnica en Sprint 3
    And se identifica la fase responsable del exceso de latencia
```
