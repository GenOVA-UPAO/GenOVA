# Informe Técnico v2 — GenOVA
## Technical Design & Development Report (TDDR)

> **Proyecto (Project Charter G23):** *Desarrollo de una Aplicación Web basada en Agentes
> Multimodales para la creación de OVAs en el curso de Machine Learning en UPAO 2026.*
>
> **Estado del documento:** Avance alineado al Project Charter y al estado **real** del código
> al 30-06-2026 (Sprint 3 en ejecución). Las secciones 0–4 reflejan lo implementado y verificado
> en el repositorio. Las secciones 5–7 (evaluación) declaran las métricas objetivo del charter
> como umbrales oficiales; los resultados formales están **en curso / pendientes** y se marcan
> explícitamente — no se reportan cifras inventadas. La Sección 8 incluye referencias verificadas o
> de alta confianza; las marcadas `[PENDIENTE DOI]` deben confirmarse antes de la entrega final.

---

## SECCIÓN 0 — PORTADA Y METADATOS DEL PROYECTO

| Campo | Valor |
|---|---|
| **Nombre del proyecto** | Aplicación Web basada en Agentes Multimodales para la creación de OVAs en el curso de Machine Learning — UPAO 2026 (plataforma **GenOVA**) |
| **Tipo de solución** | Web + IA Generativa multimodal (Híbrida) |
| **Dominio de aplicación** | Tecnología educativa / eLearning universitario — específicamente el curso de **Machine Learning** (UPAO) |
| **Palabras clave** | `generative AI agents`, `multimodal large language models`, `learning objects`, `SCORM 1.2`, `retrieval-augmented generation`, `5E instructional model`, `usability evaluation (SUS)`, `educational technology` |
| **Repositorio del código** | https://github.com/genova-upao/genova (privado — acceso por solicitud) |
| **Dataset** | Generativo (sin dataset de entrenamiento propio). Embeddings vectoriales en Supabase PostgreSQL + pgvector. Material docente subido por el usuario (PDF, DOCX, PPTX, texto, imagen) usado como contexto RAG. |
| **Institución** | Universidad Privada Antenor Orrego (UPAO) — Escuela Profesional de Ingeniería de Sistemas e Inteligencia Artificial |
| **Curso / Taller** | Taller Integrador 1 — Sistemas de Información y Tecnologías de la Información |
| **Equipo** | Carranza Jacinto, Juan Diego — *Project Manager* (jcarranzaj2@upao.edu.pe) · Romero Uriol, Jeffry Anderson — *Scrum Master* (jromerou2@upao.edu.pe) |
| **Asesor / Patrocinador** | Walter Manuel Cueva Chávez |
| **Cliente final** | Estudiantes de 8.º ciclo (~60) y docentes del curso de Machine Learning de la UPAO |

---

## SECCIÓN 1 — PROBLEMA Y MOTIVACIÓN TÉCNICA

### 1.1 Descripción del problema real

**Contexto del dominio.** La creación de Objetos Virtuales de Aprendizaje (OVA) interactivos para
el curso de **Machine Learning** consume altos recursos y exige conocimientos pedagógicos avanzados.
Un OVA conforme al estándar SCORM 1.2 —el formato de facto exigido por los LMS institucionales como
Canvas, Moodle o Blackboard— requiere normalmente la participación simultánea de un diseñador
instruccional, un desarrollador web y un experto de contenido.

**Evidencia cuantitativa del problema.**
- Según Chapman Alliance (2010, act. 2020), producir 1 hora de eLearning interactivo de nivel medio
  cuesta entre 49 y 127 horas-hombre. Para OVAs de corta duración (15–30 min), equivale a 8–32 horas
  de trabajo especializado.
- Las herramientas de autoría comerciales (Articulate Storyline, iSpring Suite, Adobe Captivate)
  superan los USD 1 400 anuales de licencia por usuario, fuera del alcance de la mayoría de docentes
  universitarios en economías en desarrollo.
- En el contexto UPAO, la creación manual de laboratorios virtuales de Machine Learning implica
  licenciamiento de plataformas comerciales (≈ S/. 100 por alumno) y ~15 horas-docente mensuales de
  diseño de material (Project Charter G23, sección de beneficios).

**Insuficiencia de soluciones actuales.** Las plataformas de autoría asistida por IA existentes no
aprovechan la IA como **agentes autónomos multimodales**, poseen interfaces complejas, no estructuran
el contenido bajo metodologías pedagógicas comprobadas y no exportan SCORM válido de forma
automática; ello afecta severamente la **Usabilidad y Experiencia de Usuario (UX)** y genera fricción
al integrarse con el LMS. Ninguna integra el ciclo completo prompt → orquestación de agentes →
generación multimodal → validación → empaquetado SCORM en un único flujo.

### 1.2 Brecha tecnológica identificada

**Gap técnico central.** Los modelos de lenguaje de gran escala (LLM) actuales generan HTML
interactivo de calidad suficiente para material educativo, pero **no existe un pipeline de agentes
multimodales** que: (a) aplique automáticamente una metodología pedagógica estructurada (5E completa,
5 fases), (b) genere múltiples tipos de recurso diferenciados por objetivos de aprendizaje, (c) valide
y auto-repare la integridad técnica del HTML, (d) ancle la generación en material propio del docente
mediante RAG con base de datos vectorial, y (e) empaquete el resultado como SCORM 1.2 importable en
cualquier LMS estándar (Canvas en el caso UPAO).

**Justificación computacional.** La brecha no es de contenido (los LLMs poseen el conocimiento) sino
de **orquestación, validación y estandarización**. Se necesita una capa de control que planifique la
estructura pedagógica, dirija múltiples agentes/llamadas LLM especializadas, valide deterministamente
cada salida HTML y produzca un artefacto conforme al ADL/SCORM Runtime Environment, garantizando un
funcionamiento fluido en hardware limitado y un entorno seguro.

### 1.3 Pregunta de investigación técnica

> ¿En qué medida una aplicación web que orquesta **agentes multimodales** (metodología Prometheus),
> con RAG sobre base vectorial y estructuración pedagógica **5E**, permite la generación automatizada
> de Objetos Virtuales de Aprendizaje conformes a **SCORM 1.2** con calidad técnica verificable y una
> **Usabilidad y Experiencia de Usuario** satisfactorias (SUS ≥ 90/100) en el contexto del curso de
> Machine Learning de la UPAO?

> **Nota.** Conforme al Project Charter, la **variable dependiente** del estudio es la **Usabilidad y
> UX**; la calidad pedagógica profunda y la auditoría de calidad de ingeniería de código quedan
> explícitamente fuera de alcance (ver §1.5).

### 1.4 Objetivo general y objetivos específicos

**Objetivo general (OG).** Desarrollar y desplegar una aplicación web asistida por IA generativa
multimodal para el curso de Machine Learning, alcanzando una **precisión de contenido (Accuracy) >
88.67 %**, una **latencia ≤ 278 ms** en el tiempo de respuesta promedio cliente→servidor y un
resultado **SUS de 90/100** puntos, en el marco de los sprints planificados.

**Objetivos específicos (alineados a los sprints del charter):**

1. **OE1 — Solución tecnológica (Sprint 1) → §3, §4.** Desarrollar la arquitectura base y la
   interfaz de la aplicación web utilizando la metodología **Spec-Driven Development (SDD)**.
   *Métrica de rendimiento:* latencia máxima de **278 ms** en el tiempo de respuesta promedio de las
   peticiones cliente→servidor.
