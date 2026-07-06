# Plan maestro — mejora integral de generación de OVAs

Fecha: 2026-07-06 · Origen: auditoría [2026-07-06-ova-recursos-audit.md](../audits/2026-07-06-ova-recursos-audit.md)
+ discusión de arquitectura (Prometheus/BDI, velocidad, calidad de diseño).
Alcance: TODO lo detectado y discutido. Objetivo doble: **OVAs mejores** (diseño,
config respetada, calidad estructural) y **más rápidos** (~30 min → objetivo 8-10 min).

Estimaciones: S = horas, M = 1-2 días, L = 3-5 días.

---

## Fase 0 — Fixes críticos de la auditoría (desbloquean todo lo demás)

> **Estado: ✅ IMPLEMENTADA 2026-07-06** (verify -Quick PASA, ngc verde, test
> `test_resource_configs_state.py` 2/2). Pendiente de commit + verificación en deploy.
> Acciones de entorno que quedan para el usuario: `GEMINI_API_KEY` en Railway develop
> (0.3) y `CF_ACCOUNT_ID`/`CF_AI_API_KEY` si se quiere cloudflare como primario (0.8 —
> mientras tanto hay fallback automático a huggingface con key de plataforma).
> Nota 0.4: las tablas `checkpoint_*` que LangGraph cree DESPUÉS del arranque quedarán
> sin RLS hasta el siguiente re-run de una migración equivalente.
> Nota 0.7: orpheus sigue vigente en Groq (snippet del usuario funciona) — el fix
> loggea la causa real y cae a `playai-tts` como segundo intento.
> BU-003 documentado en `sdd/bugs/BU-003_zoneless-onpush-estado-async-sin-signals.md`.

Los 11 hallazgos del audit, ordenados por impacto:

| # | Fix | Ref audit | Tamaño | Archivos clave |
|---|---|---|---|---|
| 0.1 | `resource_configs` en `OvaGenerationState` + test BDD que verifique config→prompt | bug #8 | S | `prometheus/engine/state.py` |
| 0.2 | Corregir URLs playground: `/api/ova-workspace/*` → `/api/agents/{fase}/*` | bug #9 | S | `phase-generation.service.ts` |
| 0.3 | `GEMINI_API_KEY` en Railway develop + capturar `EmbedderError` → 503 JSON; opcional: resolver gemini desde platform keys DB | bug #3 | S | `uploads/router.py`, `rag/embedder.py`, env Railway |
| 0.4 | Migración 018 RLS: condicionar `checkpoint_migrations` a existencia (`to_regclass`) | bug #6 | S | `migrations/018_enable_rls.sql` |
| 0.5 | API base por entorno: preview develop → backend develop (env de Vercel o detección hostname) | bug #1 | S | `core/lib/http.ts`, Vercel env |
| 0.6 | Migrar 7 componentes zoneless a signals (+ selector de recursos de /crear) | bug #2 | M | `analytics-page`, `platform-*-card`, `user-api-keys-card`, `models-page`, `user-links-page`, phase-select |
| 0.7 | TTS podcast: loggear excepción real, verificar modelo orpheus en Groq, fallback `playai-tts` | bug #4 | S | `llm/podcast/audio_helpers.py` |
| 0.8 | Imágenes: `CF_ACCOUNT_ID`/token en env o provider default con key (hf) | bug #5 | S | env Railway, `llm/images/image_providers.py` |
| 0.9 | Quitar conteos hardcodeados de `html.estilos` (parametrizar) | bug #11 | S | `prometheus/prompts/data/*.toml` |
| 0.10 | Limpiar `resource_configs` residuales del form entre generaciones | audit nota | S | `phase-select.service.ts` |

El bug #10 (calidad estructural) NO se arregla aquí — se resuelve bien en Fase 2 (validate
por recurso). Parche provisional si urge: checks en `validate_and_repair`.

**Criterio de éxito Fase 0**: regenerar OVA de prueba con configs no-default y verificar
conteos exactos; playground /explore genera un recurso; upload PDF responde 200 o 503 JSON.

---

## Fase 1 — Velocidad: quick wins (sin tocar la arquitectura)

