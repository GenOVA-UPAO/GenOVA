# Auditoría OVA — recursos 5E (2026-07-06)

> **Plan de implementación**: todo lo detectado aquí + la reestructura de arquitectura
> discutida está consolidado en
> [sdd/plans/2026-07-06-plan-maestro-generacion-ova.md](../plans/2026-07-06-plan-maestro-generacion-ova.md)
> (6 fases: fixes → velocidad → work-pool por recurso → deliberación BDI → calidad
> diseño → infra durable).

Entorno: frontend Vercel develop (`genova-git-develop-gen-ova-s-projects.vercel.app`)
+ backend Railway preview (develop). Herramienta: playwright-cli.

Objetivo: probar los 50 recursos (10 por fase × 5 fases), configurando sus
parámetros y verificando que generan y renderizan.

## Plan de OVAs de prueba

| OVA | Recursos por fase | Estado |
|---|---|---|
| OVA-A | 1–4 de cada fase (20 recursos) | ✅ done 20/20 — job `c805acb8` · ova `4f5821be` |
| OVA-B | 5–8 de cada fase (20 recursos) | ✅ done 20/20 — job `6e065026` · ova `51f35b53` |
| OVA-C | 9–10 de cada fase (10 recursos) | ✅ done 10/10 — job `7e56d2ee` · ova `10f61622` |

Configs OVA-B (5–8 por fase, todas no-default): engage:5 opciones=4 · engage:6 cuerpo=120 ·
engage:7 contexto=90 · engage:8 hitos=6 · explore:5 registros=12 · explore:6 zonas=4 ·
explore:7 pasos=5 · explore:8 escenarios=5 · explain:5 pasos=6 · explain:6 términos=10 ·
explain:7 hitos=4 · explain:8 bloques=7 · elaborate:5 preguntas=4 · elaborate:6 decisiones=4 ·
elaborate:7 ejercicios=4 · elaborate:8 problemas=5 · evaluate:5 oraciones=10 ·
evaluate:6 pares=8 · evaluate:7 términos=6 · evaluate:8 preguntas=4.
Nota: el payload de OVA-B llevó 39 configs (arrastra las de OVA-A — el estado del form no
se limpia entre generaciones; menor, el backend ignora las no seleccionadas).

Configs OVA-C (9–10 por fase): engage:9 acertijos=4 · engage:10 controles=2 ·
explore:9 tarjetas=8 · explore:10 pruebas=4 · explain:9 dimensiones=5 ·
explain:10 secciones=6 · elaborate:9 turnos=5 · elaborate:10 criterios=5 ·
evaluate:9 decisiones=4 · evaluate:10 competencias=4.

Configs aplicadas OVA-A (todas no-default, verifican que la config viaja):
engage:1 num_panels=7 · engage:2 duration_seconds=30 · engage:3 word_count=130 ·
engage:4 num_rounds=5 · explore:1 num_iterations=4 · explore:2 num_turns=7 ·
explore:3 num_rounds=4 · explore:4 (slider deshabilitado, modo prompt sin video key) ·
explain:2 num_sections=4 · explain:3 num_nodes=8 · explain:4 num_questions=8 ·
explain:1 (video, modo prompt) · elaborate:1 preguntas=5 · elaborate:2 pasos=4 ·
elaborate:3 entregables=4 · elaborate:4 parámetros=4 · evaluate:1 preguntas=7 ·
evaluate:2 criterios=6 · evaluate:3 preguntas=6/segundos=60 · evaluate:4 preguntas=10