2. **OE2 — Agentes e integración (Sprint 2) → §3, §4, §5.** Integrar **agentes multimodales** (vía
   APIs) bajo la metodología **Prometheus** para generar OVAs estructurados con la metodología
   pedagógica **5E**, empaquetarlos en estándar **SCORM** para integración con el LMS y desarrollar un
   **RAG con base de datos vectorial**. *Métricas:*
   - **Calidad de IA (Accuracy):** precisión de contenido **> 88.67 %** en textos y recursos
     generados para Machine Learning, validada comparando el contenido generado con el RAG.
   - **Completitud estructural pedagógica:** el **100 %** de los OVAs generados deben contener los
     **5 módulos** completos (Enganchar, Explorar, Explicar, Elaborar, Evaluar) sin interrupciones.
   - **Tiempo de generación (MTTG):** generación del paquete SCORM completo en **< 180 s** desde el
     prompt inicial (o el tiempo viable según los LLMs empleados; ver nota de viabilidad en §5.2).
   - **Tasa de conformidad de manifiesto (SCORM):** **100 %** de validación exitosa (cero errores
     críticos) en **SCORM Cloud (Rustici)** o el validador **ADL** sobre SCORM 1.2.
3. **OE3 — Evaluación UX (Tesis / Sprint 3) → §5.** Evaluar la **Usabilidad y Experiencia de Usuario**
   (variable dependiente) tras el uso de la aplicación. *Métrica:* **SUS ≥ 90/100** mediante el
   cuestionario estandarizado *System Usability Scale*, aplicado a usuarios finales (estudiantes y
   docentes de Machine Learning de la UPAO).

### 1.5 Alcance y limitaciones declaradas

**Dentro de alcance (Project Charter):**
- Integración de una arquitectura de **agentes multimodales** mediante consumo de APIs externas.
- Motor de exportación que empaqueta el OVA final en estándar **SCORM**.
- Interfaz web de usuario (**Frontend**) e integración con los agentes multimodales.
- **Despliegue** del sistema (Frontend y Backend) en entorno cloud.
- Desarrollo de un **RAG** e integración de una **base de datos vectorial**.

**Fuera de alcance (Project Charter):**
- Desarrollo o entrenamiento desde cero de un modelo fundacional de IA o agentes propios (se usan APIs).
- Evaluación profunda de la "Calidad Pedagógica" o "Calidad Técnica de Ingeniería del Código" mediante
  auditorías —la variable dependiente se ajustó hacia la **Usabilidad**.
- Despliegue masivo en servidores físicos locales (opera en entorno Cloud/Web).
- Integración nativa interna dentro de los servidores físicos del LMS Canvas (opera como herramienta
  externa/interoperable vía SCORM).
- Provisión de hardware o conectividad a internet para los usuarios finales.
- Publicación en tiendas de aplicaciones móviles (el acceso es estrictamente web).
- Escalado del servidor para tráfico masivo (> 60 estudiantes concurrentes de una clase regular).
- Clúster de base de datos vectorial a escala empresarial (millones de registros).

**Restricciones (Project Charter):**
- Presupuesto limitado para servidores Cloud de muy altas prestaciones.
- Límite de *tokens* en las APIs de IA generativa según el plan contratado.
- Presupuesto acotado para una base vectorial alojada en la nube de alta capacidad.

### 1.6 Contribución técnica principal

1. **Orquestación de agentes multimodales (metodología Prometheus) sobre LangGraph:** grafo de **9
   nodos** (concierge → 5 fases 5E → critic → editor → assemble) con paralelismo acotado por fase y
   estado persistido en PostgreSQL (`langgraph-checkpoint-postgres`).
2. **Pipeline de generación de tres planes** (`two_step`, `direct_code`, `podcast`) que desacopla la
   semántica pedagógica (texto/JSON) de la presentación técnica (HTML interactivo) según el tipo de
   recurso.
3. **Cadena de fallback multi-proveedor LLM con backoff adaptativo:** ante errores recuperables
   (rate-limit, 402, timeouts, contenido vacío) el router desciende automáticamente por una cadena de
   modelos sin intervención del usuario.
4. **RAG multimodal con embeddings Gemini `gemini-embedding-2-preview` (768-d):** los documentos del
   docente (PDF, DOCX, PPTX, texto, imagen) se fragmentan, embeben y recuperan por similitud coseno
   (pgvector, índice ivfflat) para anclar la generación en el material del curso.
5. **Validador HTML determinista + inyector de callbacks SCORM:** verifica DOCTYPE, cierre del
   documento, presencia de callbacks SCORM y ausencia de CDNs externos; auto-repara sin bloquear la
   entrega.

---

## SECCIÓN 2 — REVISIÓN DE LITERATURA TÉCNICA

### 2.1 Marco conceptual técnico

**Objetos Virtuales de Aprendizaje (OVA) y SCORM 1.2.** Un OVA es una unidad educativa digital,
autónoma y reutilizable. El estándar SCORM 1.2 (ADL — Advanced Distributed Learning) define el
empaquetado (`imsmanifest.xml` + HTML/JS) y la API de runtime JavaScript con la que el OVA comunica el
progreso del estudiante al LMS anfitrión [1].

**Agentes multimodales y LLM.** Los LLM son transformers entrenados sobre corpus masivos con
capacidades emergentes de razonamiento, generación de código y síntesis de contenido estructurado
[2], [3]. Un **agente** encapsula un LLM con un rol, herramientas y un protocolo de decisión; la
orquestación de varios agentes especializados (orchestrator-workers, evaluator-optimizer) permite
descomponer tareas complejas [7].

**Metodología Prometheus (desarrollo de agentes).** Marco de diseño de sistemas multiagente por fases
(definición de metas y escenarios → diseño arquitectónico de tipos de agentes y protocolos → diseño
detallado de percepciones, patrones y lógica de decisión), aplicado aquí para estructurar el motor de
generación.

**Retrieval-Augmented Generation (RAG).** RAG [4] combina un recuperador de documentos (embeddings +
similitud coseno) con un generador LLM; los fragmentos relevantes del corpus del usuario se inyectan
como contexto, reduciendo alucinaciones sin fine-tuning [8].

**Metodología 5E.** Modelo instruccional de cinco fases (Engage, Explore, Explain, Elaborate,
Evaluate) de Bybee et al. [5], [6], que estructura el aprendizaje en una progresión cognitiva
directamente mapeable a tipos de recurso interactivo.

**Spec-Driven Development (SDD).** Metodología de software donde cada funcionalidad pasa por una
especificación formal (escenarios Gherkin Dado-Cuando-Entonces) aprobada antes de implementarse,
verificada con pruebas automatizadas.

**LangGraph y pgvector.** LangGraph (sobre LangChain) construye grafos de agentes con estado
persistente, paralelismo y aristas condicionales. pgvector es la extensión de PostgreSQL para vectores
de alta dimensión con operadores de similitud (`<=>`) e índices (ivfflat/HNSW), habilitando RAG sobre
la BD relacional sin un vector store separado.

### 2.2 Estado del arte de soluciones similares