| # | Cambio | Impacto | Tamaño |
|---|---|---|---|
| 1.1 | **Cola de reparación**: nodo `repair` antes del editor; re-intenta `failed_resources` con plan/modelo alternativo (hoy `max_retries=0` → recurso muere) | OVAs completos siempre | S-M |
| 1.2 | **CSS/JS compartido**: mover base común a `resources/styles.css`/`app.js` del SCORM; el LLM genera solo contenido (~50-60 KB → ~10-15 KB por recurso) | ~2-3× menos tokens salida = más rápido + diseño consistente | M |
| 1.3 | **Single-step para recursos simples** (noticia, lectura guiada, diploma, preguntas desarrollo): prompt directo a HTML, ahorra 1 llamada LLM | -50% llamadas en esos tipos | S |
| 1.4 | `OVA_GEN_CONCURRENCY` 4 → 8-12 (env; medir 429s antes/después) | paralelismo intra-fase | S |
| 1.5 | Groq como primario del task `codigo` (mayor tokens/s) — medir | latencia paso HTML | S |

**Criterio de éxito**: OVA de 20 recursos < 15 min con 0 recursos perdidos.

---

## Fase 2 — Reestructura del motor: work-pool + pipeline por recurso

Decisión de arquitectura (discutida y aceptada): mantener familia orquestador-workers,
eliminar la granularidad por lotes. Swarm/blackboard/HTN descartados — descomposición
conocida de antemano, unidades independientes, única dependencia transversal (coherencia
5E) ya se resuelve al final.

```
ANTES (lotes con barreras):
concierge → [engage×4] barrera → critic → [explore×4] barrera → … → editor → assemble

DESPUÉS (work-pool):
concierge → scheduler global (pool N slots, sin fases)
              recurso: texto → html → refine → validate ─falla→ reintento degradado
                                                        └pasa→ persist (streaming UI)
            join → critic+editor (pass global único) → assemble
```

Tareas:

| # | Tarea | Tamaño |
|---|---|---|
| 2.1 | Scheduler global con LangGraph Send API (map por recurso, sin nodos de fase) | L |
| 2.2 | Pipeline por recurso: encadenar texto→html→refine→**validate** como unidad | M |
| 2.3 | `validate` por recurso (evaluator-optimizer): checklist estructural — `_scormComplete()` alcanzable, N elementos == config, sin placeholders ("Contenido del card"), tamaño mínimo, responsive. Falla → regenerar con feedback (máx 2) | M — **cierra bug #10** |
| 2.4 | Critic pedagógico + editor 5E como pass global post-join (hoy critic corre entre fases) | M |
| 2.5 | Progreso UI: adaptar streaming (ya es per-resource persist, cambio menor) | S |

**Criterio de éxito**: wall-clock ≈ recurso más lento + pass final (~3-5× mejora);
0 recursos con defectos estructurales tipo Noticia/Lab de Código.

---

## Fase 3 — Deliberación BDI real (Prometheus dejando de ser decorativo)

Contexto: beliefs/desires/intentions existen en `state.py` pero nadie los re-evalúa.
Con el scheduler de Fase 2, la deliberación tiene un punto natural. Reglas Python puras,
sin llamadas LLM extra.

| # | Tarea | Tamaño |
|---|---|---|
| 3.1 | Belief revision: el scheduler acumula `failures_by_model`, `rate_limit_density`, `avg_resource_seconds`, `failed_resources` | S |
| 3.2 | `deliberate()` antes de despachar cada slot: primario falló ≥2× → cambiar modelo del job; 429 denso → bajar ritmo/cambiar provider; presión de tiempo → plan `direct_code` en simples; presupuesto agotado → degradar desires prioridad baja | M |
| 3.3 | Dispatch por intención: workers leen `intention.plan_type` (no mapa hardcodeado rt→plan) | S |
| 3.4 | Actualizar docs `fases-5e`/`generacion-5e` (hoy describen un BDI que no existe — quedarán correctos tras esta fase) | S |

**Criterio de éxito**: job con modelo primario caído termina completo vía deliberación
(sin intervención); log muestra decisiones tomadas.

---

## Fase 4 — Calidad de diseño ("skills" .md para el LLM)

Aclaración de concepto: no es fine-tuning de deepseek-v4-flash; es in-context learning.
El plumbing existe: `build_design_system()` ya inyecta `[SISTEMA_DE_DISEÑO_OBLIGATORIO]`.

| # | Tarea | Tamaño |
|---|---|---|
| 4.1 | Enriquecer design-system: componentes CSS canónicos listos para copiar (card, botón, quiz-option, feedback correcto/incorrecto, barra progreso), escala tipográfica/spacing exacta, micro-interacciones estándar. Coordinar con 1.2 (los componentes viven en el styles.css compartido; el prompt referencia clases, no las regenera) | M |
| 4.2 | Few-shot dorado: 1 ejemplo excelente de HTML (recortado) por familia de recurso, versionado en `prometheus/prompts/data/` junto a los TOML | M |
| 4.3 | Contrato de salida verificable en cada prompt HTML: mismo checklist que valida 2.3 (prompt y validador comparten fuente única) | S |
| 4.4 | Activar critic pedagógico por defecto (`ova_critic=1`, `reflection_rounds=1`) una vez que 2.4 lo haga barato (pass único) | S |

