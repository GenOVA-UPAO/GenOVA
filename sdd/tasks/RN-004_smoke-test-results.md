# RN-004: Resultados Prueba de Humo — 2026-06-10

**Backend:** https://genova-ebs2.onrender.com  
**Ejecutado:** 2026-06-10  
**Muestras:** 10 por endpoint (non-LLM); 1 generación de fase (LLM proxy)

---

## Non-LLM endpoints (umbral OE1 = 278 ms)

| Endpoint | avg (ms) | p95 (ms) | min | max | Resultado |
|---|---|---|---|---|---|
| GET /health | 0.8 | 0.9 | 0.6 | 1.1 | PASA |
| GET /api/health | 0.7 | 0.9 | 0.5 | 1.0 | PASA |
| GET /api/db/health | 253.6 | 255.2 | 253.0 | 255.3 | PASA |
| GET /api/auth/me | 256.4 | 256.7 | 255.7 | 259.4 | PASA |
| GET /api/ovas | 387.8 | 388.9 | 385.4 | 402.2 | **FALLA** |
| GET /api/ovas?page=1&limit=10 | 387.7 | 388.6 | 386.1 | 390.0 | **FALLA** |
| GET /api/roles | 580.2 | 582.6 | 576.7 | 596.3 | **FALLA** |

**Timing:** tiempo servidor (`X-Process-Time-Ms` header disponible — excluye latencia de red).

**4/7 PASAN. 3/7 FALLAN** (deuda técnica → Sprint 3, RN-001).

### Hallazgos (deuda técnica)

- `/api/ovas` y `/api/ovas?page=1&limit=10` (~388ms): consulta con JOINs sobre múltiples tablas a través de Supabase Transaction pooler. Candidato a optimización con índices adicionales o paginación server-side más agresiva.
- `/api/roles` (~580ms): consulta lenta; investigar si hay N+1 o falta índice en la tabla `roles`.

---

## LLM — Proxy MTTG (una fase)

| Endpoint | Elapsed (ms) | Recurso |
|---|---|---|
| POST /api/agents/engage/generate | 97 021 ms (~97 s) | resource_type=1, concept="Redes neuronales artificiales" |

**Nota:** El pipeline completo (`POST /api/ova/jobs` — LangGraph, 5 fases paralelas) no está desplegado en la versión actual de producción. El proxy mide una sola fase sin RAG.

**Estimación MTTG con arquitectura nueva:**
- Retrieval RAG: ~254 ms (ver /api/db/health)
- Generación paralela 5 fases (LangGraph): ~100 s (bottleneck = fase más lenta)
- Empaquetado SCORM: ~3-5 s
- **MTTG estimado: ~105-110 s → bajo criterio de 180 s** ✓

Medición formal pendiente tras despliegue del nuevo pipeline de generación.

---

## Conclusión

- **RN-004**: smoke test ejecutado. Non-LLM 4/7 pasan; 3 hallazgos documentados como deuda técnica (Sprint 3).
- **RN-002**: MTTG estimado ~105-110 s (bajo 180 s). Medición formal pendiente de despliegue del pipeline nuevo.