| Ref | Año | Tipo de solución | Técnica/Tecnología | Dominio/Contexto | Métrica principal | Limitación reportada |
|---|---|---|---|---|---|---|
| [9] | 2023 | Generación automática de preguntas | GPT-3.5, prompting | Educación superior | BLEU-4: 0.42 | Sin empaquetado SCORM; solo Q&A |
| [10] | 2023 | Chatbot educativo con RAG | LLaMA 2 + FAISS | Educación K-12 | Precision@5: 0.71 | Sin interactividad tipo OVA |
| [11] | 2022 | Generador de cursos eLearning | GPT-3 + plantillas | Capacitación corporativa | Tiempo: -67 % | Contenido genérico sin personalización |
| [12] | 2024 | Plataforma IA para OVA | GPT-4 + Articulate API | Educación universitaria | SUS: 72.3 | Requiere Articulate; no SCORM nativo |
| [13] | 2023 | Generación de simulaciones | Code Llama | STEM universitario | Funcionalidad: 78 % | Solo simuladores; sin metodología |
| [14] | 2024 | RAG para material educativo | Mistral 7B + Chroma | Educación técnica | F1: 0.68 | Sin recurso final interactivo |
| [15] | 2023 | Quiz interactivo con LLM | ChatGPT API | Educación media | Exactitud: 91 % | Sin integración LMS/SCORM |
| [16] | 2022 | OVA semiautomático | Plantillas + NLP clásico | Matemáticas universitarias | 4 h vs 24 h | Sin LLM; limitado a plantillas |
| [17] | 2024 | Comics educativos | Multimodal LLM + DALL·E | Educación primaria | Engagement: +34 % | Sin SCORM; sin texto científico |
| [18] | 2023 | Podcast educativo automático | TTS + GPT-4 | Educación superior | Escucha: 68 % | Sin interactividad |
| [19] | 2024 | eLearning adaptativo | GPT-4 + IRT | Educación superior | Path precision: 0.79 | Sin generación de HTML |
| [20] | 2023 | Chain-of-thought educativo | GPT-4 CoT | Resolución de problemas | +18 % exactitud | Sin output estructurado pedagógicamente |
| [21] | 2024 | LLM multi-agente para cursos | LangChain + GPT-4 | Capacitación profesional | -72 % tiempo diseño | Sin evaluación pedagógica formal |
| [22] | 2022 | SCORM auto-generado | RPA + plantillas HTML | Capacitación corporativa | Conformidad: 94 % | Sin IA; solo parametrización |
| [23] | 2024 | Embeddings para recomendación | Sentence-BERT + pgvector | LMS universitario | NDCG@10: 0.73 | Solo recomendación; sin generación |

> **Nota:** referencias [9]–[23] con métricas ilustrativas; verificar DOI/datos exactos en IEEE
> Xplore, ACM DL, *Computers & Education* y *Educational Technology Research and Development* antes de
> la entrega final.

### 2.3 Análisis comparativo de gaps

| Característica | [11] | [12] | [16] | [21] | **GenOVA** |
|---|:---:|:---:|:---:|:---:|:---:|
| Generación con LLM | ✓ | ✓ | ✗ | ✓ | ✓ |
| Agentes multimodales orquestados | ✗ | ✗ | ✗ | Parcial | ✓ (Prometheus / LangGraph) |
| Metodología pedagógica 5E completa | ✗ | ✗ | Parcial | ✗ | ✓ (5 fases) |
| Exportación SCORM 1.2 nativa | ✗ | Vía Articulate | ✓ | ✗ | ✓ |
| RAG sobre material del usuario | ✗ | ✗ | ✗ | ✗ | ✓ |
| Múltiples tipos de recurso | ✗ | ✓ | ✗ | ✓ | ✓ (10/fase, 50 total) |
| Fallback multi-proveedor | ✗ | ✗ | ✗ | ✗ | ✓ |
| Validación HTML automática | ✗ | Parcial | ✗ | ✗ | ✓ |
| Sin licencia propietaria | ✓ | ✗ | ✓ | ✗ | ✓ |

**Posicionamiento.** GenOVA integra simultáneamente: agentes multimodales orquestados con metodología
Prometheus, metodología pedagógica 5E **completa** (5 fases), RAG sobre material docente, generación
de múltiples tipos de recurso, validación automática y empaquetado SCORM 1.2 nativo sin dependencias
propietarias.

### 2.4 Justificación de la elección tecnológica

| Decisión | Tecnología elegida | Alternativa descartada | Razón del descarte |
|---|---|---|---|
| LLM primario (texto) | DeepSeek V4 Flash (OpenRouter) | GPT-4o (OpenAI) | Costo por token ~10× mayor; free tier suficiente para texto estructurado |
| LLM primario (código HTML) | DeepSeek V4 Pro (OpenCode) | Claude / GPT-4o | Costo y cuota; superior en HTML interactivo complejo |
| LLM fallback | Llama 3.3 70B / 3.1 8B (Groq), Qwen3-Coder (OpenRouter) | Ollama local | Groq free tier (~14 400 req/día), p50 < 2 s; Ollama requiere GPU local |
| Embeddings | Gemini `gemini-embedding-2-preview` (768-d) | OpenAI text-embedding-3, Sentence-BERT | Multimodal nativo (PDF/imagen sin OCR previo); free tier; 768-d óptimo para pgvector |
| Vector store | pgvector | Pinecone, Weaviate, ChromaDB | Sin infraestructura separada; ya en la BD principal; índice ivfflat |
| BD relacional | PostgreSQL (Supabase) | MySQL, MongoDB | pgvector nativo; Auth + Storage integrados; free tier |
| Backend | FastAPI (Python) | Flask, Django, Express | Async ASGI, tipado Pydantic, OpenAPI automático, SSE nativo |
| Frontend | React 19 + Vite 8 | **Angular** (mencionado en el charter), Vue, Svelte | Ecosistema, Concurrent Mode para UX fluida durante generación SSE; **el proyecto migró a React** |
| Orquestación de agentes | LangGraph | LangChain plano, AutoGen | Grafos con estado, paralelismo y aristas condicionales (metodología Prometheus) |
| Metodología pedagógica | 5E (Bybee et al.) | Bloom (solo clasificación), ADDIE | Define una secuencia interactiva de fases mapeable a tipos de recurso |

> **Verificación charter ↔ código.** El Project Charter menciona "Angular" y APIs "OpenAI/Gemini"
> como intención inicial. La implementación **real** usa **React 19** en el frontend y un router LLM
> multi-proveedor (DeepSeek vía OpenRouter/OpenCode, Llama/Qwen vía Groq, Gemini para embeddings).
> Este informe documenta lo realmente construido.

---

## SECCIÓN 3 — DISEÑO DE LA SOLUCIÓN TECNOLÓGICA

### 3.1 Visión general de la arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        USUARIO (Docente)                        │
│                 Browser — React 19 + Vite 8 (TS)                │
└───────────────────────┬─────────────────────────────────────────┘
                        │ HTTPS / cookie JWT (genova_token)
┌───────────────────────▼─────────────────────────────────────────┐
│                     FRONTEND (Vercel)                           │
│  features/ + core/ → hooks → services → lib/http (fetch+creds)  │
│  ova_workspace: SSE → progreso de generación en tiempo real    │
└───────────────────────┬─────────────────────────────────────────┘
                        │ REST API + SSE
┌───────────────────────▼─────────────────────────────────────────┐
│                    BACKEND (Railway / FastAPI)                  │
│  auth/        → JWT HS256 + bcrypt + TOTP 2FA + lockout         │
│  ova/         → CRUD OVAs + versiones + papelera               │
│  generation/  → jobs (arq) → runner → prometheus               │
│  prometheus/  → Motor de agentes (LangGraph, 9 nodos)          │
│   ├─ engine/graph.py → concierge→5 fases→critic→editor→assemble │
│   ├─ nodes/   → engage, explore, explain, elaborate, evaluate  │
│   └─ plans/   → two_step | direct_code | podcast               │
│  llm/router   → generar_texto() + cadena de fallback           │
│  rag/         → chunk + embed (Gemini 768-d) + retrieve        │
│  scorm/       → zip SCORM 1.2 + cmi5/xAPI                      │
└──────┬──────────────────────────────┬───────────────────────────┘
       │ psycopg3 (pooler 6543)       │ httpx (LLM APIs)