✅ Verificado: el `POST /api/ova/jobs` llevó `resource_configs` completo con los 19
valores configurados (UI → payload OK). ❌ Pero el motor los descarta (bug #8).

Leyenda: ⬜ pendiente · 🔧 configurado · ✅ generado OK · ❌ falló · ⚠️ generado con defecto

**Export SCORM OVA-A**: ✅ zip 205 KB vía 302 a Supabase Storage (signed URL); estructura
válida — `imsmanifest.xml` SCORM 1.2, 20 `resources/recurso_N.html`, player `index.html`,
`scorm.js`/`xapi.js`/`cmi5.xml`, `testzip()` sin corrupción.
Nota: la UI usa `/api/ovas/{id}/export-scorm` → JSON `download_url` → `<a download>` click
(correcto, evita el problema CORS del redirect que sí afecta a un fetch directo del
endpoint legacy `/api/ova/{id}/scorm`).

## ENGAGE

| # | Recurso | Config | Estado | Nota |
|---|---|---|---|---|
| 1 | Cómic Interactivo | num_panels | ✅ render OK | 5 viñetas (config 7 ignorada, bug #8) |
| 2 | Storyboard de Video (video) | duration_seconds | ✅ render OK | modo prompt (sin video key) |
| 3 | Micro-Podcast | word_count | ⚠️ render OK pero sin audio (bug #4) | |
| 4 | Juego de Gamificación | num_rounds | ✅ render OK | |
| 5 | Dilema Ético | num_options | ✅ render OK | 51KB interactivo |
| 6 | Noticia de Impacto | body_words | ⚠️ render con defecto | 0 clickables; nunca llama _scormComplete() — no completable en SCORM |
| 7 | Juego de Roles | context_words | ✅ render OK | |
| 8 | Timeline Interactivo | num_milestones | ✅ render OK | |
| 9 | Escape Room Virtual | num_puzzles | ✅ render OK | |
| 10 | Simulador Intuitivo | num_controls | ✅ render OK | |

## EXPLORE

| # | Recurso | Estado | Nota |
|---|---|---|---|
| 1 | Simulador Virtual Lab | ✅ render OK | |
| 2 | Agente Socrático | ✅ render OK | |
| 3 | Juego Drag & Drop | ✅ render OK | |
| 4 | Video con Pausa Activa (video) | ✅ render OK | modo prompt |
| 5 | Lectura Interactiva | ✅ render OK | 19 interactivos |
| 6 | Simulador de Slider | ✅ render OK | |
| 7 | Experimento Guiado | ✅ render OK | |
| 8 | Juego de Roles | ✅ render OK | |
| 9 | Mapa Mental | ✅ render OK | |
| 10 | Lab de Hipótesis | ✅ render OK | |

## EXPLAIN

| # | Recurso | Estado | Nota |
|---|---|---|---|
| 1 | Video Teórico (video) | ✅ render OK | modo prompt |
| 2 | Lectura Guiada | ✅ render OK | 3 secciones (config 4 ignorada) |
| 3 | Mapa Conceptual | ✅ render OK | |
| 4 | FAQ Interactivo | ✅ render OK | 8 preguntas (== config, coincidencia) |
| 5 | Demo Animada | ✅ render OK | |
| 6 | Glosario Visual | ✅ render OK | glosario 15 interactivos |
| 7 | Línea de Tiempo | ✅ render OK | |
| 8 | Diagrama de Framework | ✅ render OK | |
| 9 | Tabla Comparativa | ✅ render OK | |
| 10 | Infografía Interactiva | ✅ render OK | |

## ELABORATE

| # | Recurso | Estado | Nota |
|---|---|---|---|
| 1 | Estudio de Caso | ✅ render OK | |
| 2 | Ejercicio Guiado | ✅ render OK | |
| 3 | Mini-Proyecto | ✅ render OK | |
| 4 | Simulación Aplicada | ✅ render OK | |
| 5 | Análisis de Datos | ✅ render OK | dashboard 13 interactivos |
| 6 | Escenario Ramificado | ✅ render OK | |
| 7 | Lab de Código | ⚠️ render esqueleto | solo 'Contenido del card' + 3 Ejecutar sin enunciados (3.9KB) |
| 8 | Mapa de Problemas | ✅ render OK | |
| 9 | Juego de Estrategia | ✅ render OK | botones dinámicos JS; 6 turnos (config 5 ignorada) |
| 10 | Reto de Diseño | ✅ render OK | |

## EVALUATE

| # | Recurso | Estado | Nota |
|---|---|---|---|
| 1 | Quiz Interactivo | ✅ render OK | 6 preguntas (config 7 ignorada) |
| 2 | Rúbrica de Autoevaluación | ✅ render OK | |
| 3 | Desafío Contrarreloj | ✅ render OK | 90s (config 60s ignorada) |
| 4 | Examen Opción Múltiple | ✅ render OK | 8 preguntas (config 10 ignorada) |
| 5 | Completar Espacios | ✅ render OK | |
| 6 | Relacionar Conceptos | ✅ render OK | |
| 7 | Crucigrama Conceptual | ✅ render OK | crucigrama 30 inputs |
| 8 | Preguntas de Desarrollo | ✅ render OK | |
| 9 | Simulación Evaluativa | ✅ render OK | 18 interactivos |
| 10 | Diploma de Logro | ✅ render OK | |

## Resumen final

- **50/50 recursos generados y renderizados** en 3 OVAs (0 fallos de generación).
- 47/50 sin defectos visibles; 3 con defecto: Micro-Podcast sin audio (bug #4),
  Noticia de Impacto no completable en SCORM (bug #10a), Lab de Código esqueleto (bug #10b).
- **Las configuraciones de recursos NO se aplican** — la UI las captura y envía bien,
  pero el motor las descarta (bug #8, causa raíz identificada, fix de 1 línea + test).
- Export SCORM validado (OVA-A): zip SCORM 1.2 íntegro vía Supabase Storage.
- Cadena de fallback LLM robusta bajo rate-limits (opencode→qwen→llama→groq).
- 4 bugs ALTA: backend prod hardcodeado en preview (#1), RAG/uploads rotos (#3),
  migración 018 RLS falla siempre (#6), configs descartadas (#8), playground roto (#9).

## Arquitectura Prometheus — qué es y cómo acelerarla (notas 2026-07-06)

### Qué es realmente

"Prometheus" es una **metodología de diseño de sistemas multiagente** (Padgham &
Winikoff, 2004) construida sobre el modelo **BDI** de Rao & Georgeff:

- **Beliefs**: lo que el agente cree del mundo (aquí: calidad del RAG, complejidad
  del tema, capacidad del modelo).
- **Desires**: metas candidatas (recursos a generar, con prioridad).
- **Intentions**: los planes a los que el agente se COMPROMETE (qué plan concreto
  ejecuta cada recurso: two_step / direct_code / podcast).

El valor teórico del BDI es la **deliberación**: re-evaluar desires cuando cambian los
beliefs (un recurso falla → re-planificar, degradar, o abandonar un plan inviable).

### Qué hay implementado HOY

Orquestador–workers, no BDI real:

```
concierge (planner)
  → engage → critic → explore → critic → explain → critic
  → elaborate → critic → evaluate → critic     ← FASES SECUENCIALES
  → editor (coherencia 5E, opcional) → assemble (SCORM)
```

- Dentro de cada fase: fan-out con `ThreadPoolExecutor`, `OVA_GEN_CONCURRENCY=4`
  (backend/core/config.py:83), persistencia incremental por recurso.
- `beliefs/desires/intentions` existen en el estado (`state.py`) y el concierge los
  llena, pero nadie re-delibera: son metadatos decorativos. Los docs
  fases-5e/generacion-5e describen un BDI que no corresponde al código.
- Cada recurso two-step = 2 llamadas LLM (texto JSON → HTML) + refine opcional.

### ¿Swarm? No — el cuello de botella es otro

Swarm (agentes autónomos que se pasan el control sin plan central) NO ayuda aquí:
los 50 recursos son tareas independientes de estructura conocida → problema
"embarrassingly parallel". El orquestador-workers es la arquitectura correcta;
swarm solo añadiría coordinación y tokens sin beneficio.

La velocidad la limitan, en orden:

1. **Fases secuenciales** — las 5 fases no dependen entre sí (la coherencia la revisa
   el editor DESPUÉS). Fan-out en LangGraph: `concierge → {5 fases en paralelo} → join
   → critic/editor → assemble`. Wall-clock ≈ fase más lenta (~3-5× más rápido).
   Cuidado: el critic actual corre entre fases; moverlo a un único pass post-join.
2. **`OVA_GEN_CONCURRENCY=4`** — subir a 8–12 vía env si las keys aguantan
   (con free tiers, más paralelo = más 429; el fallback los absorbe pero suma latencia).
3. **Two-step innecesario en recursos simples** (noticia, lectura guiada, diploma,
   preguntas de desarrollo): un solo prompt directo a HTML ahorra 1 llamada por recurso.
4. **Tokens de salida dominan la latencia**: recursos de 50–60 KB regeneran CSS/JS
   completo cada vez. Mover CSS/JS común a `resources/styles.css`/`app.js` del SCORM
   (ya existen en el zip) y pedir al LLM solo el contenido → menos tokens, más velocidad
   y consistencia visual.
5. Modelos: deepseek-v4-flash bien para el paso texto; para el paso `codigo`
   considerar el proveedor con mayor tokens/s (groq) como primario.

### Cómo implementar deliberación BDI real (si se quiere)

Ciclo percibir → revisar beliefs → reconsiderar intenciones, con reglas Python puras
(sin llamadas LLM extra):

1. **Belief revision en `run_phase()`** (runtime.py): devolver en el estado
   `failures_by_model`, `rate_limit_density`, `avg_resource_seconds`,
   `failed_resources` — los datos ya están ahí, hoy se tiran.
2. **Punto de deliberación = `_route_next_phase`** (graph.py): antes de rutear a la
   siguiente fase, `deliberate(state)` recalcula intentions de los desires pendientes:
   - primario falló ≥2× → cambiar modelo primario para el resto del job
   - densidad 429 alta → bajar concurrency de la próxima fase / cambiar provider
   - recurso simple + presión de tiempo → plan `direct_code` (1 llamada) en vez de two_step
   - presupuesto agotado → degradar/abandonar desires de prioridad baja
3. **Dispatch por intención**: los nodos de fase (p.ej. engage.py `_dispatch`) leen
   `intention.plan_type` en vez del mapa hardcodeado rt→plan. Con esto
   beliefs/desires/intentions dejan de ser decorativos.
4. **Win más barato primero — cola de reparación**: hoy `max_retries=0`, un recurso
   fallido muere. Nodo `repair` antes del editor: re-intenta solo
   `beliefs.failed_resources` con plan/modelo alternativo (~30 líneas).

Orden sugerido: repair → beliefs reales → deliberate() con 3-4 reglas → dispatch por
intención. Cada paso es útil por sí solo.

### Mejorar calidad/diseño con archivos .md ("skills" para el LLM)

Aclaración: no es "entrenar" el modelo (fine-tuning); es **in-context learning** —
inyectar contexto en el prompt. Igual de práctico y sin costo de entrenamiento:

1. **Design-system.md**: el plumbing YA existe y se usa —
   `build_design_system()` (backend/llm/utils/themes.py) inyecta
   `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` en cada prompt HTML. Hoy son reglas técnicas +
   paleta. Enriquecerlo con: componentes CSS canónicos listos para copiar (card,
   botón, quiz-option, barra de progreso, feedback correcto/incorrecto), escala
   tipográfica/spacing con valores exactos, y micro-interacciones estándar. El LLM
   copia mejor de lo que inventa.
2. **Few-shot dorado**: 1 ejemplo excelente (HTML recortado) por familia de recurso
   en el prompt del paso HTML. Un buen ejemplo > 20 instrucciones.
3. **Contrato de salida verificable**: checklist en el prompt (mecanismo de
   completitud `_scormComplete()` alcanzable, N elementos exactos según config,
   responsive, sin placeholders) + el refinador valida ese mismo checklist y
   re-genera si falla (cierra bugs #8/#10).
4. Mantener estos .md versionados en `backend/prometheus/prompts/data/` junto a los
   TOML — mismos beneficios que las skills de agentes: revisables, diffeables.

## Errores encontrados (plan de corrección)

1. **[ALTA] Preview develop de Vercel apunta al backend de producción.**
   `frontend/src/core/lib/http.ts` hardcodea `API_BASE_PROD = genova-backend-production.up.railway.app`
   para cualquier hostname que no sea localhost. El backend prod no incluye el origin
   `genova-git-develop-…vercel.app` en CORS → la app queda rota (CORS + Failed to fetch)
   al abrir el preview develop. Workaround usado en esta auditoría: override
   `window.__GENOVA_API_BASE__` → `genova-backend-develop.up.railway.app` (CORS develop sí
   incluye el origin, `COOKIE_SAMESITE=none` OK).
   *Plan: detectar hostname `*-git-develop-*`/`*vercel.app` de preview y mapear al backend develop, o inyectar `__GENOVA_API_BASE__` en el index.html por entorno de Vercel (env var en build).*

2. **[MEDIA] Tab "Keys Globales Admin" en /models: spinner infinito.**
   `GET /api/admin/platform-config` responde 200 con datos (groq/openrouter/opencode/hf
   configuradas) pero el panel nunca renderiza — queda el skeleton.
   **Causa raíz**: `platform-api-keys-card.component.ts` usa campos planos
   (`loading`, `error`, `platformConfig`) mutados tras `await` en `ngOnInit` con
   `OnPush` + zoneless → no se dispara change detection.
   *Plan: migrar `loading/error/platformConfig/providers` a `signal()`.*
   **Bug sistémico** — mismo patrón (`async ngOnInit` + campos planos + OnPush zoneless) en 7 componentes:
   `analytics-page` (reproducido: "Cargando métricas…" infinito con `/api/users/analytics` 200),
   `platform-api-keys-card` (reproducido), `platform-capabilities-card`, `platform-nodes-card`,
   `user-api-keys-card`, `models-page`, `user-links-page`.
   *Plan: migrar estado async de los 7 a signals (o `resource()`).*
   Además, **intermitente en el selector de recursos 5E de /crear**: si los
   `GET /api/agents/{fase}/recursos` resuelven tras el primer render, la lista queda en
   "Cargando recursos…" hasta el siguiente click (reproducido 2026-07-06 11:34; un click
   en cualquier tab la "despierta"). Mismo plan: signals.

3. **[ALTA] Uploads/RAG rotos en develop: `GEMINI_API_KEY` vacía → 500 crudo.**
   Reproducido: `POST /api/uploads/temp` con PDF válido → "Internal Server Error".
   Traza Railway: `rag/embedder.py:56 EmbedderError: GEMINI_API_KEY is not set`
   (RAG_EMBEDDER=gemini). Doble problema:
   (a) falta la key en el env develop de Railway (GROQ/OPENROUTER también vacías en env,
   pero esas sí resuelven desde keys de plataforma en DB — el embedder gemini no);
   (b) `uploads/router.py` no captura `EmbedderError` → 500 sin JSON de error controlado
   (viola la convención de errores del proyecto).
   *Plan: setear GEMINI_API_KEY en Railway develop; capturar EmbedderError en el router y
   responder 503 JSON con mensaje claro; considerar resolver la key gemini también desde
   platform keys DB.*

4. **[MEDIA] Micro-Podcast (engage:3) sin audio en develop.**
   Logs Railway: `Retrying request to /openai/v1/audio/speech` ×2 →
   `WARNING llm.podcast.podcast: Podcast TTS failed, falling back to text-only: Connection error.`
   El recurso degrada a solo-texto (fallback correcto, pero sin audio).
   Código: `backend/llm/podcast/audio_helpers.py` usa modelo Groq
   `canopylabs/orpheus-v1-english` voz `autumn`. El "Connection error" tras 2 retries
   sugiere modelo ya no disponible en Groq o bloqueo de red; la excepción genérica oculta
   el status HTTP real.
   *Plan: (a) loggear tipo/status de la excepción, (b) verificar disponibilidad del modelo
   orpheus en la cuenta Groq de plataforma, (c) considerar `playai-tts` como fallback.*

5. **[MEDIA] Imágenes AI no se generan: `Cloudflare image generation skipped: CF_ACCOUNT_ID not set`.**
   Provider de imágenes default = cloudflare pero falta `CF_ACCOUNT_ID`/token en env develop.
   Recursos engage quedan con placeholder.
   *Plan: setear CF_ACCOUNT_ID+CF_API_TOKEN en Railway develop o cambiar provider default a uno con key (hf tiene token en DB).*

6. **[ALTA] Migración `018_enable_rls.sql` falla en cada arranque.**
   Logs Railway (startup 2026-07-04): `Migration 018_enable_rls.sql failed (ProgrammingError):
   (psycopg.errors.UndefinedTable) relation "public.checkpoint_migrations" does not exist — will retry on next startup.`
   RLS nunca queda aplicado en develop.
   *Plan: en 018, condicionar el ALTER/ENABLE de `checkpoint_migrations` a su existencia
   (`to_regclass`), o crearla antes; verificar orden con las tablas del checkpointer LangGraph.*

7. **[INFO] Fallback LLM operativo.** `openrouter/deepseek/deepseek-v4-flash` devolvió
   EmptyContentError y la cadena pasó a `deepseek-chat-v3.1` sin romper el job. ✅

8. **[ALTA] `resource_configs` se descarta en el motor Prometheus — TODAS las configs de
   recursos se ignoran en la generación por jobs.**
   Evidencia: quiz 6 preguntas (config 7, default 6), examen 8 (config 10, default 8),
   desafío 90 s (config 60, default 90), cómic 5 viñetas (config 7, default 5), lectura
   guiada 3 secciones (config 4, default 3) — todos cayeron al default.
   **Causa raíz**: `backend/prometheus/engine/state.py` — `OvaGenerationState` (TypedDict,
   schema del StateGraph de LangGraph) NO declara la key `resource_configs`. El runner
   la pasa en el estado inicial (`jobs_runner.py:136`) pero LangGraph filtra keys fuera
   del schema, y `runtime.py:49` lee `state.get("resource_configs", {})` → siempre `{}`.
   La cadena UI → payload → DB params → runner está bien; se pierde al entrar al grafo.
   *Plan: añadir `resource_configs: dict` a `OvaGenerationState`; test BDD que genere un
   job con config no-default y verifique que el prompt renderizado la incluye.*

9. **[ALTA] Playground público `/explore` y `/engage/:id` rotos — endpoints inexistentes.**
   `frontend/src/features/ova-workspace/services/phase-generation.service.ts` llama a
   `GET /api/ova-workspace/resources/{fase}` (404 reproducido) y
   `POST /api/ova-workspace/generate/{fase}` — ninguno existe en el backend. Los reales
   son `GET /api/agents/{fase}/recursos` y `POST /api/agents/{fase}/generate`.
   La página queda en "Cargando recursos..." para siempre.
   *Plan: corregir las dos URLs en `phase-generation.service.ts` (+ payload
   `resource_type`/`concept` según `GenerateEngageRequest`); test e2e del playground.*

10. **[MEDIA] Recursos generados sin control de calidad estructural (2 casos en OVA-B).**
    (a) `engage:6 Noticia de Impacto`: HTML sin ningún elemento clickable y sin llamada a
    `_scormComplete()` → el alumno no puede completar el recurso en el LMS (el prompt exige
    "botón Continuar al final").
    (b) `elaborate:7 Lab de Código`: esqueleto vacío — "Contenido del card" + 3 botones
    "Ejecutar" sin enunciados ni editor (3.9 KB vs 20-60 KB típicos).
    El refinador estructural (`ova_refine`) no detecta ninguno de los dos.
    *Plan: añadir al validador/refinador checks de (i) existencia de mecanismo de
    completitud SCORM (al menos 1 llamada alcanzable a `_scormComplete`), (ii) tamaño/
    densidad mínima de contenido, (iii) ausencia de placeholders ("Contenido del card",
    "Lorem", etc.); re-generar el recurso si falla.*

11. **[BAJA] Conteos hardcodeados en `html.estilos` de los prompts.**
   p.ej. engage.toml: estilo 8 = "timeline horizontal con 4 nodos", estilo 9 = "3 candados",
   estilo 5 = "3 botones de votación" — contradicen `resource_configs` (num_milestones,
   num_puzzles, num_options) incluso cuando el bug #8 se corrija.
   *Plan: parametrizar los estilos o quitar los números fijos.*