**Criterio de éxito**: puntuación del critic ↑; recursos visualmente consistentes entre
sí (mismo design system) en un OVA de prueba con 10 tipos distintos.

---

## Fase 5 — Infraestructura durable (cuando haya usuarios reales)

Hoy el job vive en ThreadPool del proceso uvicorn: restart de Railway a mitad de job =
job muerto (histórico: bugs de heartbeat/reload-kill). Los recursos ya persisten
incrementalmente y existe `checkpointer.py` — 70% del camino.

| # | Tarea | Tamaño |
|---|---|---|
| 5.1 | Cola durable de jobs: tabla Postgres (o Redis) + worker separado del proceso HTTP | L |
| 5.2 | Resume: al arrancar el worker, retomar jobs `running` desde el último recurso persistido (checkpointer LangGraph) | M |
| 5.3 | Escalado horizontal de workers en Railway (réplica del servicio worker) | S |

**Criterio de éxito**: matar el worker a mitad de job → el job termina solo al reiniciar.

---

## Orden de ejecución y dependencias

```
Fase 0 (0.1 primero — 1 línea, desbloquea probar configs)
  → Fase 1 (1.1 repair y 1.2 CSS compartido primero)
    → Fase 2 (reestructura; 2.3 validate absorbe bug #10)
      → Fase 3 (deliberación necesita el scheduler de F2)
      → Fase 4 (4.1 depende de 1.2; 4.4 depende de 2.4)
        → Fase 5 (independiente; puede adelantarse si hay restarts frecuentes)
```

Sugerencia de sprint: Fase 0 completa + 1.1/1.2 = primer sprint; medir; luego F2.

## Estado de implementación (2026-07-06, fin de sesión)

| Fase | Estado | Evidencia |
|---|---|---|
| F0 fixes auditoría | ✅ 10/10 + BU-004/BU-005 extra | verify PASA; configs verificadas en deploy (desafío 5 preguntas/45s exactos) |
| F1 velocidad | ✅ 5/5 (F1.5 groq gpt-oss-120b revertido: APIStatusError) | benchmark 20 recursos: **7:53** vs ~30 min pre-F1 |
| F2 work-pool | ✅ 5/5 | `OVA_ENGINE=workpool` en develop; benchmark v3 **6:21**, 20/20, validate activo |
| F3 deliberación BDI | ✅ 4/4 | plan_map fuente única, dispatch por intención, señales→beliefs, repair deliberado; docs actualizados |
| F4 calidad | ✅ 4/4 | base css inyectada, esqueleto dorado, contrato de salida, critic ON (rounds=1) |
| F5 infra durable | ✅ 3/3 | Redis + worker arq "GenOVA Worker Develop" (Dockerfile.worker) + resume_orphans; benchmark v3 corrió por la vía durable |

Benchmark (20 recursos, mismos tipos):
- Pre-plan (motor phases, conc 4, two-step total): **~30 min** (OVA-A auditoría)
- Post-F1 (single-step + conc 8 + inyección css): **7:53**
- Post-F2/F5 (workpool + validate + cola arq): **6:21**, 0 fallos, 0 defectos bloqueantes

Pendientes menores anotados:
- Falso positivo del check "contenido escaso" en recursos JS-driven (cómic) — solo warning.
- `GEMINI_API_KEY` y `CF_*` deben reponerse en el servicio recreado (incidente Railway,
  ver memoria genova-railway-develop-gotchas).
- Réplicas del worker: subir numReplicas desde dashboard cuando haga falta (arq es
  multi-worker safe).
- Few-shot POR FAMILIA (F4.2 se implementó como esqueleto dorado común) — iterar con
  el critic activo.

## Métricas a trackear (antes/después de cada fase)

- Wall-clock por OVA de 20 recursos (hoy: ~30 min)
- Tokens de salida por recurso (hoy: ~50-60 KB HTML)
- % recursos fallidos/perdidos por job (hoy: mueren sin retry)
- % recursos que cumplen config exacta (hoy: 0% — bug #8)
- % recursos con defecto estructural (hoy: 2/50 en la auditoría)