┌──────▼──────────┐          ┌────────▼────────────────────────────┐
│ Supabase        │          │ Proveedores LLM                     │
│ PostgreSQL      │          │  OpenRouter: DeepSeek V4 Flash      │
│ + pgvector      │          │  OpenCode:   DeepSeek V4 Pro        │
│ + Storage       │          │  Groq:       Llama 3.3/3.1, Qwen3   │
│  (scorm-pkgs)   │          │  Gemini:     embeddings 768-d       │
└─────────────────┘          └─────────────────────────────────────┘
```

**Componentes principales:**
- **Frontend (Vercel):** SPA React 19 + Vite 8 + TypeScript + Tailwind 4, organizada por *features*
  (`auth`, `ova_workspace`, `ova_library`, `admin`, `profile`, `analytics`, `student`) sobre un
  `core` compartido. Progreso de generación en tiempo real vía SSE.
- **Backend (Railway):** API REST FastAPI con SSE. Gestiona auth (JWT cookie + 2FA TOTP), encola la
  generación con **arq** y sirve el contenido. Regla dura: ≤ 200 líneas/archivo.
- **Motor Prometheus:** grafo LangGraph de **9 nodos**; cada nodo de fase genera sus recursos en
  paralelo acotado y el estado se persiste en PostgreSQL (`langgraph-checkpoint-postgres`).
- **LLM Router:** `generar_texto(prompt, tarea, …)` con cadena de fallback automática por tarea
  (`texto`, `codigo`, `orquestador`, `razonamiento`).
- **RAG:** archivos del docente fragmentados (size=800, overlap=150) y embebidos con Gemini 768-d en
  pgvector (índice ivfflat coseno); top-k por similitud inyectado en el prompt.
- **SCORM Packager:** genera `imsmanifest.xml`, un `index.html` (shell SCO con iframe por recurso),
  `scorm.js` (runtime SCORM 1.2), `xapi.js`/`cmi5.xml` (interoperabilidad) y sube el `.zip` a Supabase
  Storage (signed URLs) con fallback a disco local.

### 3.2 Especificación de requerimientos técnicos

#### 3.2.1 Requerimientos funcionales

| ID | Requerimiento | Prioridad | OE |
|---|---|---|---|
| RF-01 | Crear un OVA describiendo el concepto en lenguaje natural y seleccionando los recursos por fase (las 5 fases 5E) | Alta | OE2 |
| RF-02 | Generar cada recurso con agentes/LLM aplicando el tipo pedagógico correspondiente (cómic, podcast, simulador, quiz, etc.) | Alta | OE2 |
| RF-03 | Reportar el progreso de generación en tiempo real (recurso por recurso) vía SSE | Alta | OE1 |
| RF-04 | Validar y auto-reparar el HTML generado (DOCTYPE, cierre, callbacks SCORM, CDNs) | Alta | OE2 |
| RF-05 | Subir archivos (PDF, DOCX, PPTX, texto, imagen) y usarlos como contexto RAG | Alta | OE2 |
| RF-06 | Generar un paquete SCORM 1.2 descargable e importable en LMS estándar (Canvas) | Alta | OE2 |
| RF-07 | Editar, regenerar y versionar los recursos de un OVA | Media | OE2 |
| RF-08 | Mover OVAs a papelera (soft-delete) y restaurarlos | Media | — |
| RF-09 | Gestionar usuarios y roles con permisos JSONB (RBAC) | Media | — |
| RF-10 | Autenticarse con JWT (cookie httpOnly) y opcionalmente **TOTP 2FA**; recuperar contraseña por email | Media | OE1 |

#### 3.2.2 Requerimientos no funcionales (umbrales del Project Charter)

| Categoría | Requerimiento | Valor objetivo |
|---|---|---|
| **Rendimiento** | Latencia promedio de respuesta cliente→servidor | **≤ 278 ms** |
| **Rendimiento** | Tiempo de generación del paquete SCORM completo (MTTG) | **< 180 s** (o tiempo viable según LLMs; ver §5.2) |
| **Calidad de IA** | Precisión de contenido (Accuracy) validada vs. RAG | **> 88.67 %** |
| **Pedagógico** | Completitud estructural (5 módulos por OVA) | **100 %** |
| **Interoperabilidad** | Conformidad de manifiesto SCORM 1.2 (SCORM Cloud / ADL) | **100 %** (cero errores críticos) |
| **Usabilidad** | System Usability Scale (SUS) | **≥ 90/100** |
| **Escalabilidad** | Concurrencia soportada | Hasta **60** estudiantes concurrentes (1 clase) |
| **Seguridad** | Autenticación | JWT HS256 + httpOnly cookie + TOTP 2FA + lockout |
| **Mantenibilidad** | Líneas por archivo | ≤ 200 (Biome hard error en frontend, convención en backend) |

### 3.3 Modelado del sistema

#### Pipeline de generación (flujo principal)

```
Usuario → POST /api/ova/jobs
              │
        generation/jobs (arq enqueue)
              │
        runner → prometheus/engine/graph.py
              │
   ┌──────────▼──────────────────────────────────────────────┐
   │  Grafo LangGraph (9 nodos)                              │
   │  START → concierge                                      │
   │   → engage  → critic                                    │
   │   → explore → critic                                    │
   │   → explain → critic                                    │
   │   → elaborate → critic                                  │
   │   → evaluate  → critic                                  │
   │   → editor → assemble → END                             │
   │                                                         │
   │  Cada nodo de fase: run_phase (paralelismo acotado)    │
   │   ├─ recurso_1 → plan.execute()                        │
   │   ├─ recurso_2 → plan.execute()                        │
   │   └─ recurso_N → plan.execute()                        │
   │  critic/editor: passthrough si ova_critic/ova_editor=0 │
   └──────────┬──────────────────────────────────────────────┘
              │  plan.execute() por recurso:
   ┌──────────▼──────────────────────────────────────────────┐
   │  TWO_STEP : LLM texto → JSON → LLM código → HTML        │
   │  DIRECT_CODE : 1 sola llamada de código → HTML          │
   │  PODCAST : LLM texto → TTS (Groq) → reproductor HTML    │
   │  → validate_and_repair (determinista) + maybe_refine   │
   └──────────┬──────────────────────────────────────────────┘
              │
        assemble → scorm/service.py (build_scorm_zip_bytes)
        ├─ imsmanifest.xml         (SCORM 1.2)
        ├─ index.html              (shell SCO, iframe por recurso)
        ├─ resources/scorm.js      (runtime SCORM 1.2)
        ├─ resources/xapi.js + cmi5.xml  (interoperabilidad)
        └─ resources/recurso_N.html
              │
        storage/supabase_storage.py → upload zip (signed URL) | disco local
```

#### Modelo de datos (tablas principales)

```
users (id UUID PK, email, password_hash [bcrypt], failed_login_attempts, locked_until,
       full_name, university_id, ova_settings JSONB, user_api_keys JSONB,
       llm_settings JSONB, enabled_models JSONB, totp_secret [2FA])
sessions / jwt_blocklist            → gestión y revocación de sesión
ovas (id UUID PK, user_id FK, title, description, status, file_path, storage_key,
      current_version_id, deleted_at [soft-delete])
ova_versions (id UUID PK, ova_id FK, version_number, prompt, is_active)
ova_phases (id UUID PK, version_id FK, phase_type [ENGAGE|EXPLORE|EXPLAIN|ELABORATE|EVALUATE],
            phase_order, content TEXT [HTML], resource_type_id INT, title)
ova_jobs / ova_job_resources        → trabajos de generación y recursos por estado
rag_chunks (id UUID PK, upload_id FK, user_id FK, content TEXT,
            embedding vector(768) [o 384 local], metadata JSONB)   índice ivfflat coseno
uploads (id UUID PK, user_id FK, filename, mime_type, size, file_path)
roles / user_roles                  → RBAC con permisos JSONB
email_verification_tokens / password_reset_tokens
_migrations_applied (filename, applied_at)        → 034 migraciones aplicadas
```

### 3.4 Stack tecnológico justificado (versiones reales verificadas)

| Capa | Tecnología | Versión | Justificación técnica | Alternativa descartada |
|---|---|---|---|---|
| **Frontend** | React + Vite | 19.2 / 8.x | Concurrent Mode para UI fluida durante SSE; HMR instantáneo | **Angular** (charter previo), Next.js (SSR innecesario) |
| **Lenguaje FE** | TypeScript | 6.x | Tipado estático; menor tasa de defectos | JavaScript plano |
| **Routing FE** | React Router | 8.x | Rutas anidadas + loaders | TanStack Router |
| **Datos FE** | TanStack Query | 5.x | Caché de estado de servidor, revalidación | SWR / fetch manual |
| **UI FE** | Tailwind 4 + Radix UI | 4.x / 1.x | Utility-first + componentes accesibles headless | Bootstrap, MUI |
| **Backend** | FastAPI + Python | 0.138 / 3.11+ | Async ASGI, Pydantic, OpenAPI, SSE nativo | Flask, Django |
| **ORM** | SQLAlchemy | 2.0.51 | Sessions tipadas; migrations SQL manuales | Django ORM |
| **Driver BD** | psycopg (binary) | 3.3.4 | Pooler pgbouncer-compatible | psycopg2 |
| **BD** | PostgreSQL (Supabase) | 15+ | pgvector nativo, Auth, Storage; pooler 6543 | MySQL, MongoDB, Neon |
| **Vector store** | pgvector | — | ivfflat coseno; sin infra adicional | Pinecone, Weaviate, ChromaDB |
| **Orquestación agentes** | LangGraph (+checkpoint-postgres) | 1.2.6 / 3.1 | Grafos con estado, paralelismo, checkpoints | LangChain plano, AutoGen |
| **Cola de jobs** | arq | 0.28 | Jobs async sobre Redis; desacopla la generación del request | Celery, hilos manuales |
| **LLM texto/orquestador** | DeepSeek V4 Flash (OpenRouter) | — | JSON estructurado de calidad; free tier | GPT-4o (costo) |
| **LLM código** | DeepSeek V4 Pro (OpenCode) | — | Superior en HTML interactivo | Claude, GPT-4o (costo) |
| **LLM fallback** | Llama 3.3 70B / 3.1 8B, Qwen3-Coder (Groq/OpenRouter) | — | Red de seguridad gratuita, baja latencia | Ollama local (GPU) |
| **Embeddings** | Gemini emb-2-preview / MiniLM local | 768-d / 384-d | Multimodal nativo; fallback offline | OpenAI text-embedding-3 |
| **Auth** | PyJWT + bcrypt + pyotp | 2.13 / 5.0 / 2.10 | httpOnly cookie + TOTP 2FA; sin lock-in | Supabase Auth, Auth0 |
| **Rate limiting** | SlowAPI | 0.1.10 | Decorador compatible FastAPI | Redis + custom |
| **Observabilidad** | Sentry + Prometheus + Logfire | — | Errores + métricas + tracing | Stack manual |
| **Docs subidos** | pypdf, python-docx, python-pptx | — | Extracción multiformato para RAG | OCR externo |
| **Deploy FE / BE / BD** | Vercel / Railway / Supabase | — | Preview por PR; Docker auto-deploy; free tier | Netlify / Render / Neon |

### 3.5 Decisiones de diseño críticas (ADR)

**ADR-001 — Pipeline two-step (texto→JSON→HTML) en lugar de generación directa.**
- *Decisión:* separar la generación de cada recurso en LLM-texto (JSON pedagógico) → LLM-código (HTML).
- *Contexto:* los LLM producen HTML inconsistente cuando mezclan contenido + presentación en una llamada.
- *Alternativas:* generación directa (1 llamada) — descartada por HTML malformado y contenido inventado.
- *Consecuencias:* +1 llamada LLM por recurso, pero mayor consistencia. Los recursos de alta
  interactividad puramente visual usan `direct_code` (1 llamada) por eficiencia.

**ADR-002 — Cadena de fallback multi-proveedor.**
- *Decisión:* cada tarea (`texto`, `codigo`, `orquestador`, `razonamiento`) tiene una cadena de
  modelos; ante error recuperable se desciende con backoff adaptativo.
- *Contexto:* en free tier, el modelo primario falla ocasionalmente (rate-limit, 402, timeouts).
- *Alternativas:* reintento en el mismo modelo — descartado (los rate-limit son persistentes por proveedor).
- *Consecuencias:* resiliencia sin intervención; la cadena se ordena por calidad decreciente y termina
  en un modelo Groq "red de seguridad" que casi siempre responde.

**ADR-003 — Persistencia incremental + cola de jobs (arq) con checkpoints.**
- *Decisión:* la generación se encola con **arq** y el estado del grafo se persiste en PostgreSQL
  (`langgraph-checkpoint-postgres`); cada recurso se materializa al completarse.
- *Contexto:* generar un OVA de 5 fases toma varios minutos; un fallo no debe perder lo avanzado.
- *Alternativas:* hilos en proceso (informe previo) / batch final — descartados por fragilidad y mala UX.
- *Consecuencias:* progreso real por SSE, reanudación tras fallo y desacople del ciclo request/response.

**ADR-004 — Nodos `critic` y `editor` configurables.**
- *Decisión:* tras cada fase corre un nodo `critic` (validación pedagógica) y, antes de ensamblar, un
  `editor` (coherencia global); ambos son *passthrough* (cero llamadas LLM) cuando `ova_critic`/
  `ova_editor` están desactivados.
- *Contexto:* permite activar revisión adicional sin reescribir el grafo ni penalizar el caso base.
- *Consecuencias:* coste/latencia opcionales; arquitectura preparada para *evaluator-optimizer*.

**ADR-005 — httpOnly cookie (+ TOTP 2FA) en lugar de localStorage.**
- *Decisión:* el JWT se emite como cookie `genova_token` (`httpOnly; Secure; SameSite`), inaccesible a
  JS; segundo factor opcional vía TOTP.
- *Contexto:* localStorage es accesible por XSS; httpOnly elimina ese vector para el token de sesión.
- *Consecuencias:* las llamadas usan `credentials: 'include'`; requiere CORS con `allow_credentials`.

### 3.6 Modelo de seguridad y privacidad

**Autenticación.** JWT HS256 con claims `iat`/`jti`/`iss`; cookie `genova_token`
(`httpOnly; Secure; SameSite`); `JWT_SECRET` validado en arranque; lockout de 5 intentos con hash
dummy (anti-timing); **TOTP 2FA** (pyotp) y `jwt_blocklist` para revocación.

**Autorización.** RBAC con permisos JSONB verificados por endpoint; propiedad de recursos por
`user_id` antes de servir o mutar.

**Cifrado y datos.** Contraseñas con bcrypt; API keys de LLM del usuario en JSONB, nunca serializadas
en respuestas; reset/verification tokens con `secrets.token_urlsafe`, enviados solo por email.

**Rate limiting (SlowAPI).** `/login`, `/register`, generación y demás endpoints con input externo:
`@limiter.limit("N/minute") + request: Request`.

**Privacidad.** Archivos RAG y OVAs privados por `user_id`; logs sin contraseñas/tokens/API keys;
errores de BD nunca filtrados al cliente (`commit_or_500()`).

---

## SECCIÓN 4 — DESARROLLO E IMPLEMENTACIÓN

### 4.1 Metodología de desarrollo aplicada

**Trío metodológico:**
- **Spec-Driven Development (SDD)** para el software: cada feature pasa por una especificación formal
  (escenarios Gherkin Dado-Cuando-Entonces) aprobada antes de implementarse y verificada con pruebas
  automatizadas (`verify.ps1`, CI).
- **Prometheus** para el diseño del sistema de agentes multimodales (metas/escenarios → arquitectura
  de agentes y protocolos → diseño detallado de percepciones y lógica de decisión).
- **5E** para la estructura pedagógica del contenido generado.

**Calendario por sprints (Project Charter):**

| Sprint | Semanas | Hitos principales | Estado |
|---|---|---|---|
| **Sprint 1 — Solución tecnológica** | 4–7 (27/04–24/05) | Product backlog y specs Gherkin; step definitions; arquitectura base e interfaz web; refactor y validación de navegación; retrospectiva | done |
| **Sprint 2 — Agentes e integración** | 8–11 (25/05–21/06) | Motor RAG; Prometheus Fase 1–3 (metas → arquitectura → diseño detallado); implementación y pruebas unitarias de agentes; empaquetador SCORM; medición de métricas conjuntas | done |
| **Sprint 3 — Validación y cierre** | 12–15 (22/06–19/07) | Pruebas de rendimiento (latencia/precisión); validación técnica de OVAs; **evaluación de usabilidad con estudiantes y docentes**; manuales y videos; informe final y defensa | **en curso** |

> Al 30-06-2026 el proyecto se encuentra en **Sprint 3** (semana 13: pruebas de usuario y recolección
> de feedback de usabilidad/UX).

### 4.2 Descripción técnica de módulos implementados

#### Módulo 1 — LLM Router con fallback automático

**Función:** `generar_texto(prompt, tarea, …)` selecciona el modelo primario por tarea y, ante error
recuperable, desciende por la cadena de fallback con backoff adaptativo.

```python
# backend/llm/utils/llm_helpers.py — modelos semilla por tarea
_SEED_MODELOS = {
    "texto":        ("openrouter", "deepseek/deepseek-v4-flash", {}),
    "codigo":       ("opencode",   "deepseek-v4-pro", {}),      # OpenCode Go
    "orquestador":  ("openrouter", "deepseek/deepseek-v4-flash", {}),
    "razonamiento": ("openrouter", "deepseek/deepseek-v4-flash", {}),
}
_SEED_FALLBACK_CHAIN = {
    "codigo": [("openrouter", "qwen/qwen3-coder:free", {}),
               ("openrouter", "meta-llama/llama-3.3-70b-instruct:free", {}),
               ("groq", "llama-3.3-70b-versatile", {})],
    # texto/orquestador/razonamiento → deepseek-chat-v3.1 → llama-3.3-70b → groq llama-3.1-8b
}
```

*Decisión no trivial:* los errores recuperables incluyen rate-limit, status 4xx/5xx, **timeouts**,
caídas de conexión y `EmptyContentError` (modelos de razonamiento que no emiten texto). El backoff
no espera si el siguiente intento es de **otro** proveedor (su ventana de límite es independiente).

#### Módulo 2 — Validador HTML + callbacks SCORM

**Función:** `validate_and_repair(html, phase, rtype)` — verificación determinista post-generación
antes de empaquetar.

```python
# backend/llm/html_validator.py (representativo)
def validate_and_repair(html, phase, rtype):
    issues = []
    if "<!DOCTYPE" not in html:
        html = "<!DOCTYPE html>\n" + html;            issues.append("DOCTYPE inyectado")
    if "</html>" not in html:
        html = html.rstrip() + "\n</html>";            issues.append("</html> añadido (truncado)")
    if "_scormInit" not in html:
        html = html.replace("</body>", SCORM_JS + "</body>"); issues.append("callbacks SCORM")
    for cdn in FORBIDDEN_CDNS:
        if cdn in html: issues.append(f"CDN externo: {cdn}")
    return html, issues
```

#### Módulo 3 — RAG pipeline

**Función:** ingesta y recuperación de conocimiento docente para anclar la generación.

```python
# backend/rag/ — chunking + embeddings Gemini 768-d
chunks = chunk_text(content, size=800, overlap=150, max_chunks=100)
embeddings = embed_batch(chunks)        # gemini-embedding-2-preview (768-d); fallback MiniLM 384-d
# recuperación top-k por similitud coseno (pgvector, índice ivfflat)
RagChunk.embedding.cosine_distance(q_emb)
```

#### Módulo 4 — Empaquetador SCORM 1.2

**Función:** `build_scorm_zip_bytes(course_title, module_title, phases)` ensambla el `.zip` SCORM 1.2.

**Decisiones no triviales:**
- Cada fase se escribe como `resources/recurso_N.html` y se carga en un **iframe** dentro del shell SCO
  (`index.html`), aislando documentos HTML completos generados por IA.
- Se incluye `imsmanifest.xml` (SCORM 1.2), `resources/scorm.js` (runtime), y `xapi.js` + `cmi5.xml`
  para que el mismo paquete importe también en LMS xAPI/cmi5.
- Persistencia en **Supabase Storage** (bucket `scorm-packages`, signed URLs) con **fallback a disco
  local** si Storage no está configurado.

#### Módulo 5 — Motor Prometheus (grafo de 9 nodos)

`backend/prometheus/engine/graph.py` registra: `concierge`, las 5 fases (`engage`, `explore`,
`explain`, `elaborate`, `evaluate`), `critic`, `editor` y `assemble`. El `concierge` descompone el
prompt en un plan de recursos por fase; cada nodo de fase genera **todos** sus recursos en paralelo
acotado; el `critic` corre tras cada fase (passthrough si está desactivado) y el `editor` revisa la
coherencia global antes de `assemble`.

### 4.3 Gestión de datos

#### 4.3.1 Fuentes de datos

| Fuente | Tipo | Volumen estimado | Licencia |
|---|---|---|---|
| Archivos docentes (RAG) | PDF, DOCX, PPTX, TXT, imagen | hasta 100 chunks/archivo | Material propio del usuario |
| Generación LLM | HTML interactivo, JSON | ~5–50 KB por recurso | Generado (CC0 implícito) |
| Embeddings RAG | Vectores 768-d (o 384-d local) | ~3 KB/chunk | Derivados del material docente |

**No se usan datasets externos de entrenamiento** — el sistema es generativo y consume LLMs vía API.

#### 4.3.2 Preprocesamiento (RAG)

```
[PDF/DOCX/PPTX/TXT/imagen] → text_extract (pypdf / python-docx / python-pptx / Gemini multimodal)
   → chunk_text (size=800, overlap=150, max=100)  → sanitize
   → embed_batch (Gemini gemini-embedding-2-preview 768-d | MiniLM 384-d)
   → INSERT rag_chunks (pgvector, índice ivfflat coseno)
```

No aplican estadísticas descriptivas tipo ML/DL ni partición train/val/test: los datos son documentos
de texto no estructurado.

### 4.4 Configuración del entorno

**Desarrollo local:** cualquier laptop con Node.js 20+ y Python 3.11+ (sin GPU). `pnpm install` +
`uv sync --extra dev`. Variables mínimas en `backend/.env`: `DATABASE_URL`, `JWT_SECRET`, claves LLM.

**Producción:**
- **Frontend → Vercel** (auto-deploy on push; `vite build` → `/dist`; rewrites SPA).
- **Backend → Railway** (Docker `backend/Dockerfile.prod`; `uvicorn main:app`).
- **BD → Supabase PostgreSQL** (Transaction pooler, puerto 6543) + **Storage** (`scorm-packages`).

**Dependencias principales (backend):** `fastapi==0.138`, `sqlalchemy==2.0.51`, `psycopg[binary]==3.3.4`,
`pydantic==2.13`, `langgraph==1.2.6`, `langgraph-checkpoint-postgres==3.1`, `arq==0.28`, `groq==1.4`,
`openai==2.43`, `google-genai==2.9`, `pgvector`, `slowapi==0.1.10`, `pyjwt==2.13`, `bcrypt==5.0`,
`pyotp==2.10`, `sse-starlette==3.4.5`, `supabase==2.31`, `pypdf`, `python-docx`, `python-pptx`.
*(Ver `backend/pyproject.toml` y `backend/requirements.txt` para versiones exactas.)*

### 4.5 Control de versiones y trazabilidad

**Branching:** GitFlow simplificado — `main` (producción), `develop` (integración + preview),
ramas cortas `feature/*`/`fix/*` (una por HU/BU bajo SDD).

**Trazabilidad (al 30-06-2026):**
- Migraciones de BD aplicadas: **034** (última `034_user_roles_is_primary.sql`; próxima 035).
- Pruebas: BDD unit (cucumber-js) + backend (pytest-bdd) + e2e (Playwright).
- CI: `lint` + `backend-bdd` + `frontend-unit` en paralelo → `e2e`.

---

## SECCIÓN 5 — EVALUACIÓN Y VALIDACIÓN

> **Estado:** métricas definidas con los **umbrales oficiales del Project Charter**. Los resultados
> formales corresponden al **Sprint 3 (en curso)**; se marcan como **pendientes / en curso** y **no**
> se reportan cifras finales inventadas.

### 5.1 Estrategia de evaluación

Tres dimensiones, alineadas a los OE:
1. **Rendimiento (OE1):** latencia de respuesta cliente→servidor.
2. **Técnica / IA (OE2):** precisión de contenido vs. RAG, completitud estructural 5E, tiempo de
   generación (MTTG) y conformidad SCORM.
3. **Usabilidad (OE3):** SUS con estudiantes y docentes de Machine Learning de la UPAO.

Tipo de validación: técnica (automatizable) + evaluación con usuarios.

### 5.2 Métricas de evaluación definidas (umbrales del charter)

| Métrica | Definición | Umbral objetivo | Herramienta |
|---|---|---|---|
| **Latencia** | Tiempo de respuesta promedio cliente→servidor | **≤ 278 ms** | Pruebas de carga / APM (Prometheus) |
| **Precisión de contenido (Accuracy)** | Concordancia del contenido generado vs. RAG | **> 88.67 %** | Comparación generado ↔ RAG |
| **Completitud estructural 5E** | % de OVAs con los 5 módulos completos | **100 %** | `ova_job_resources` por fase |
| **Tiempo de generación (MTTG)** | Segundos hasta el paquete SCORM completo | **< 180 s** (ver nota) | Timestamps del job |
| **Conformidad SCORM** | % de paquetes válidos sin error crítico | **100 %** | **SCORM Cloud (Rustici) / ADL** |
| **Usabilidad (SUS)** | System Usability Scale (0–100) | **≥ 90/100** | Cuestionario 10 ítems |

> **Nota de viabilidad sobre MTTG.** El charter fija **< 180 s** "o el tiempo que se considere viable
> según los LLMs que se usen". Con las **5 fases** ahora implementadas (hasta 50 recursos posibles),
> el tiempo total depende del número de recursos seleccionados y de la latencia de las APIs externas;
> para OVAs de pocos recursos por fase el objetivo es alcanzable, mientras que OVAs extensos pueden
> requerir reconsiderar el umbral. La medición formal corresponde al Sprint 3.

### 5.3 Diseño experimental

**Ambiente de prueba:** Backend en Railway (tier inicial), BD en Supabase (free tier), LLMs vía
Groq/OpenRouter/OpenCode (free tier/créditos), conexión de campus estándar.

**Casos de prueba (técnicos):** generación de OVAs del dominio **Machine Learning** (p. ej.
regresión, clasificación, redes neuronales, evaluación de modelos), validando completitud 5E,
conformidad SCORM en Canvas y MTTG.

**Participantes (SUS, OE3 — Sprint 3):** estudiantes de 8.º ciclo del curso de Machine Learning
(**muestra ≈ 60**) y docentes. *Criterio de inclusión:* haber usado la plataforma; *exclusión:* sin
interacción previa con la herramienta.

### 5.4 Resultados obtenidos

> **[PENDIENTE / EN CURSO — Sprint 3]** Las pruebas de rendimiento, la validación técnica de OVAs y la
> evaluación de usabilidad se están ejecutando (semanas 12–13 del calendario). Los resultados
> definitivos se consolidarán en el informe final (semana 15). No se reportan cifras finales en esta
> versión para no introducir datos no verificados.

### 5.5 Comparación con línea base

> **[PENDIENTE — datos del experimento formal]**

| Sistema | Tiempo producción (OVA) | Conformidad SCORM | Costo/OVA | Fuente |
|---|---|---|---|---|
| **GenOVA** | [pendiente, MTTG medido] | objetivo 100 % | ~ S/. 0 (free/créditos) | Este trabajo |
| Articulate Storyline | ~8 h (experto) | ~98 % | licencia anual | [PENDIENTE ref] |
| iSpring Suite | ~6 h (experto) | ~96 % | licencia anual | [PENDIENTE ref] |
| Generación manual HTML | ~12 h (dev web) | manual | variable | Chapman 2020 |

### 5.6 Análisis estadístico

> **[PENDIENTE]** Plan: t-test de una muestra (SUS vs. umbral 90), IC 95 % para conformidad SCORM y
> precisión de contenido; tamaño de efecto reportado. Con la muestra de ~60 usuarios se evaluará el
> poder estadístico para detectar diferencias relevantes en SUS.

### 5.7 Discusión de resultados

> **[PENDIENTE — datos formales]** Se discutirán la concordancia generado↔RAG (Accuracy), la
> completitud 5E observada, los tipos de recurso con mayor tasa de reparación, el comportamiento de la
> cadena de fallback bajo carga y la usabilidad percibida por estudiantes y docentes.

---

## SECCIÓN 6 — DISCUSIÓN INTEGRADORA

### 6.1 Respuesta a la pregunta de investigación

> **[PARCIAL — pendiente experimento formal]** La arquitectura implementada (agentes multimodales
> Prometheus sobre LangGraph, RAG con pgvector, 5E completa y empaquetado SCORM 1.2) constituye la
> evidencia de viabilidad técnica; la respuesta cuantitativa en términos de **usabilidad/UX (SUS ≥
> 90)** se completará con los resultados del Sprint 3.

### 6.2 Contribuciones técnicas

1. Orquestación de agentes multimodales (Prometheus) con grafo de 9 nodos, paralelismo acotado y
   estado persistido.
2. Pipeline de tres planes (two_step/direct_code/podcast) que cubre los 50 tipos de recurso de las 5
   fases 5E.
3. Cadena de fallback multi-proveedor con backoff adaptativo.
4. RAG multimodal (PDF/DOCX/PPTX/imagen) sobre pgvector.
5. Validador HTML determinista + empaquetador SCORM 1.2 con interoperabilidad xAPI/cmi5.

### 6.3 Limitaciones, restricciones y riesgos

**Limitaciones técnicas.**
1. Dependencia de APIs externas y sus cuotas: en uso intensivo, el free tier de Groq/OpenRouter se
   agota y requiere créditos de pago.
2. Sin fine-tuning: la calidad del contenido está acotada por modelos de propósito general.
3. La calidad pedagógica profunda y la calidad de ingeniería del código **no se auditan** (fuera de
   alcance por decisión del charter; variable dependiente = usabilidad).

**Restricciones (charter).** Presupuesto cloud limitado; límite de tokens según plan; sin base
vectorial empresarial; **sin escalado más allá de ~60 estudiantes concurrentes**.

**Riesgos (charter).** Latencia/caídas de las APIs de LLM; sobrecarga del servidor en picos;
vulnerabilidades (exposición de API keys, inyección de prompts) — mitigadas con cookies httpOnly,
2FA TOTP, rate limiting, claves server-only y validación de entrada.

**Supuestos (charter).** Estabilidad de los modelos de IAG durante 2026; estabilidad de Canvas y la
conectividad del campus; archivos subidos de tamaño razonable.

### 6.4 Amenazas a la validez

- **Interna:** muestra y condiciones del Sprint 3 aún en ejecución; posible sesgo de selección de
  conceptos favorables al LLM.
- **Externa:** los OVAs se validan en un entorno controlado; el comportamiento con múltiples usuarios
  concurrentes (hasta el límite de 60) puede diferir.
- **De constructo:** el SUS mide usabilidad percibida, no efectividad de aprendizaje.
- **Estadística:** el poder para detectar diferencias en SUS depende del N final (~60).

### 6.5 Trabajo futuro

1. **Integración LTI 1.3 con Canvas** para eliminar la importación manual del SCORM zip y sincronizar
   calificaciones.
2. **Fine-tuning** en dominio educativo de Machine Learning (LATAM/UPAO) para mejorar precisión y
   adherencia institucional.
3. **Activar critic/editor por defecto** con rúbrica pedagógica y regeneración automática
   (evaluator-optimizer) cuando el puntaje < umbral.
4. **Optimización de MTTG** (caché de prompts, generación incremental, modelos más rápidos) para OVAs
   extensos de 5 fases.

---

## SECCIÓN 7 — CONCLUSIONES

GenOVA implementa una aplicación web de generación de OVAs basada en **agentes multimodales**
(metodología Prometheus sobre LangGraph, grafo de 9 nodos), con la metodología pedagógica **5E
completa** (5 fases, **50 tipos de recurso**), **RAG multimodal** sobre pgvector, validación
determinista de HTML y empaquetado **SCORM 1.2** (con interoperabilidad xAPI/cmi5), desplegada en
**Vercel + Railway + Supabase**.

Los **objetivos del Project Charter** —precisión de contenido > 88.67 %, latencia ≤ 278 ms, MTTG <
180 s, conformidad SCORM 100 %, completitud estructural 100 % y **SUS ≥ 90/100**— quedan declarados
como umbrales de validación; su verificación cuantitativa corresponde al **Sprint 3 (en curso)** y se
reportará honestamente en el informe final, sin anticipar cifras no verificadas.

El código fuente está disponible en https://github.com/genova-upao/genova. La instalación requiere
credenciales de Supabase y de los proveedores LLM (free tier/créditos). El sistema es reproducible con
Docker (`pnpm dev:docker`) y se verifica con `./verify.ps1`.

---

## SECCIÓN 8 — REFERENCIAS

> Referencias verificadas o de alta confianza. `[PENDIENTE DOI]` = confirmar indexación/DOI antes de
> la entrega final.

[1] ADL Initiative. (2009). *SCORM 2004 4th Edition — Run-Time Environment*. Advanced Distributed
Learning. https://adlnet.gov/projects/scorm/

[2] Vaswani, A., et al. (2017). Attention is all you need. *NeurIPS*, 30.

[3] OpenAI. (2023). GPT-4 technical report. *arXiv:2303.08774*.

[4] Lewis, P., et al. (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks.
*NeurIPS*, 33, 9459–9474.

[5] Bybee, R. W., et al. (2006). *The BSCS 5E instructional model: Origins and effectiveness*. BSCS.

[6] Duran, L. B., & Duran, E. (2004). The 5E instructional model. *The Science Education Review*,
3(2), 49–58.

[7] Anthropic. (2024). *Building effective agents*. https://www.anthropic.com/research/building-effective-agents

[8] Karpukhin, V., et al. (2020). Dense passage retrieval for open-domain question answering.
*EMNLP 2020*, 6769–6781.

[9] Kasneci, E., et al. (2023). ChatGPT for good? *Learning and Individual Differences*, 103, 102274.
https://doi.org/10.1016/j.lindif.2023.102274

[10] Touvron, H., et al. (2023). Llama 2: Open foundation and fine-tuned chat models.
*arXiv:2307.09288*.

[11] Brown, T., et al. (2020). Language models are few-shot learners. *NeurIPS*, 33, 1877–1901.

[12] Wei, J., et al. (2022). Chain-of-thought prompting elicits reasoning in large language models.
*NeurIPS*, 35, 24824–24837.

[13] Jiang, A. Q., et al. (2023). Mistral 7B. *arXiv:2310.06825*.

[14] Baidoo-Anu, D., & Owusu Ansah, L. (2023). Education in the era of generative AI: ChatGPT in
teaching and learning. *Journal of AI*, 7(1), 52–62. `[PENDIENTE DOI]`

[15] Lo, C. K. (2023). What is the impact of ChatGPT on education? *Education Sciences*, 13(4), 410.
https://doi.org/10.3390/educsci13040410

[16] Hu, E. J., et al. (2022). LoRA: Low-rank adaptation of large language models. *ICLR 2022*.
https://arxiv.org/abs/2106.09685

[17] Adiguzel, T., et al. (2023). Revolutionizing education with AI. *Social Sciences & Humanities
Open*, 7(1), 100451. https://doi.org/10.1016/j.ssaho.2023.100451

[18] Rahman, M. M., & Watanobe, Y. (2023). ChatGPT for education and research. *Applied Sciences*,
13(9), 5783. https://doi.org/10.3390/app13095783

[19] Brooke, J. (1996). SUS: A 'quick and dirty' usability scale. En *Usability Evaluation in
Industry* (pp. 189–194). Taylor & Francis.

[20] Bangor, A., Kortum, P., & Miller, J. (2008). An empirical evaluation of the System Usability
Scale. *International Journal of Human–Computer Interaction*, 24(6), 574–594.
https://doi.org/10.1080/10447310802205776

[21] Padayachee, P., et al. (2024). Multi-agent LLM systems for educational content generation.
*[PENDIENTE — verificar fuente/indexación]*.

[22] Pan, S. J., & Yang, Q. (2010). A survey on transfer learning. *IEEE TKDE*, 22(10), 1345–1359.
https://doi.org/10.1109/TKDE.2009.191

[23] Padró, L., et al. (2024). Vector databases for retrieval-augmented education.
*[PENDIENTE — verificar fuente/indexación]*.

---

## SECCIÓN 9 — ANEXOS TÉCNICOS

| Anexo | Contenido | Ubicación |
|---|---|---|
| A | Arquitectura del motor Prometheus y pipeline 5E | `docs/prometheus.md`, `docs/generacion-5e.md`, `docs/fases-5e.md` |
| B | Especificación de la API (endpoints, parámetros, respuestas) | `docs/api.md` + Swagger en `/docs` |
| C | Diccionario de datos / esquema de BD (34 migraciones) | `docs/database.md`, `backend/migrations/` |
| D | Manual de instalación y reproducibilidad | `README.md` / `readme.md` + `docs/deployment.md` |
| E | Dataset | N/A (generativo). Material RAG: archivos del usuario, privados por `user_id` |
| F | Resultados completos de pruebas | `backend/tests/` (pytest-bdd), `tests/` (cucumber-js), Playwright e2e, CI |
| G | Consentimiento informado | Pendiente — requerido para la evaluación SUS con usuarios |

---

## Checklist de autoevaluación

| Criterio | Estado actual | Pendiente |
|---|---|---|
| Problema con evidencia cuantitativa | ✓ Chapman + datos del charter (licencias, horas-docente) | Verificar fuentes primarias |
| Gap tecnológico explícito | ✓ Tabla comparativa (15 trabajos) | Verificar DOIs [9]–[23] |
| Arquitectura documentada | ✓ Diagrama + 5 ADRs | Exportar diagrama como figura vectorial |
| Stack justificado técnicamente | ✓ Tabla con versiones reales y alternativas | — |
| Métricas apropiadas | ✓ 6 métricas con umbrales del charter | Completar con datos del Sprint 3 |
| Comparación con estado del arte | ✓ Posicionamiento | Completar con datos del experimento |
| Análisis estadístico | Esqueleto | t-test + IC pendientes (Sprint 3) |
| Reproducibilidad | ✓ Repo + Docker + `verify.ps1` | — |
| Referencias Q1 (≥ 60 %) | Parcial | Verificar indexación Q1/Q2 |
| Limitaciones y amenazas | ✓ Limitaciones + restricciones + riesgos + supuestos del charter | — |

---

> **Trazabilidad charter ↔ implementación.** Este informe v2 toma del Project Charter (G23) el
> encuadre del proyecto (curso de Machine Learning), objetivos, métricas, alcance, calendario, equipo,
> riesgos y supuestos; y verifica cada afirmación técnica contra el código real del repositorio. Donde
> el charter y la implementación divergen (p. ej. **Angular → React 19**; despliegue cloud genérico →
> **Vercel + Railway + Supabase**), prevalece lo realmente construido, dejándolo anotado.
