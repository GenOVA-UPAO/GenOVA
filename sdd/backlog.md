# Product Backlog — GenOVA

> Product backlog del proyecto, organizado por **épica** (árbol de backlog) y
> estandarizado: descripción con voz consistente (Historia de usuario para HU,
> Objetivo para el resto) y criterios de aceptación como **bullets atómicos
> verificables**. Fuente: BD de Notion del profesor (62 capturas) + ítems añadidos.
> Es la **fuente de verdad**; los specs SDD se redactan a partir de él, ítem por
> ítem, con `spec_author` (Fase B).

## Leyenda

### Mapeo de tipos (prefijo ID ↔ SDD)
| Notion | Tipo | SDD | Carpeta destino (Fase B) |
|---|---|---|---|
| EP-N | Épica | EP | `sdd/specs/` |
| HU-N | Historia de Usuario | HU | `sdd/specs/` |
| EN-N | Habilitador | EN | `sdd/specs/` |
| RN-N | Req. No Funcional | RN | `sdd/specs/` |
| TA-N | Tarea técnica | TA | `sdd/tasks/` |
| BU-N | Bug | BU | `sdd/bugs/` |
| SP-N | Spike | (nuevo) | `sdd/spikes/` |
| DO-N | Documentación | (nuevo) | `sdd/docs-specs/` |

### Mapeo de status (Notion → SDD `valid_status`, se aplica en Fase B)
`Closed`/`Done` → `done` · `To Do` → `pending` · `In Progress` → `in_progress`

### Convenciones
- **Roles** (HU): `estudiante del curso de ML de UPAO` · `usuario autenticado` · `administrador de la plataforma`.
- **Descripción**: HU → `Historia de usuario` (Como/quiero/para) + `Contexto`; resto → `Objetivo` + `Contexto`.
- **Criterios**: bullets atómicos, una verificación por línea.
- **Fechas**: `Fecha creación` = *Fecha Inicio* de Notion (ISO); `Fecha actualización` = `—` hasta editar el spec; `Fecha Fin (info)` = dato informativo.
- Marcas de origen: `(añadido fuera de captura)`, `(inferido)`, `(borrador)`, `(añadido — roadmap editor OVA)`.

---

## Roadmap por Sprint

| Sprint | Épicas (tema) | Rango de fechas |
|---|---|---|
| **Sprint 1** | EP-1 Especificación · EP-2 Plataforma Web y Auth · EP-3 Interfaz OVAs · EP-4 Motor SCORM | 27 abr – 21 may 2026 |
| **Sprint 2** | EP-5 Multiagente · EP-6 RAG · EP-7 Despliegue Cloud | 25 may – 21 jun 2026 |
| **Sprint 3** | EP-8 Validación técnica · EP-9 Evaluación UX · EP-10 Documentación | 22 jun – 10 jul 2026 |

---

## Índice por tipo

**77 ítems** — 10 EP · 30 HU · 13 EN · 5 RN · 7 TA · 9 SP · 3 DO.

### Épicas (EP)
| ID | Título | Épica/Tema | Sprint | Status |
|---|---|---|---|---|
| EP-1 | Especificación del Sistema | SDD — Specify | Sprint 1 | To Do |
| EP-2 | Plataforma Web y Autenticación | SDD — Plan + Implement | Sprint 1 | To Do |
| EP-3 | Interfaz de Creación y Gestión de OVAs | SDD — Implement | Sprint 1 | To Do |
| EP-4 | Motor de Exportación SCORM | SDD — Implement | Sprint 1 | To Do |
| EP-5 | Especificación del Sistema Multiagente | Prometheus — System Specification | Sprint 2 | To Do |
| EP-6 | Base de Conocimiento Contextual RAG | Prometheus — Detailed Design | Sprint 2 | To Do |
| EP-7 | Despliegue e Infraestructura Cloud | Prometheus — Architectural Design | Sprint 2 | To Do |
| EP-8 | Validación Técnica y de Calidad | Validación técnica | Sprint 3 | To Do |
| EP-9 | Evaluación de Usabilidad y UX | Evaluación UX | Sprint 3 | To Do |
| EP-10 | Documentación y Cierre del Proyecto | Documentación | Sprint 3 | To Do |

### Historias de Usuario (HU)
| ID | Título | Épica | Sprint | Status | Prioridad |
|---|---|---|---|---|---|
| HU-001 | Registro de cuenta de usuario | EP2 | Sprint 1 | Closed | Alta |
| HU-002 | Crear nuevo OVA desde prompt | EP3 | Sprint 1 | Closed | Alta |
| HU-003 | Visualizar completa 5E | EP3 | Sprint 1 | Closed | Alta |
| HU-004 | Exportar OVA como paquete SCORM | EP4 | Sprint 1 | Closed | Alta |
| HU-005 | Evaluar plataforma mediante encuesta SUS | EP9 | Sprint 3 | To Do | Media |
| HU-006 | Ver historial de OVAs | EP3 | Sprint 1 | Closed | Alta |
| HU-007 | Subir archivos base para el OVA | EP3 | Sprint 1 | Closed | Alta |
| HU-008 | Inicio de sesión con credenciales | EP2 | Sprint 1 | Closed | Alta |
| HU-009 | Recuperación de contraseña | EP2 | Sprint 1 | To Do | Media |
| HU-010 | Maquetación del Layout Principal y Enrutamiento Modular | EP2 | Sprint 1 | To Do | Alta |
| HU-011 | Editar OVA Generado | EP3 | Sprint 1 | Closed | Alta |
| HU-012 | Eliminar OVA del Historial | EP3 | Sprint 1 | Closed | Media |
| HU-013 | Duplicar OVA Existente | EP3 | Sprint 1 | Closed | Media |
| HU-014 | Renombrar y Editar Metadatos del OVA | EP3 | Sprint 1 | Closed | Media |
| HU-015 | Ver y Editar Perfil de Usuario | EP2 | Sprint 1 | Closed | Alta |
| HU-016 | Cambiar Contraseña desde el Perfil | EP2 | Sprint 1 | Closed | Media `(añadido)` |
| HU-017 | Eliminar / dar de baja cuenta | EP2 | Sprint 1 | To Do | Media `(borrador)` |
| HU-018 | Gestión de Roles — Crear Rol | EP2 | Sprint 1 | Closed | Alta |
| HU-019 | Gestión de Roles — Editar Rol | EP2 | Sprint 1 | Closed | Alta |
| HU-020 | Gestión de Roles — Eliminar Rol | EP2 | Sprint 1 | Closed | Media |
| HU-021 | Gestión de Roles — Asignar Rol a Usuario | EP2 | Sprint 1 | Closed | Alta |
| HU-022 | Recuperación de recursos parciales tras error de generación | EP3 | Sprint 1 | To Do | Alta `(editor OVA)` |
| HU-023 | Generación de OVA en background persistente y reanudación | EP3 | Sprint 1 | To Do | Alta `(editor OVA)` |
| HU-024 | Carga de archivos contextuales estilo chat | EP3 | Sprint 1 | To Do | Media `(editor OVA)` |
| HU-025 | Workspace de edición de OVA (panel dividido) | EP3 | Sprint 1 | To Do | Alta `(editor OVA)` |
| HU-026 | Edición de recurso por click en el preview | EP3 | Sprint 1 | To Do | Alta `(editor OVA)` |
| HU-027 | Selección de recursos como contexto del prompt | EP3 | Sprint 1 | To Do | Media `(editor OVA)` |
| HU-028 | Versionado de OVA (historial, diff y revertir) | EP3 | Sprint 1 | To Do | Alta `(editor OVA)` |
| HU-029 | Micro-versionado por recurso editado | EP3 | Sprint 1 | To Do | Media `(editor OVA)` |
| HU-030 | "Mis OVAs": acceso al workspace + versión en metadata | EP3 | Sprint 1 | To Do | Media `(editor OVA)` |

### Habilitadores (EN)
| ID | Título | Épica | Sprint | Status | Prioridad |
|---|---|---|---|---|---|
| EN-001 | Habilitar especificaciones Gherkin Sprint 1 | EP1 | Sprint 1 | To Do | Alta |
| EN-002 | Habilitar automatización BDD | EP1 | Sprint 1 | To Do | Alta |
| EN-003 | Habilitar orquestación de agentes Prometheus | EP5 | Sprint 2 | To Do | Alta |
| EN-004 | Habilitar pgvector (BD Vectorial) | EP6 | Sprint 2 | To Do | Alta |
| EN-005 | Habilitar pipeline RAG end-to-end | EP6 | Sprint 2 | To Do | Alta |
| EN-006 | Habilitar entornos Cloud y orquestación | EP7 | Sprint 2 | To Do | Alta |
| EN-007 | Habilitar pruebas de integración en Canvas | EP8 | Sprint 3 | To Do | Media |
| EN-008 | Habilitar Base de Datos para Gestión de Usuarios | EP2 | Sprint 1 | Closed | Alta |
| EN-009 | Integración Frontend ↔ Backend de Agentes | EP7 | Sprint 2 | To Do | Alta |
| EN-010 | Configuración del Monorepo y Arquitectura Base React | EP2 | Sprint 1 | To Do | Alta |
| EN-011 | Setup Base de FastAPI y Orquestación Local (Docker) | EP2 | Sprint 1 | To Do | Alta |
| EN-012 | Observabilidad de errores de generación en Supabase | EP3 | Sprint 1 | To Do | Alta `(editor OVA)` |
| EN-013 | Persistencia del estado de generación (jobs) | EP3 | Sprint 1 | To Do | Alta `(editor OVA)` |

### Requisitos No Funcionales (RN)
| ID | Título | Épica | Sprint | Status | Prioridad |
|---|---|---|---|---|---|
| RN-001 | Latencia ≤ 278 ms | EP8 | Sprint 3 | To Do | Alta |
| RN-002 | Tiempo de generación ≤ 180 segundos (MTTG) | EP6 | Sprint 2 | To Do | Alta |
| RN-003 | Seguridad y manejo de API Keys | EP7 | Sprint 2 | To Do | Media |
| RN-004 | Prueba de humo de rendimiento post-despliegue | EP7 | Sprint 2 | To Do | Media |
| RN-005 | Frontend responsive | EP3 | Sprint 1 | To Do | Media `(propuesto)` |

### Tareas Técnicas (TA)
| ID | Título | Épica | Sprint | Status | Prioridad |
|---|---|---|---|---|---|
| TA-001 | Configuración de repositorios y ramas | EP2 | Sprint 1 | To Do | Alta |
| TA-002 | Crear template base SCORM XML | EP4 | Sprint 1 | To Do | Alta |
| TA-003 | Ejecutar scripts de precisión IA | EP8 | Sprint 3 | To Do | Media |
| TA-004 | Preparación y coordinación de sesión SUS | EP9 | Sprint 3 | To Do | Alta |
| TA-005 | Validación SCORM con SCORM Cloud Rustici | EP8 | Sprint 3 | To Do | Alta |
| TA-006 | Configuración del Entorno de Producción y Despliegue del Backend en Render | EP2 | Sprint 1 | Closed | Alta |
| TA-007 | Configuración y Despliegue del Frontend en Vercel | EP2 | Sprint 1 | Closed | Alta |

### Spikes (SP)
| ID | Título | Épica | Sprint | Status | Prioridad |
|---|---|---|---|---|---|
| SP-001 | Comparativa APIs multimodales | EP1 | Sprint 1 | Closed | Alta |
| SP-002 | Metodología 5E y Estructura OVA | EP1 | Sprint 1 | Closed | Alta |
| SP-003 | Mapeo de recursos y estructura de 5E | EP1 | Sprint 1 | Closed | Alta |
| SP-004 | Spike: Herramientas de Orquestación y Despliegue | EP7 | Sprint 2 | To Do | Alta |
| SP-005 | Investigación Spec-Driven Development | EP1 | Sprint 1 | Closed | Alta |
| SP-006 | Estructura Técnica del Estándar SCORM | EP1 | Sprint 1 | Closed | Alta |
| SP-007 | Metodología Prometheus para Agentes | EP5 | Sprint 2 | To Do | Alta |
| SP-008 | Investigación de buenos principios para el frontend de aplicaciones web | EP1 | Sprint 1 | To Do | Alta `(reescrito)` |
| SP-009 | Ingeniería de Harness Engineering en Sistemas de IA | EP1 | Sprint 2 | To Do | Alta |

### Documentación (DO)
| ID | Título | Épica | Sprint | Status | Prioridad |
|---|---|---|---|---|---|
| DO-001 | Documentación técnica completa | EP10 | Sprint 3 | To Do | Media |
| DO-002 | Videos demostrativos del funcionamiento | EP10 | Sprint 3 | To Do | Baja |
| DO-003 | Reporte comparativo de agentes LLM | EP10 | Sprint 3 | To Do | Baja |

### Notas de reconciliación
- **SP-008** reescrito (antes "investigación de interfaz") → buenos principios de frontend para apps web. `(añadido fuera de captura)`
- **HU-016** y **HU-017** añadidos `(fuera de captura)`: HU-016 con contenido del spec del repo; HU-017 en borrador.
- **HU-022…HU-030, EN-012, EN-013** añadidos `(roadmap editor OVA)`, distribuidos en EP-3; **RN-005** propuesto.
- **EP-D** = **EP-4** (normalizado en dependencias de EN-007 y DO-002).
- **Migración shadcn/ui**: NO está en el backlog (es refactor de código).
- Confirmar contra Notion los ítems marcados `(inferido)` / `(borrador)` / `(propuesto)`.

---

# Detalle por Épica

## EP-1 — Especificación del Sistema (SDD — Fase Specify)

| Campo | Valor |
|---|---|
| ID | EP-1 |
| Tipo | Épica |
| Épica/Tema | SDD — Specify |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | — |
| Estimación | — |
| Dependencia | — |
| Responsable | — |
| Fase | SDD - Specify |
| Fecha creación | 2026-04-27 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-10 |

**Objetivo:** Agrupar la investigación, definición de requisitos y redacción de especificaciones formales previas al desarrollo (fase Specify de SDD): definir qué debe hacer el sistema antes de escribir código.

**Criterios de aceptación:**
- Se consolidan la investigación, los requisitos y las especificaciones formales previas al desarrollo.
- Queda definido claramente qué debe hacer el sistema antes de escribir código.

---

### EN-001 — Habilitar especificaciones Gherkin Sprint 1

| Campo | Valor |
|---|---|
| ID | EN-001 |
| Tipo | Habilitador |
| Épica/Tema | EP1: Especificacion del Sistema |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 8 SP |
| Dependencia | SP-005 |
| Responsable | — |
| Fase | SDD - Specify |
| Fecha creación | 2026-05-04 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-07 |

**Objetivo:** Redactar en formato BDD (Dado-Cuando-Entonces) todas las features del Sprint 1, revisadas por ambos integrantes y alineadas al estándar de SP-005, listas para conectarse a step definitions en EN-002.

**Criterios de aceptación:**
- Mínimo 10 features Gherkin revisadas y aprobadas.
- Las features cubren las HU del Sprint 1 (HU-001, HU-002, HU-003, HU-004, HU-006, HU-007, HU-008, HU-009).
- Cada feature contiene escenarios positivos, negativos y de borde.
- Tags por épica y vocabulario consistente.

---

### EN-002 — Habilitar automatización BDD

| Campo | Valor |
|---|---|
| ID | EN-002 |
| Tipo | Habilitador |
| Épica/Tema | EP1: Especificacion del Sistema |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 8 SP |
| Dependencia | EN-001 |
| Responsable | — |
| Fase | SDD - Specify |
| Fecha creación | 2026-05-08 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-10 |

**Objetivo:** Implementar y ejecutar step definitions de prueba automatizada que conecten las features Gherkin a pruebas reales contra el frontend y el backend del Sprint 1, validando respuestas del sistema en cada PR.

**Criterios de aceptación:**
- Todas las features del Sprint 1 pasan en CI.
- Pipeline ejecutado en GitHub Actions con reporte HTML/JSON publicado como artefacto.
- Cobertura mínima del 80% de los escenarios definidos en EN-001.
- Merge a main bloqueado si la suite falla.

---

### SP-001 — Comparativa APIs multimodales

| Campo | Valor |
|---|---|
| ID | SP-001 |
| Tipo | Spike |
| Épica/Tema | EP1: Especificacion del Sistema |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 5 SP |
| Dependencia | — |
| Responsable | JUAN DIEGO CARRANZA JACINTO |
| Fase | SDD - Specify |
| Fecha creación | 2026-04-27 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-04-28 |

**Objetivo:** Investigar y comparar las APIs multimodales para determinar la óptima para generación de OVAs de ML, antes de implementar el selector LLM en HU-002.

**Criterios de aceptación:**
- Tabla comparativa con costo por token, latencia promedio, límite de contexto, soporte multimodal y facilidad de integración.
- Capturas de las páginas de precios oficiales como evidencia.
- Decisión final documentada con justificación técnica y económica.
- Documento disponible en `/docs/sprint-1/spikes/SP-001_Comparativa_APIs.md`.

---

### SP-002 — Metodología 5E y Estructura OVA

| Campo | Valor |
|---|---|
| ID | SP-002 |
| Tipo | Spike |
| Épica/Tema | EP1: Especificacion del Sistema |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 5 SP |
| Dependencia | — |
| Responsable | JEFFRY ANDERSON ROMERO URIOL |
| Fase | SDD - Specify |
| Fecha creación | 2026-04-27 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-04-28 |

**Objetivo:** Investigar la arquitectura de un OVA estándar y la pedagogía 5E, como base pedagógica para los prompts de los agentes y guía de la estructura de navegación del paquete SCORM final.

**Criterios de aceptación:**
- Documento que define qué compone cada fase 'E' (Engage, Explore, Explain, Elaborate, Evaluate).
- Por cada fase: objetivo pedagógico, actividades sugeridas, tipos de recursos asociados (texto, video, ejercicios), criterios de evaluación y duración estimada dentro del OVA.

---

### SP-003 — Mapeo de recursos y estructura de 5E

| Campo | Valor |
|---|---|
| ID | SP-003 |
| Tipo | Spike |
| Épica/Tema | EP1: Especificacion del Sistema |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 8 SP |
| Dependencia | SP-002 |
| Responsable | JEFFRY ANDERSON ROMERO URIOL |
| Fase | SDD - Specify |
| Fecha creación | 2026-04-29 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-03 |

**Objetivo:** Buscar recursos bibliográficos por cada 'E' (5) e investigar la estructura técnica de código base para todas las fases del modelo; el mapeo alimentará la base de conocimiento RAG (EN-004/EN-005) en Sprint 2.

**Criterios de aceptación:**
- Base de recursos mapeada y borrador de estructura técnica para las 5 fases del OVA.
- Recursos documentados en tabla con campos: título, autor/año, tipo, enlace, fase 5E asociada, resumen de 3-5 líneas.
- La estructura técnica especifica los componentes frontend y el formato JSON intermedio que producirán los agentes.

---

### SP-005 — Investigación Spec-Driven Development

| Campo | Valor |
|---|---|
| ID | SP-005 |
| Tipo | Spike |
| Épica/Tema | EP1: Especificacion del Sistema |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 5 SP |
| Dependencia | — |
| Responsable | JUAN DIEGO CARRANZA JACINTO |
| Fase | SDD - Specify |
| Fecha creación | 2026-04-27 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-04-28 |

**Objetivo:** Investigar Spec-Driven Development y BDD para definir el estándar de especificación y pruebas (herramientas, estructura de archivos .feature en Gherkin, integración con GitHub Actions).

**Criterios de aceptación:**
- Documento con stack técnico recomendado (ej. Cucumber) y guía base de sintaxis Gherkin.
- Al menos 3 ejemplos de escenarios Gherkin aplicados al proyecto.
- Flujo de trabajo acordado para redactar y validar especificaciones durante el sprint.
- Documento disponible en `/docs/sprint-1/spikes/SP-005_SDD.md`.

---

### SP-006 — Estructura Técnica del Estándar SCORM

| Campo | Valor |
|---|---|
| ID | SP-006 |
| Tipo | Spike |
| Épica/Tema | EP1: Especificacion del Sistema |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 5 SP |
| Dependencia | — |
| Responsable | JUAN DIEGO CARRANZA JACINTO |
| Fase | SDD - Specify |
| Fecha creación | 2026-04-29 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-04-30 |

**Objetivo:** Investigar la especificación técnica de empaquetado SCORM 1.2/2004 y los requisitos de importación de Canvas LMS, como referencia técnica para TA-002 y HU-004.

**Criterios de aceptación:**
- Estructura obligatoria de directorios de un paquete SCORM 1.2 documentada.
- Campos requeridos del imsmanifest.xml con ejemplos reales.
- Diferencias clave entre SCORM 1.2 y 2004 relevantes para Canvas.
- Proceso de importación en Canvas descrito paso a paso.
- Documento disponible en `/docs/sprint-1/spikes/SP-006_SCORM.md`.

---

### SP-008 — Investigación de buenos principios para el frontend de aplicaciones web

> `(añadido fuera de captura · reescrito)` — el SP-008 original era "investigación de interfaz", retirado al construir la UI sobre la marcha.

| Campo | Valor |
|---|---|
| ID | SP-008 |
| Tipo | Spike |
| Épica/Tema | EP1: Especificacion del Sistema |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | — |
| Dependencia | — |
| Responsable | — |
| Fase | SDD - Specify |
| Fecha creación | — |
| Fecha actualización | — |
| Fecha Fin (info) | — |

**Objetivo:** Investigar buenas prácticas y principios de diseño para el frontend de aplicaciones web (arquitectura de componentes, modularidad services → hooks → pages, manejo de estado, estados de carga/error, accesibilidad, responsive y rendimiento), como guía para construir y mantener la interfaz de GenOVA.

**Contexto:** Reemplaza al SP-008 original ("investigación de interfaz"), retirado al construir la UI sobre la marcha.

**Criterios de aceptación:**
- Documento con principios y patrones recomendados de frontend para aplicaciones web.
- Cubre estructura de componentes, manejo de estado, estados de carga/error, responsive y accesibilidad.
- Incluye referencias y ejemplos aplicables a GenOVA.
- Recomendaciones alineadas a la regla de < 200 líneas por archivo del proyecto.

---

### SP-009 — Ingeniería de Harness Engineering en Sistemas de Inteligencia Artificial

| Campo | Valor |
|---|---|
| ID | SP-009 |
| Tipo | Spike |
| Épica/Tema | EP1: Especificacion del Sistema |
| Sprint | Sprint 2 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 5 SP |
| Dependencia | — |
| Responsable | — |
| Fase | SDD - Specify |
| Fecha creación | 2026-05-29 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-06-02 |

**Objetivo:** Investigar a profundidad el paradigma de "Ingeniería de Arnés" (Harness Engineering) como sustrato de tiempo de ejecución para agentes de IA autónomos: limitaciones de la Ingeniería de Prompts/Contexto, riesgos de seguridad (Apiiro, DORA) y la arquitectura necesaria (Límites de Tres Niveles, Bucle PEVR, Conserjería Multi-Agente) para agentes seguros y predecibles en producción.

**Criterios de aceptación:**
- Documento de investigación que sintetiza la literatura científica actual (arXiv 2026) sobre Harness Engineering.
- Explica las tres capas estratégicas de control y los cinco principios inmutables de diseño de un sustrato de producción.
- Define la estructura de repositorio recomendada (uso de `AGENTS.md`, divulgación progresiva, rastreadores de estado en JSON).
- Analiza patrones de ejecución clave (Bucle PEVR, Conserjería Multi-Agente).

---

## EP-2 — Plataforma Web y Autenticación (SDD — Fase Plan + Implement)

| Campo | Valor |
|---|---|
| ID | EP-2 |
| Tipo | Épica |
| Épica/Tema | SDD — Plan + Implement |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | — |
| Estimación | — |
| Dependencia | — |
| Responsable | — |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-04-27 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-17 |

**Objetivo:** Agrupar el setup del proyecto, la base de datos de usuarios y todas las funcionalidades de acceso seguro a la plataforma.

**Contexto:** Reemplaza a la antigua EP-001 (demasiado pequeña para ser épica).

**Criterios de aceptación:**
- Quedan definidos el setup del proyecto, la base de datos de usuarios y las funcionalidades de acceso seguro.

---

### HU-001 — Registro de cuenta de usuario

| Campo | Valor |
|---|---|
| ID | HU-001 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 8 SP |
| Dependencia | EN-008 |
| Responsable | JUAN DIEGO CARRANZA JACINTO |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-05-07 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-10 |

**Historia de usuario:** Como estudiante del curso de ML de UPAO, quiero crear una cuenta nueva con mi correo electrónico y una contraseña segura, para tener un perfil propio donde se guarden mis OVAs y acceder desde cualquier dispositivo.

**Criterios de aceptación:**
- El formulario valida en tiempo real el formato del correo electrónico.
- La contraseña exige mínimo 8 caracteres con combinación alfanumérica.
- La contraseña se almacena encriptada con bcrypt (nunca en texto plano).
- Se muestra un mensaje de error claro si el correo ya está registrado.
- Los campos adicionales de perfil (ID Universitario, Sexo, Teléfono) quedan en `null` para configurarse después.
- Tras el registro exitoso el usuario es redirigido automáticamente al dashboard.
- El endpoint `POST /auth/register` retorna 201 con JWT o 400 con mensaje de error descriptivo.

---

### HU-008 — Inicio de sesión con credenciales

| Campo | Valor |
|---|---|
| ID | HU-008 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 5 SP |
| Dependencia | HU-001 |
| Responsable | JUAN DIEGO CARRANZA JACINTO |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-05-11 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-13 |

**Historia de usuario:** Como estudiante del curso de ML de UPAO, quiero iniciar sesión con mi correo y contraseña, para acceder a la plataforma y mis proyectos.

**Contexto:** La sesión debe mantenerse activa entre visitas y existir protección básica contra accesos no autorizados.

**Criterios de aceptación:**
- El inicio de sesión exitoso genera un token JWT con expiración de 24 horas.
- El token se almacena de forma segura en el cliente (httpOnly cookie o localStorage).
- Tras 5 intentos fallidos consecutivos la cuenta queda bloqueada temporalmente (15 minutos).
- El botón de cerrar sesión elimina el token del cliente y redirige al login.
- Si el token expira, el usuario es redirigido automáticamente al login.
- El endpoint `POST /auth/login` retorna 200 con JWT o 401 con mensaje descriptivo.

---

### HU-009 — Recuperación de contraseña

| Campo | Valor |
|---|---|
| ID | HU-009 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Media |
| Estimación | 8 SP |
| Dependencia | HU-008 |
| Responsable | — |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-05-14 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-17 |

**Historia de usuario:** Como estudiante del curso de ML de UPAO, quiero recuperar mi cuenta mediante mi correo si olvido la contraseña, para no perder acceso a mis OVAs.

**Contexto:** Flujo esperado: solicitar reset → recibir correo con enlace → ingresar nueva contraseña con validaciones → confirmación visual → redirección al login.

**Criterios de aceptación:**
- Envía un enlace único con token al correo, con caducidad de 1 hora.
- El token es de un solo uso (UUID v4), almacenado en BD, invalidado tras uso o expiración.
- Permite actualizar la contraseña desde el enlace.
- El correo se envía vía SMTP/SendGrid con plantilla HTML y enlace directo al formulario de cambio.

---

### HU-010 — Maquetación del Layout Principal y Enrutamiento Modular

| Campo | Valor |
|---|---|
| ID | HU-010 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 8 SP |
| Dependencia | EN-010, SP-008 |
| Responsable | — |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-04-30 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-02 |

**Historia de usuario:** Como estudiante del curso de ML de UPAO, quiero una estructura de navegación coherente (Layout) en todas las pantallas, para moverme fácilmente por la plataforma.

**Criterios de aceptación:**
- Enrutador (ej. React Router) con las rutas base `/login`, `/dashboard`, `/crear-ova`.
- Layout base responsivo (Navbar, Sidebar, Container principal).
- Modularidad estricta: ningún componente del layout supera las 150-200 líneas (Navbar separado de sus items de menú).
- Funciona en local levantándolo vía el `package.json` de la raíz del monorepo.

---

### HU-015 — Ver y Editar Perfil de Usuario

| Campo | Valor |
|---|---|
| ID | HU-015 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 5 SP |
| Dependencia | HU-001, HU-008 |
| Responsable | JUAN DIEGO CARRANZA JACINTO |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-05-23 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-24 |

**Historia de usuario:** Como usuario autenticado, quiero ver y editar mis datos de perfil (nombre, correo, código universitario, sexo y teléfono) desde una pantalla de configuración, para mantener mi información actualizada.

**Criterios de aceptación:**
- El usuario puede visualizar su información personal.
- El usuario puede editar nombre, correo, código UPAO, sexo y teléfono.
- El sistema valida formato y longitud de los campos.
- El correo y el teléfono deben ser únicos.
- El perfil se actualiza sin reiniciar sesión.
- Se muestra notificación de éxito al guardar.

---

### HU-016 — Cambiar Contraseña desde el Perfil

> `(añadido fuera de captura · contenido del spec del repo `sdd/specs/HU-016_cambiar-contrasena.md`)` — Sprint/Prioridad/Estimación/Fecha **inferidos**.

| Campo | Valor |
|---|---|
| ID | HU-016 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Media (inferido) |
| Estimación | 3 SP (inferido) |
| Dependencia | HU-015 (inferido) |
| Responsable | — |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-05-24 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-24 (inferido) |

**Historia de usuario:** Como usuario autenticado, quiero cambiar mi contraseña desde la pantalla de perfil (estando logueado), para mantener la seguridad de mi cuenta sin pasar por el flujo de recuperación.

**Criterios de aceptación:**
- Formulario en `/profile`, sección "Seguridad de la Cuenta", con campos Contraseña Actual, Nueva Contraseña y Confirmar.
- El backend verifica la contraseña actual contra el hash bcrypt; si no coincide retorna 400 "La contraseña actual ingresada es incorrecta.".
- La nueva contraseña cumple los requisitos del registro (mínimo 8, alfanumérica).
- La nueva contraseña y su confirmación deben coincidir.
- Al éxito se muestra banner verde "¡Contraseña actualizada con éxito!", el formulario se limpia y la sesión se mantiene.
- Endpoint `POST /api/users/me/change-password`.

---

### HU-017 — Eliminar / dar de baja cuenta

> `(borrador — sin captura Notion ni spec; confirmar metadatos y criterios contra Notion)`

| Campo | Valor |
|---|---|
| ID | HU-017 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Media (inferido) |
| Estimación | 3 SP (inferido) |
| Dependencia | HU-008 (inferido) |
| Responsable | — |
| Fase | SDD - Plan + Implement |
| Fecha creación | — |
| Fecha actualización | — |
| Fecha Fin (info) | — |

**Historia de usuario:** Como usuario autenticado, quiero eliminar o dar de baja mi cuenta desde el perfil, para retirar mis datos del sistema cuando ya no use la plataforma.

**Criterios de aceptación (borrador):**
- Botón "Eliminar cuenta" en la sección de seguridad del perfil.
- Modal de confirmación explícito antes de proceder.
- Verificación de identidad (contraseña actual o confirmación escrita).
- La baja elimina o anonimiza los datos del usuario y sus OVAs asociados.
- Tras la baja se cierra la sesión y se redirige al login/registro.
- Se muestra mensaje de confirmación de la baja.

---

### HU-018 — Gestión de Roles — Crear Rol

| Campo | Valor |
|---|---|
| ID | HU-018 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 5 SP |
| Dependencia | EN-008 |
| Responsable | JUAN DIEGO CARRANZA JACINTO |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-05-17 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-18 |

**Historia de usuario:** Como administrador de la plataforma, quiero crear nuevos roles con permisos específicos, para definir qué acciones puede realizar cada tipo de usuario (estudiante, docente, administrador).

**Criterios de aceptación:**
- Las pantallas de gestión de roles y usuarios viven en un panel `/admin` con su propio layout, accesible solo para rol administrador.
- Existe una pantalla de gestión de roles dentro de `/admin`, inaccesible para rol usuario.
- El formulario de creación solicita nombre del rol y lista de permisos seleccionables.
- No se pueden crear dos roles con el mismo nombre.
- El nuevo rol aparece inmediatamente en la lista tras su creación.
- El endpoint `POST /roles` retorna 201 con los datos del rol creado.

---

### HU-019 — Gestión de Roles — Editar Rol

| Campo | Valor |
|---|---|
| ID | HU-019 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 5 SP |
| Dependencia | HU-018 |
| Responsable | JUAN DIEGO CARRANZA JACINTO |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-05-17 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-18 |

**Historia de usuario:** Como administrador de la plataforma, quiero editar el nombre y los permisos de un rol existente, para ajustar las capacidades de los usuarios sin eliminar y recrear roles.

**Criterios de aceptación:**
- La pantalla de edición de roles vive en `/admin`, inaccesible para rol usuario.
- Existe un botón "Editar" por cada rol en la lista.
- El formulario precarga los datos actuales del rol (nombre y permisos).
- Los cambios se reflejan inmediatamente para todos los usuarios con ese rol.
- No se puede editar el nombre de los roles del sistema (`administrador`, `usuario`).
- El endpoint `PATCH /roles/{id}` retorna 200 con los datos actualizados.

---

### HU-020 — Gestión de Roles — Eliminar Rol

| Campo | Valor |
|---|---|
| ID | HU-020 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Media |
| Estimación | 3 SP |
| Dependencia | HU-018 |
| Responsable | JUAN DIEGO CARRANZA JACINTO |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-05-17 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-18 |

**Historia de usuario:** Como administrador de la plataforma, quiero eliminar roles que ya no sean necesarios, para mantener el sistema de permisos ordenado.

**Criterios de aceptación:**
- La pantalla de eliminación de roles vive en `/admin`, inaccesible para rol usuario.
- Existe un botón "Eliminar" por cada rol, excepto los del sistema (`administrador`, `usuario`).
- Se muestra un modal de confirmación indicando cuántos usuarios serían afectados.
- Si el rol tiene usuarios asignados, solicita reasignarlos a otro rol antes de eliminar.
- El endpoint `DELETE /roles/{id}` retorna 204, o 409 si tiene usuarios asignados sin reasignar.

---

### HU-021 — Gestión de Roles — Asignar Rol a Usuario

| Campo | Valor |
|---|---|
| ID | HU-021 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 5 SP |
| Dependencia | HU-018 |
| Responsable | JUAN DIEGO CARRANZA JACINTO |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-05-17 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-18 |

**Historia de usuario:** Como administrador de la plataforma, quiero visualizar la lista de usuarios, editar sus perfiles extendidos (ID Universitario, Sexo y Teléfono), cambiar sus roles, activar/desactivar y desbloquear cuentas e iniciar el restablecimiento de contraseñas por correo y WhatsApp, para gestionar integralmente el acceso de las personas.

**Criterios de aceptación:**

*Acceso y seguridad*
- La gestión de usuarios está disponible en la ruta `/admin/users`.
- Solo acceden usuarios autenticados con el permiso `manage_users`.
- Usuarios sin dicho permiso son redirigidos a `/dashboard`.
- El backend rechaza accesos no autorizados con `403 forbidden`.

*Visualización de usuarios*
- Tabla paginada de usuarios registrados.
- La tabla incluye: nombre completo, correo, código UPAO, sexo, teléfono, fecha de registro, estado de la cuenta y rol asignado.
- El código UPAO se muestra con padding de ceros hasta 9 dígitos.
- El estado se visualiza como Activo, Inactivo o Bloqueado.

*Gestión de usuarios*
- Cada usuario tiene un menú de acciones administrativas, excepto el usuario autenticado.
- Acciones: editar datos del perfil, activar/desactivar cuentas, desbloquear cuentas, iniciar recuperación de contraseña por correo y generar recuperación por WhatsApp.
- La edición de perfil no permite modificar contraseñas.

*Recuperación de contraseña*
- El restablecimiento por correo genera un token temporal y envía un correo automáticamente.
- El restablecimiento por WhatsApp genera un código OTP y abre un enlace `wa.me` con mensaje preconfigurado.
- El sistema normaliza números telefónicos peruanos antes de generar el enlace de WhatsApp.

*Seguridad jerárquica*
- Un usuario no puede modificar su propio rol ni desactivar su propia cuenta.
- Usuarios con `manage_users` pero sin rol `administrador` no pueden modificar administradores ni asignar el rol `administrador`.
- El backend valida estas restricciones y responde `403 forbidden` ante intentos no autorizados.

---

### EN-008 — Habilitar Base de Datos para Gestión de Usuarios

| Campo | Valor |
|---|---|
| ID | EN-008 |
| Tipo | Habilitador |
| Épica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 5 SP |
| Dependencia | TA-001 |
| Responsable | JUAN DIEGO CARRANZA JACINTO |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-05-04 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-06 |

**Objetivo:** Desplegar y configurar el servidor PostgreSQL que almacenará credenciales, perfiles, OVAs y roles; prerequisito de todas las HU de autenticación, gestión de OVAs y roles.

**Criterios de aceptación:**
- PostgreSQL desplegado en Supabase y accesible desde el backend FastAPI vía Docker.
- Tablas creadas: users, ovas, sessions, roles, user_roles, password_reset_tokens.
- Conexión ORM (SQLAlchemy) configurada y probada con al menos una operación CRUD exitosa.
- Variables de entorno de conexión en .env, nunca en el código fuente.
- Script de migración disponible en `/backend/migrations/`.

---

### EN-010 — Configuración del Monorepo y Arquitectura Base React

| Campo | Valor |
|---|---|
| ID | EN-010 |
| Tipo | Habilitador |
| Épica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 5 SP |
| Dependencia | TA-001 |
| Responsable | — |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-04-28 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-04-29 |

**Objetivo:** Inicializar el monorepo con pnpm y configurar la arquitectura base del frontend en React con Tailwind, con reglas estrictas de linteo para archivos cortos.

**Criterios de aceptación:**
- Estructura de carpetas: GENOVA/ (raíz), frontend/, backend/, docs/.
- Workspace de pnpm inicializado para gestionar dependencias sin conflictos.
- Proyecto React inicializado con Tailwind CSS.
- ESLint y Prettier configurados con regla que advierte/bloquea si un archivo supera 200 líneas.

---

### EN-011 — Setup Base de FastAPI y Orquestación Local (Docker)

| Campo | Valor |
|---|---|
| ID | EN-011 |
| Tipo | Habilitador |
| Épica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 5 SP |
| Dependencia | TA-001 |
| Responsable | — |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-04-28 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-04-29 |

**Objetivo:** Configurar la base del backend (FastAPI) y la orquestación local con Docker Compose, para que el frontend se comunique desde el día 1 con las APIs de los módulos (RAG, Agentes, SCORM) en un entorno replicable.

**Criterios de aceptación:**
- Proyecto FastAPI inicializado en `GENOVA/backend/` con subcarpetas `agents/`, `rag/`, `scorm/`.
- `docker-compose.yml` en la raíz que levanta simultáneamente Frontend (React) y Backend (FastAPI).
- `docker-compose.prod.yml` vacío o base preparado para producción.
- CORS configurado en FastAPI para aceptar peticiones del frontend local.

---

### TA-001 — Configuración de repositorios y ramas

| Campo | Valor |
|---|---|
| ID | TA-001 |
| Tipo | Tarea Técnica |
| Épica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 2 SP |
| Dependencia | — |
| Responsable | — |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-04-27 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-04-27 |

**Objetivo:** Inicializar GitHub, configurar ramas y entornos de desarrollo, crear la estructura frontend/ backend/ docs/, definir convención de commits y dejar todo listo para clonar y trabajar el mismo día.

**Criterios de aceptación:**
- Repo con branches, .gitignore y permisos listos (< 2 horas).
- Estructura de ramas: main protegida, develop y feature/*.
- .gitignore con node_modules, .env, dist y archivos sensibles.
- Permisos de escritura solo para JC y JR.
- README inicial con instrucciones de setup y plantilla de Pull Request.

---

### TA-006 — Configuración del Entorno de Producción y Despliegue del Backend en Render

| Campo | Valor |
|---|---|
| ID | TA-006 |
| Tipo | Tarea Técnica |
| Épica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 3 SP |
| Dependencia | TA-001, EN-008, EN-011 |
| Responsable | JEFFRY ANDERSON ROMERO URIOL |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-05-18 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-19 |

**Objetivo:** Configurar el entorno de producción en Render para el backend FastAPI: enlazar el repo de GitHub, configurar el despliegue Docker e inyectar variables de entorno para conectar Supabase.

**Criterios de aceptación:**
- Web Service creado en Render conectado a la rama `develop` (o la de integración).
- El despliegue lee la configuración Docker/FastAPI sin errores de orquestación.
- Variables críticas (`DATABASE_URL`, `JWT_SECRET`, etc.) configuradas de forma segura en Render, no expuestas en código.
- CD validado: cualquier push a la rama activa gatilla un nuevo deploy automático.
- La URL pública responde 200 en su ruta base o endpoint de salud (`/docs` o `/health`).

---

### TA-007 — Configuración y Despliegue del Frontend en Vercel

| Campo | Valor |
|---|---|
| ID | TA-007 |
| Tipo | Tarea Técnica |
| Épica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 3 SP |
| Dependencia | TA-001, EN-010, TA-006, HU-010 |
| Responsable | JUAN DIEGO CARRANZA JACINTO |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-05-18 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-19 |

**Objetivo:** Configurar el proyecto en Vercel para el despliegue automático del frontend React: calibrar Root Directory del monorepo, definir build commands y enlazar variables de entorno hacia el backend en Render.

**Criterios de aceptación:**
- Proyecto en Vercel conectado al repo, aislando la carpeta del frontend en el monorepo.
- Despliegues automáticos: Preview para Pull Requests y Production para la rama principal.
- Variable de cliente (`VITE_API_URL` o equivalente) apuntando a la URL pública de Render (TA-006).
- La aplicación compila en la nube y la URL pública muestra el Layout Principal modular (HU-010).

---

## EP-3 — Interfaz de Creación y Gestión de OVAs (SDD — Fase Implement)

| Campo | Valor |
|---|---|
| ID | EP-3 |
| Tipo | Épica |
| Épica/Tema | SDD — Implement |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | — |
| Estimación | — |
| Dependencia | — |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-11 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 |

**Objetivo:** Agrupar toda la interfaz de usuario para crear, visualizar y gestionar OVAs. En Sprint 1 se implementa la estructura visual; la conexión real con los agentes IA se realiza en Sprint 2 (EN-009).

**Criterios de aceptación:**
- Queda definida la interfaz para crear, visualizar y gestionar OVAs.
- Estructura visual en Sprint 1 y conexión IA en Sprint 2.

---

### HU-002 — Crear nuevo OVA desde prompt

| Campo | Valor |
|---|---|
| ID | HU-002 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 8 SP |
| Dependencia | SP-008, SP-001 |
| Responsable | JEFFRY ANDERSON ROMERO URIOL |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-11 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-14 |

**Historia de usuario:** Como estudiante del curso de ML de UPAO, quiero ingresar un tema de ML en un prompt y seleccionar el modelo LLM, para generar automáticamente el material educativo.

**Contexto:** Entrada principal al sistema; el prompt define el tema (ej. 'Árboles de decisión') y la elección de LLM impacta costo y calidad del OVA.

**Criterios de aceptación:**
- Formulario con selector LLM (OpenAI/Gemini según SP-001, ampliable a otros) y botón Generar.
- El prompt admite hasta 2000 caracteres con contador visible.
- Selector LLM con opciones validadas tras SP-001.
- Validaciones de entrada (no vacío, longitud mínima).
- Indicador de progreso durante la generación del OVA.

---

### HU-003 — Visualizar completa 5E

| Campo | Valor |
|---|---|
| ID | HU-003 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 13 SP |
| Dependencia | HU-002, HU-007, SP-008 |
| Responsable | JEFFRY ANDERSON ROMERO URIOL |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 |

**Historia de usuario:** Como estudiante del curso de ML de UPAO, quiero ver una vista previa de las 5 fases (5E), para revisar el contenido pedagógico antes de exportar.

**Contexto:** Output principal del OVA antes de empaquetar; permite auditar el contenido generado por la IA y verificar coherencia con el modelo 5E (SP-002).

**Criterios de aceptación:**
- 100% de módulos visibles sin truncamiento; estructura visual de las 5 fases presente.
- Vista navegable por pestañas o secciones desplegables (una por fase E).
- Renderiza texto enriquecido, listas, imágenes y bloques de código.
- Deja preparado un botón 'Editar' por fase para el Sprint 2.

---

### HU-006 — Ver historial de OVAs

| Campo | Valor |
|---|---|
| ID | HU-006 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 5 SP |
| Dependencia | EN-008 |
| Responsable | JEFFRY ANDERSON ROMERO URIOL |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-18 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 |

**Historia de usuario:** Como estudiante del curso de ML de UPAO, quiero ver el historial de OVAs creados, para gestionarlos o descargarlos nuevamente.

**Contexto:** Centraliza el trabajo del estudiante: reutilizar OVAs, descargar versiones antiguas y eliminar obsoletas sin regenerarlas.

**Criterios de aceptación:**
- Lista paginada con preview, fecha y estado de cada OVA.
- Orden por fecha descendente, paginación de 10 por página.
- Búsqueda por título y filtro por estado (borrador/generando/listo/error).
- Acciones 'Descargar' y 'Eliminar' por cada OVA.

---

### HU-007 — Subir archivos base para el OVA

| Campo | Valor |
|---|---|
| ID | HU-007 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 8 SP |
| Dependencia | SP-008 |
| Responsable | JEFFRY ANDERSON ROMERO URIOL |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-11 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-14 |

**Historia de usuario:** Como estudiante del curso de ML de UPAO, quiero subir archivos adjuntos, para que la IA utilice mi propio material como contexto.

**Contexto:** Enriquece el contexto del agente con materiales propios (apuntes, slides, audios), mejorando pertinencia y profundidad del OVA.

**Criterios de aceptación:**
- Soporta carga de PDF, DOCX, PPTX y audio.
- Carga múltiple de hasta 5 archivos simultáneos.
- Tamaño máximo 20MB por archivo.
- Validación por MIME-type.
- Indicador visual de carga exitosa.
- Almacenamiento temporal hasta confirmar la generación del OVA.

---

### HU-011 — Editar OVA Generado

| Campo | Valor |
|---|---|
| ID | HU-011 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 8 SP |
| Dependencia | HU-003, HU-006 |
| Responsable | JEFFRY ANDERSON ROMERO URIOL |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-17 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 |

**Historia de usuario:** Como estudiante del curso de ML de UPAO, quiero editar el contenido de un OVA ya generado (prompt original o texto de fases individuales), para corregir o mejorar el material sin regenerarlo desde cero.

**Criterios de aceptación:**
- Existe un botón "Editar" accesible por cada OVA desde el historial o la vista previa.
- El usuario puede modificar el prompt original y regenerar el OVA completo.
- El usuario puede editar el texto de una fase individual sin regenerar las demás.
- Los cambios se guardan como una nueva versión del OVA en la base de datos.
- El OVA editado puede volver a exportarse como SCORM con el contenido actualizado.

---

### HU-012 — Eliminar OVA del Historial

| Campo | Valor |
|---|---|
| ID | HU-012 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Media |
| Estimación | 3 SP |
| Dependencia | HU-006 |
| Responsable | JEFFRY ANDERSON ROMERO URIOL |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-17 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 |

**Historia de usuario:** Como estudiante del curso de ML de UPAO, quiero eliminar OVAs que ya no necesito del historial, para mantener mi espacio de trabajo organizado.

**Criterios de aceptación:**
- Existe un botón "Eliminar" por cada OVA en el historial.
- Antes de eliminar se muestra un modal de confirmación con el nombre del OVA.
- Confirmada, la eliminación es permanente y el OVA desaparece del historial.
- Si el OVA tenía un paquete SCORM asociado, también se elimina del servidor.
- Se muestra un mensaje de éxito tras la eliminación.

---

### HU-013 — Duplicar OVA Existente

| Campo | Valor |
|---|---|
| ID | HU-013 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Media |
| Estimación | 5 SP |
| Dependencia | HU-006 |
| Responsable | JEFFRY ANDERSON ROMERO URIOL |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-17 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 |

**Historia de usuario:** Como estudiante del curso de ML de UPAO, quiero duplicar un OVA existente, para usarlo como punto de partida de un material relacionado sin empezar desde cero.

**Criterios de aceptación:**
- Existe un botón "Duplicar" por cada OVA en el historial.
- El duplicado aparece con el nombre original más el sufijo "(copia)".
- El duplicado es independiente del original (editar uno no afecta al otro).
- El usuario puede editar el duplicado inmediatamente tras crearlo.

---

### HU-014 — Renombrar y Editar Metadatos del OVA

| Campo | Valor |
|---|---|
| ID | HU-014 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Media |
| Estimación | 3 SP |
| Dependencia | HU-006 |
| Responsable | JEFFRY ANDERSON ROMERO URIOL |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-17 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 |

**Historia de usuario:** Como estudiante del curso de ML de UPAO, quiero cambiar el título y la descripción de un OVA desde el historial, para organizarlos con nombres descriptivos sin abrirlos.

**Criterios de aceptación:**
- Se puede editar título y descripción desde la tarjeta del historial (inline o modal).
- El título es obligatorio, máximo 100 caracteres.
- Los cambios se guardan automáticamente o con un botón de confirmación.
- El nuevo nombre se refleja inmediatamente sin recargar la página.

---

### HU-022 — Recuperación de recursos parciales tras error de generación

> `(añadido — roadmap editor OVA)`

| Campo | Valor |
|---|---|
| ID | HU-022 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 8 SP (inferido) |
| Dependencia | HU-002, EN-012 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

**Historia de usuario:** Como estudiante del curso de ML de UPAO, quiero recuperar los recursos que sí se generaron cuando la creación de un OVA falla a mitad, para conservar al menos un resultado parcial.

**Contexto:** Los errores pueden ser del modelo, agotamiento de tokens u otros; si al menos un recurso se creó, no debe perderse.

**Criterios de aceptación:**
- Si la generación falla pero al menos un recurso se creó, los recursos generados quedan disponibles para el usuario.
- En la ubicación del recurso fallido se muestra un mensaje tipo "Lo sentimos, hubo un error generando el recurso. Error ID: ----".
- Cada error de recurso genera un Error ID rastreable (registrado por EN-012).
- En la lista de recursos de la página de creación, el recurso con error se marca con una "X".

---

### HU-023 — Generación de OVA en background persistente y reanudación

> `(añadido — roadmap editor OVA)`

| Campo | Valor |
|---|---|
| ID | HU-023 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 13 SP (inferido) |
| Dependencia | HU-002, EN-013 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

**Historia de usuario:** Como estudiante del curso de ML de UPAO, quiero que la generación de un OVA continúe aunque cierre o recargue la pestaña, para no perder el progreso y retomarlo después.

**Criterios de aceptación:**
- La generación continúa en segundo plano aunque se cierre o recargue la pestaña.
- El estado de la generación se persiste (mediante EN-013).
- Desde "Mis OVAs" el usuario puede volver a la sesión de generación en curso.
- Al reabrir, la vista refleja los recursos ya generados y los pendientes.

---

### HU-024 — Carga de archivos contextuales estilo chat

> `(añadido — roadmap editor OVA)` — extiende HU-007.

| Campo | Valor |
|---|---|
| ID | HU-024 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Media |
| Estimación | 3 SP (inferido) |
| Dependencia | HU-007 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

**Historia de usuario:** Como estudiante del curso de ML de UPAO, quiero subir archivos de contexto con un ícono junto al prompt (estilo chat de LLM), para adjuntar material sin un panel separado.

**Contexto:** Reemplaza el diseño actual de "Archivos de contexto"; no necesita explicar qué es RAG.

**Criterios de aceptación:**
- Un ícono de subir archivo junto al cuadro de tema/prompt.
- Sobre el cuadro de prompt aparece una sección pequeña con el archivo cargado y su tamaño (estilo LLM).
- No se muestra explicación de RAG; solo el ícono y el chip del archivo.
- Mantiene las validaciones de HU-007 (formatos, tamaño, MIME-type).

---

### HU-025 — Workspace de edición de OVA (panel dividido)

> `(añadido — roadmap editor OVA)` — reubica parte del flujo de HU-002/HU-003/HU-004.

| Campo | Valor |
|---|---|
| ID | HU-025 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 13 SP (inferido) |
| Dependencia | HU-003, HU-004 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

**Historia de usuario:** Como estudiante del curso de ML de UPAO, quiero un workspace con el chat de creación a la izquierda y el OVA a la derecha, para crear, previsualizar y editar en una sola vista.

**Contexto:** Al pulsar "Generar OVA" se abre esta vista (misma página, con botón "Atrás" que lleva a "Mis OVAs").

**Criterios de aceptación:**
- Al pulsar "Crear OVA" el chat se desplaza a la izquierda y muestra el proceso de creación.
- Panel dividido con proporciones ajustables mediante una línea central.
- A la derecha, sección que muestra el OVA con botones "Preview" y "Code".
- Botón de descarga en formato SCORM en el panel derecho.
- El cuadro de prompt permite subir archivos (como en HU-024).
- Botón "Atrás" que regresa a "Mis OVAs" (no a crear de nuevo).

---

### HU-026 — Edición de recurso por click en el preview

> `(añadido — roadmap editor OVA)`

| Campo | Valor |
|---|---|
| ID | HU-026 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 8 SP (inferido) |
| Dependencia | HU-025 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

**Historia de usuario:** Como estudiante del curso de ML de UPAO, quiero hacer click en cualquier parte del preview del OVA para editar o regenerar ese recurso, para ajustar partes puntuales sin rehacer todo.

**Criterios de aceptación:**
- Al hacer click en una parte del preview se identifica el recurso (ligado a su código de origen).
- Aparecen las opciones "Regenerar" y "Editar".
- "Regenerar" rehace solo ese recurso (texto, imagen, etc.).
- "Editar" abre un cuadro para escribir un prompt que modifica solo esa sección.
- El cambio se refleja en el preview y en el código correspondiente.

---

### HU-027 — Selección de recursos como contexto del prompt

> `(añadido — roadmap editor OVA)`

| Campo | Valor |
|---|---|
| ID | HU-027 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Media |
| Estimación | 5 SP (inferido) |
| Dependencia | HU-025, HU-026 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

**Historia de usuario:** Como estudiante del curso de ML de UPAO, quiero seleccionar qué recursos del OVA recibe mi prompt, para que la modificación aplique solo a lo seleccionado.

**Criterios de aceptación:**
- Botón "Seleccionar recursos" junto al cuadro de prompt tras la generación.
- Los recursos del OVA se pueden seleccionar y deseleccionar.
- El prompt enviado aplica únicamente a los recursos seleccionados.
- La selección actual es visible para el usuario.

---

### HU-028 — Versionado de OVA (historial, diff y revertir)

> `(añadido — roadmap editor OVA)` — extiende el versionado ya parcialmente implementado.

| Campo | Valor |
|---|---|
| ID | HU-028 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 8 SP (inferido) |
| Dependencia | HU-011, HU-025 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

**Historia de usuario:** Como estudiante del curso de ML de UPAO, quiero ver la versión del OVA, su historial de cambios y poder revertir, para recuperar una versión anterior si no me gusta la nueva.

**Contexto:** El versionado aplica al OVA completo (1.0/2.0).

**Criterios de aceptación:**
- La versión del OVA se muestra junto al botón de descarga SCORM.
- Junto a "Descargar como SCORM" hay un botón de historial.
- El historial permite comparar (diff) preview y código entre versiones.
- El usuario puede revertir a una versión anterior.
- Antes de aplicar un cambio o revertir, un modal pide confirmación.
- Botones para duplicar y eliminar el OVA quedan ocultos tras "…".

---

### HU-029 — Micro-versionado por recurso editado

> `(añadido — roadmap editor OVA)`

| Campo | Valor |
|---|---|
| ID | HU-029 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Media |
| Estimación | 5 SP (inferido) |
| Dependencia | HU-028 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

**Historia de usuario:** Como estudiante del curso de ML de UPAO, quiero versionar cada cambio puntual de un recurso (1.1, 1.2, 1.3…), para distinguir ediciones menores del versionado global del OVA (1.0/2.0).

**Criterios de aceptación:**
- Al editar un recurso específico, el cambio se versiona como 1.1, 1.2, 1.3… (no salta a 2.0).
- El versionado global del OVA (1.0/2.0) se mantiene independiente del micro-versionado por recurso.
- Cada micro-versión queda registrada en el historial del recurso.
- Es posible revertir un recurso a una micro-versión anterior.

---

### HU-030 — "Mis OVAs": acceso al workspace + versión en metadata

> `(añadido — roadmap editor OVA)` — modifica HU-006/HU-011.

| Campo | Valor |
|---|---|
| ID | HU-030 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Media |
| Estimación | 3 SP (inferido) |
| Dependencia | HU-006, HU-025 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

**Historia de usuario:** Como estudiante del curso de ML de UPAO, quiero que en "Mis OVAs" el botón lleve al workspace de edición y se muestre la versión del OVA, para entrar directo a editar y conocer su versión.

**Contexto:** Reemplaza el botón "Editar" por el acceso al workspace (HU-025); duplicar, descargar y papelera se mantienen.

**Criterios de aceptación:**
- En "Mis OVAs" el botón de cada OVA lleva al workspace (HU-025) en lugar de "Editar".
- La metadata del OVA muestra su versión.
- Las acciones duplicar, descargar y eliminar (papelera) se conservan tal cual.

---

### EN-012 — Observabilidad de errores de generación en Supabase

> `(añadido — roadmap editor OVA)` — soporta HU-022.

| Campo | Valor |
|---|---|
| ID | EN-012 |
| Tipo | Habilitador |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 5 SP (inferido) |
| Dependencia | EN-008 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

**Objetivo:** Registrar cada error de generación de recursos en Supabase (u otra plataforma de análisis) con un Error ID rastreable, para diagnosticar fallos del modelo, tokens u otros.

**Criterios de aceptación:**
- Cada error que afecta a un recurso se registra en Supabase con un Error ID único.
- El registro incluye contexto del fallo (tipo de error, recurso afectado, OVA, timestamp).
- El Error ID expuesto al usuario coincide con el registrado para su búsqueda.
- No se filtran credenciales ni tokens en el log (sanitización).

---

### EN-013 — Persistencia del estado de generación (jobs)

> `(añadido — roadmap editor OVA)` — soporta HU-023.

| Campo | Valor |
|---|---|
| ID | EN-013 |
| Tipo | Habilitador |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 8 SP (inferido) |
| Dependencia | EN-008 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

**Objetivo:** Persistir el estado de cada generación de OVA (jobs y progreso por recurso) para soportar la generación en background y la reanudación.

**Criterios de aceptación:**
- El estado de la generación (pendiente/en proceso/listo/error por recurso) se persiste en BD.
- La generación continúa aunque el cliente se desconecte.
- El estado puede consultarse para reanudar la sesión desde "Mis OVAs".
- Reintentos y timeouts por recurso quedan reflejados en el estado.

---

### RN-005 — Frontend responsive

> `(propuesto)` — atributo de calidad recalcado por el usuario.

| Campo | Valor |
|---|---|
| ID | RN-005 |
| Tipo | Req. No Funcional |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Media |
| Estimación | — |
| Dependencia | — |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | — |
| Fecha actualización | — |
| Fecha Fin (info) | — |

**Objetivo:** Garantizar que toda la interfaz del frontend sea responsive y usable en escritorio, tablet y móvil.

**Contexto:** Aplica a todas las vistas, incluido el nuevo workspace de edición.

**Criterios de aceptación:**
- Todas las vistas se adaptan a escritorio, tablet y móvil sin scroll horizontal ni solapamientos.
- Los componentes del layout y el workspace mantienen usabilidad en pantallas pequeñas.
- Cumple buenas prácticas de diseño responsive (breakpoints, contenedores fluidos).
- Verificable en anchos de referencia comunes (≤ 360px, 768px, ≥ 1280px).

---

## EP-4 — Motor de Exportación SCORM (SDD — Fase Implement)

| Campo | Valor |
|---|---|
| ID | EP-4 |
| Tipo | Épica |
| Épica/Tema | SDD — Implement |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | — |
| Estimación | — |
| Dependencia | — |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-04 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-21 |

**Objetivo:** Agrupar la investigación, el template base y la funcionalidad de empaquetado SCORM. Se implementa en Sprint 1 por indicación del docente; la generación real de contenido vía IA se conecta en Sprint 2.

**Criterios de aceptación:**
- Se consolidan investigación, template base y funcionalidad de empaquetado SCORM con implementación inicial en Sprint 1.

---

### HU-004 — Exportar OVA como paquete SCORM

| Campo | Valor |
|---|---|
| ID | HU-004 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP4: Motor de Exportacion SCORM |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 13 SP |
| Dependencia | TA-002 |
| Responsable | JEFFRY ANDERSON ROMERO URIOL |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-21 |

**Historia de usuario:** Como estudiante del curso de ML de UPAO, quiero exportar el OVA en formato SCORM, para integrarlo en el LMS Canvas de la UPAO.

**Contexto:** Producto final entregable: paquete SCORM importable en Canvas y ejecutable sin dependencias externas, que registra el progreso del estudiante.

**Criterios de aceptación:**
- Descarga de un .zip funcional con estructura SCORM válida (con contenido de prueba mientras no haya IA).
- Botón 'Exportar SCORM' visible en la vista del OVA.
- El .zip contiene imsmanifest.xml, carpeta resources/ con HTML/CSS/JS e índice navegable.
- Validable formalmente por TA-005 en SCORM Cloud.

---

### TA-002 — Crear template base SCORM XML

| Campo | Valor |
|---|---|
| ID | TA-002 |
| Tipo | Tarea Técnica |
| Épica/Tema | EP4: Motor de Exportacion SCORM |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 3 SP |
| Dependencia | SP-006 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-04 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-04 |

**Objetivo:** Generar los archivos imsmanifest.xml genéricos como base del empaquetado, reutilizables por el motor de HU-004 para envolver el contenido de los agentes en un paquete SCORM para Canvas.

**Criterios de aceptación:**
- imsmanifest.xml válido bajo SCORM 1.2 (< 3 horas).
- El template incluye carpeta resources/, un index.html base y una hoja de estilos común.
- Placeholders identificados para inyectar el contenido generado por la IA en cada fase 5E.

---

## EP-5 — Especificación del Sistema Multiagente (Prometheus — Fase 1: System Specification)

| Campo | Valor |
|---|---|
| ID | EP-5 |
| Tipo | Épica |
| Épica/Tema | Prometheus — System Specification |
| Sprint | Sprint 2 |
| Status | To Do |
| Prioridad | — |
| Estimación | — |
| Dependencia | — |
| Responsable | — |
| Fase | Prometheus - System Specification |
| Fecha creación | 2026-05-25 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-06-07 |

**Objetivo:** Definir las metas globales del sistema de agentes, los escenarios de uso y los protocolos de comunicación entre agentes.

**Criterios de aceptación:**
- Quedan definidas las metas globales del sistema de agentes, los escenarios de uso y los protocolos de comunicación.

---

### EN-003 — Habilitar orquestación de agentes Prometheus

| Campo | Valor |
|---|---|
| ID | EN-003 |
| Tipo | Habilitador |
| Épica/Tema | EP5: Especificacion del Sistema Multiagente |
| Sprint | Sprint 2 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 13 SP |
| Dependencia | SP-007, SP-001 |
| Responsable | — |
| Fase | Prometheus - System Specification |
| Fecha creación | 2026-05-29 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-06-07 |

**Objetivo:** Implementar el motor de orquestación central en el backend que coordina los agentes multimodales bajo Prometheus: recibe el prompt, distribuye subtareas entre agentes especializados (5E), agrega resultados y los devuelve listos para la vista 5E y el empaquetado SCORM.

**Criterios de aceptación:**
- API interna funcional con manejo de errores y reintentos configurados.
- Bus de mensajes interno (cola o eventos).
- Políticas de reintento exponencial y timeouts por agente.
- Logs estructurados con correlation IDs.
- Endpoint `/generate-ova` que coordina al menos los agentes de planificación, contenido y evaluación.

---

### SP-007 — Metodología Prometheus para Agentes

| Campo | Valor |
|---|---|
| ID | SP-007 |
| Tipo | Spike |
| Épica/Tema | EP5: Especificacion del Sistema Multiagente |
| Sprint | Sprint 2 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 8 SP |
| Dependencia | — |
| Responsable | — |
| Fase | Prometheus - System Specification |
| Fecha creación | 2026-05-25 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-28 |

**Objetivo:** Investigar el marco de diseño Prometheus para estructurar la comunicación y decisión de los agentes de IA, base oficial del Sprint 2, formalizada antes de codificar el orquestador EN-003.

**Criterios de aceptación:**
- Diagrama de arquitectura de agentes (metas, percepciones y acciones) según Prometheus.
- Entrega los tres niveles Prometheus: System Specification (goals y scenarios), Architectural Design (agent acquaintance + interaction diagrams) y Detailed Design (capabilities, internal events y plans).
- Aplicado al caso de los agentes generadores de OVA.

---

## EP-6 — Base de Conocimiento Contextual RAG (Prometheus — Fase 3: Detailed Design)

| Campo | Valor |
|---|---|
| ID | EP-6 |
| Tipo | Épica |
| Épica/Tema | Prometheus — Detailed Design |
| Sprint | Sprint 2 |
| Status | To Do |
| Prioridad | — |
| Estimación | — |
| Dependencia | — |
| Responsable | — |
| Fase | Prometheus - Detailed Design |
| Fecha creación | 2026-05-25 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-06-13 |

**Objetivo:** Implementar el componente de percepción de los agentes: la base vectorial y el pipeline RAG (mecanismo de percepciones del Detailed Design en Prometheus).

**Criterios de aceptación:**
- Se implementa el componente de percepción (base vectorial + pipeline RAG) para alimentar la generación con contexto confiable.

---

### EN-004 — Habilitar pgvector (BD Vectorial)

| Campo | Valor |
|---|---|
| ID | EN-004 |
| Tipo | Habilitador |
| Épica/Tema | EP6: Base de Conocimiento Contextual RAG |
| Sprint | Sprint 2 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 8 SP |
| Dependencia | — |
| Responsable | — |
| Fase | Prometheus - Detailed Design |
| Fecha creación | 2026-05-25 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-30 |

**Objetivo:** Desplegar y configurar la base vectorial pgvector para almacenar embeddings de contenido de ML; fundamento del RAG para que los agentes consulten contenido verificado y reduzcan alucinaciones.

**Criterios de aceptación:**
- BD accesible, documentos de ML indexados y consultas de similitud operativas.
- Tabla embeddings con dimensiones definidas (1536 OpenAI o 768 Gemini según SP-001).
- Índice HNSW o IVFFlat para búsqueda eficiente.
- Scripts de ingesta de los 50 recursos de SP-003.
- Consultas top-k (k=5) por similitud coseno en < 500 ms.

---

### EN-005 — Habilitar pipeline RAG end-to-end

| Campo | Valor |
|---|---|
| ID | EN-005 |
| Tipo | Habilitador |
| Épica/Tema | EP6: Base de Conocimiento Contextual RAG |
| Sprint | Sprint 2 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 13 SP |
| Dependencia | EN-004 |
| Responsable | — |
| Fase | Prometheus - Detailed Design |
| Fecha creación | 2026-06-01 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-06-10 |

**Objetivo:** Desarrollar el pipeline técnico completo embedding → retrieval → generación aumentada, conectando la BD vectorial (EN-004) con los agentes generadores.

**Criterios de aceptación:**
- Accuracy > 88.67% validada contra contenido de referencia.
- Evaluación sobre un dataset de ≥ 20 preguntas de ML con respuestas de referencia.
- Mide precisión semántica (BERTScore o similar).
- Reporte que documenta metodología, dataset, métricas y comparación con generación sin RAG (baseline).

---

### RN-002 — Tiempo de generación ≤ 180 segundos (MTTG)

| Campo | Valor |
|---|---|
| ID | RN-002 |
| Tipo | Req. No Funcional |
| Épica/Tema | EP6: Base de Conocimiento Contextual RAG |
| Sprint | Sprint 2 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 8 SP |
| Dependencia | EN-003, EN-005 |
| Responsable | — |
| Fase | Prometheus - Detailed Design |
| Fecha creación | 2026-06-11 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-06-13 |

**Objetivo:** Garantizar que el tiempo desde el envío del prompt hasta la descarga del SCORM sea ≤ 180 s (MTTG); rendimiento mínimo aceptable en producción.

**Contexto:** Métrica de UX del Charter; una espera > 3 minutos rompe el flujo y reduce la adopción.

**Criterios de aceptación:**
- Pruebas confirman MTTG < 180 s desde prompt hasta paquete SCORM.
- Medición sobre al menos 10 generaciones con temas distintos, registrando P50 y P90.
- Identificación de cuellos de botella (retrieval, generación LLM, empaquetado).
- Optimizaciones aplicadas (caché, paralelización de agentes, streaming) si no se cumple la meta.

---

## EP-7 — Despliegue e Infraestructura Cloud (Prometheus — Fase 2: Architectural Design)

| Campo | Valor |
|---|---|
| ID | EP-7 |
| Tipo | Épica |
| Épica/Tema | Prometheus — Architectural Design |
| Sprint | Sprint 2 |
| Status | To Do |
| Prioridad | — |
| Estimación | — |
| Dependencia | — |
| Responsable | — |
| Fase | Prometheus - Architectural Design |
| Fecha creación | 2026-05-25 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-06-21 |

**Objetivo:** Cubrir la selección e implementación del orquestador de contenedores y el despliegue completo en producción; al cierre (semana 11) el producto debe estar desplegado y funcional.

**Criterios de aceptación:**
- Quedan cubiertos selección de orquestación, despliegue productivo y estabilidad operativa.
- El sistema queda completamente funcional al cierre de la semana 11.

---

### EN-006 — Habilitar entornos Cloud y orquestación

| Campo | Valor |
|---|---|
| ID | EN-006 |
| Tipo | Habilitador |
| Épica/Tema | EP7: Despliegue e Infraestructura Cloud |
| Sprint | Sprint 2 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 8 SP |
| Dependencia | SP-004 |
| Responsable | — |
| Fase | Prometheus - Architectural Design |
| Fecha creación | 2026-06-15 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-06-19 |

**Objetivo:** Desplegar contenedores y el orquestador seleccionado en la nube (AWS/Azure/GCP); hito que pasa el sistema de local a productivo, accesible para los 60+ estudiantes de la evaluación SUS.

**Criterios de aceptación:**
- Sistema web público en producción, estable y accesible desde cualquier navegador.
- URL pública con dominio (o subdominio) y HTTPS con certificado válido (Let's Encrypt).
- Uptime monitoreado y logs centralizados.
- Variables de entorno separadas por ambiente (dev/staging/prod).
- Rollback documentado en caso de fallo.

---

### EN-009 — Integración Frontend ↔ Backend de Agentes

| Campo | Valor |
|---|---|
| ID | EN-009 |
| Tipo | Habilitador |
| Épica/Tema | EP7: Despliegue e Infraestructura Cloud |
| Sprint | Sprint 2 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 13 SP |
| Dependencia | EN-003 |
| Responsable | — |
| Fase | Prometheus - Architectural Design |
| Fecha creación | 2026-06-08 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-06-14 |

**Objetivo:** Conectar la interfaz web (Sprint 1) con el backend de agentes (Sprint 2), reemplazando los mocks del frontend con llamadas reales al orquestador EN-003 para un producto end-to-end.

**Criterios de aceptación:**
- Flujo completo: prompt → agente procesa → OVA en vista 5E → exporta SCORM con contenido IA real.
- Sin errores de comunicación entre capas.
- Contrato API REST documentado (OpenAPI/Swagger).
- Manejo de estados de carga (pending/processing/done/error) con polling o WebSocket.
- Validación de payloads.
- Tests E2E que recorren el flujo completo sin mocks.

---

### RN-003 — Seguridad y manejo de API Keys

| Campo | Valor |
|---|---|
| ID | RN-003 |
| Tipo | Req. No Funcional |
| Épica/Tema | EP7: Despliegue e Infraestructura Cloud |
| Sprint | Sprint 2 |
| Status | To Do |
| Prioridad | Media |
| Estimación | 5 SP |
| Dependencia | EN-006 |
| Responsable | — |
| Fase | Prometheus - Architectural Design |
| Fecha creación | 2026-06-19 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-06-20 |

**Objetivo:** Proteger todas las credenciales y claves API en el ciclo de vida del sistema desplegado.

**Contexto:** Las claves de OpenAI/Gemini son riesgo financiero alto si se filtran; requisito no funcional ineludible del Charter.

**Criterios de aceptación:**
- API Keys en variables de entorno, no expuestas en código ni logs.
- Uso de gestor de secretos (AWS Secrets Manager, Azure Key Vault o GitHub Secrets).
- Rotación de claves documentada.
- Escaneo automático del repo (TruffleHog/Gitleaks) en CI.
- Sanitización de logs para que no se filtren tokens en errores ni stack traces.

---

### RN-004 — Prueba de humo de rendimiento post-despliegue

| Campo | Valor |
|---|---|
| ID | RN-004 |
| Tipo | Req. No Funcional |
| Épica/Tema | EP7: Despliegue e Infraestructura Cloud |
| Sprint | Sprint 2 |
| Status | To Do |
| Prioridad | Media |
| Estimación | 5 SP |
| Dependencia | EN-006 |
| Responsable | — |
| Fase | Prometheus - Architectural Design |
| Fecha creación | 2026-06-20 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-06-21 |

**Objetivo:** Ejecutar una prueba de humo de rendimiento tras el despliegue para detectar problemas de latencia antes de Sprint 3 y reducir el riesgo de no cumplir RN-001.

**Criterios de aceptación:**
- Al menos 10 peticiones concurrentes respondidas sin errores.
- Tiempo de respuesta promedio registrado como baseline para Sprint 3.
- Prueba ejecutada con k6, JMeter o similar sobre endpoints críticos (login, crear OVA, exportar SCORM).
- Reporte con percentiles P50/P90/P99, tasa de error y consumo de recursos (CPU/RAM).

---

### SP-004 — Spike: Herramientas de Orquestación y Despliegue

| Campo | Valor |
|---|---|
| ID | SP-004 |
| Tipo | Spike |
| Épica/Tema | EP7: Despliegue e Infraestructura Cloud |
| Sprint | Sprint 2 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 3 SP |
| Dependencia | — |
| Responsable | — |
| Fase | Prometheus - Architectural Design |
| Fecha creación | 2026-05-25 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-26 |

**Objetivo:** Investigar orquestadores para la ejecución continua de los agentes en Cloud; decisión arquitectónica antes del despliegue (EN-006).

**Criterios de aceptación:**
- Recomendación documentada de tecnología de orquestación (Docker Swarm / K8s / PM2).
- Comparativa: complejidad de setup, costo en nube, escalado horizontal, healthchecks, observabilidad, curva de aprendizaje y compatibilidad con el stack.
- Decisión justificada y diagrama de despliegue propuesto.

---

## EP-8 — Validación Técnica y de Calidad (OE1 + OE2)

| Campo | Valor |
|---|---|
| ID | EP-8 |
| Tipo | Épica |
| Épica/Tema | Validación técnica |
| Sprint | Sprint 3 |
| Status | To Do |
| Prioridad | — |
| Estimación | — |
| Dependencia | — |
| Responsable | — |
| Fase | Validacion tecnica |
| Fecha creación | 2026-06-22 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-06-26 |

**Objetivo:** Agrupar todas las pruebas técnicas del sistema desplegado: rendimiento, precisión de IA y conformidad SCORM.

**Criterios de aceptación:**
- Se agrupan las pruebas técnicas (rendimiento, precisión IA y conformidad SCORM) para validar la calidad integral.

---

### EN-007 — Habilitar pruebas de integración en Canvas

| Campo | Valor |
|---|---|
| ID | EN-007 |
| Tipo | Habilitador |
| Épica/Tema | EP8: Validacion Tecnica y de Calidad |
| Sprint | Sprint 3 |
| Status | To Do |
| Prioridad | Media |
| Estimación | 8 SP |
| Dependencia | EP-4 (Motor de Exportación SCORM) |
| Responsable | — |
| Fase | Validacion tecnica |
| Fecha creación | 2026-06-22 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-06-26 |

**Objetivo:** Validar que los paquetes SCORM generados se importen y ejecuten correctamente en Canvas, confirmando que el producto es usable en el LMS oficial y descubriendo incompatibilidades tempranas.

**Criterios de aceptación:**
- Al menos 3 OVAs importados exitosamente en el Canvas real de la UPAO.
- Importación sin errores.
- Navegación correcta entre las 5 fases.
- Registro del progreso del estudiante en el gradebook de Canvas.
- Visualización adecuada en escritorio y móvil.
- Compatibilidad con los navegadores soportados oficialmente por la UPAO.

---

### RN-001 — Latencia ≤ 278 ms

| Campo | Valor |
|---|---|
| ID | RN-001 |
| Tipo | Req. No Funcional |
| Épica/Tema | EP8: Validacion Tecnica y de Calidad |
| Sprint | Sprint 3 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 13 SP |
| Dependencia | — |
| Responsable | — |
| Fase | Validacion tecnica |
| Fecha creación | 2026-06-22 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-06-26 |

**Objetivo:** Garantizar latencia promedio ≤ 278 ms en todas las peticiones cliente-servidor del entorno desplegado.

**Contexto:** Métrica de calidad del Charter (OE1); RN-004 provee el baseline; solo medible con el sistema completo en producción.

**Criterios de aceptación:**
- Pruebas de carga + Lighthouse confirman P90 ≤ 278 ms en producción.
- Mediciones sobre endpoints críticos (login, listar OVAs, abrir vista 5E, exportar SCORM).
- 50 usuarios virtuales concurrentes durante 5 minutos.
- Reporte con P50/P90/P99, tasa de error y comparación contra el baseline de RN-004.

---

### TA-003 — Ejecutar scripts de precisión IA

| Campo | Valor |
|---|---|
| ID | TA-003 |
| Tipo | Tarea Técnica |
| Épica/Tema | EP8: Validacion Tecnica y de Calidad |
| Sprint | Sprint 3 |
| Status | To Do |
| Prioridad | Media |
| Estimación | 2 SP |
| Dependencia | EN-005 |
| Responsable | — |
| Fase | Validacion tecnica |
| Fecha creación | 2026-06-24 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-06-25 |

**Objetivo:** Correr validadores de Accuracy del RAG y medir latencia de generación en producción, ejecutando los scripts de EN-005 sobre el sistema desplegado.

**Criterios de aceptación:**
- Reporte de Accuracy (> 88.67%) y latencia generado (< 4 hrs de ejecución).
- Incluye dataset usado, configuración del modelo y métricas por fase 5E.
- Distribución de latencias (histograma P50/P90/P99).
- Comparación entre OpenAI y Gemini para alimentar DO-003.

---

### TA-005 — Validación SCORM con SCORM Cloud Rustici

| Campo | Valor |
|---|---|
| ID | TA-005 |
| Tipo | Tarea Técnica |
| Épica/Tema | EP8: Validacion Tecnica y de Calidad |
| Sprint | Sprint 3 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 3 SP |
| Dependencia | HU-004 |
| Responsable | — |
| Fase | Validacion tecnica |
| Fecha creación | 2026-06-22 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-06-23 |

**Objetivo:** Ejecutar la herramienta oficial SCORM Cloud Rustici sobre el paquete generado para aportar evidencia externa de conformidad con el estándar SCORM (métrica OE2 del Charter).

**Criterios de aceptación:**
- 100% de validación exitosa (cero errores críticos) en SCORM Cloud Rustici o validador ADL.
- Reporte oficial descargado y archivado como evidencia.
- Captura de pantalla de la validación adjunta al entregable.
- Warnings menores documentados con justificación o plan de corrección.

---

## EP-9 — Evaluación de Usabilidad y UX (OE3)

| Campo | Valor |
|---|---|
| ID | EP-9 |
| Tipo | Épica |
| Épica/Tema | Evaluación UX |
| Sprint | Sprint 3 |
| Status | To Do |
| Prioridad | — |
| Estimación | — |
| Dependencia | — |
| Responsable | — |
| Fase | Evaluacion UX |
| Fecha creación | 2026-06-22 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-07-05 |

**Objetivo:** Agrupar la coordinación, preparación y ejecución formal de la evaluación con usuarios reales mediante el cuestionario SUS.

**Criterios de aceptación:**
- Se consolidan la preparación y ejecución formal de la evaluación SUS con usuarios reales.

---

### HU-005 — Evaluar plataforma mediante encuesta SUS

| Campo | Valor |
|---|---|
| ID | HU-005 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP9: Evaluacion de Usabilidad y UX |
| Sprint | Sprint 3 |
| Status | To Do |
| Prioridad | Media |
| Estimación | 13 SP |
| Dependencia | TA-004 |
| Responsable | — |
| Fase | Evaluacion UX |
| Fecha creación | 2026-06-29 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-07-05 |

**Historia de usuario:** Como estudiante del curso de ML de UPAO, quiero evaluar el sistema mediante la encuesta SUS, para dar retroalimentación sobre la usabilidad de la plataforma.

**Contexto:** Métrica oficial de OE3 del Charter; valida que la herramienta sea percibida como usable por la audiencia objetivo.

**Criterios de aceptación:**
- ≥ 60 respuestas recolectadas.
- Promedio SUS ≥ 90/100 puntos.
- Análisis estadístico descriptivo (media, desviación estándar, mediana).
- Análisis por subgrupo (cuatrimestre, experiencia previa con LMS).
- Comentarios cualitativos categorizados.
- Conclusiones con recomendaciones de mejora para futuras iteraciones.

---

### TA-004 — Preparación y coordinación de sesión SUS

| Campo | Valor |
|---|---|
| ID | TA-004 |
| Tipo | Tarea Técnica |
| Épica/Tema | EP9: Evaluacion de Usabilidad y UX |
| Sprint | Sprint 3 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 3 SP |
| Dependencia | — |
| Responsable | — |
| Fase | Evaluacion UX |
| Fecha creación | 2026-06-22 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-06-26 |

**Objetivo:** Coordinar con el docente del curso de ML el espacio en clase para aplicar la encuesta SUS, asegurando disponibilidad de los 60+ estudiantes y evitando bloqueos de última hora.

**Criterios de aceptación:**
- Formulario SUS digital listo.
- Permiso del docente confirmado.
- Fecha y horario de sesión coordinados con al menos 60 estudiantes.
- Formulario en Google Forms o Typeform con las 10 preguntas SUS estándar en español.
- Instrucciones de uso de la plataforma y consentimiento informado incluidos.
- Plan de logística (sala, computadoras, soporte técnico durante la sesión).

---

## EP-10 — Documentación y Cierre del Proyecto

| Campo | Valor |
|---|---|
| ID | EP-10 |
| Tipo | Épica |
| Épica/Tema | Documentación |
| Sprint | Sprint 3 |
| Status | To Do |
| Prioridad | — |
| Estimación | — |
| Dependencia | — |
| Responsable | — |
| Fase | Documentacion |
| Fecha creación | 2026-07-06 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-07-10 |

**Objetivo:** Agrupar todos los entregables finales de documentación técnica, manuales, videos y reportes comparativos.

**Criterios de aceptación:**
- Se completan los entregables finales de documentación técnica, manuales, videos y reportes comparativos para el cierre académico.

---

### DO-001 — Documentación técnica completa

| Campo | Valor |
|---|---|
| ID | DO-001 |
| Tipo | Documentación |
| Épica/Tema | EP10: Documentacion y Cierre |
| Sprint | Sprint 3 |
| Status | To Do |
| Prioridad | Media |
| Estimación | 8 SP |
| Dependencia | Todas las EP |
| Responsable | — |
| Fase | Documentacion |
| Fecha creación | 2026-07-06 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-07-09 |

**Objetivo:** Generar manuales técnicos y de usuario, el reporte de diseño Prometheus y la documentación de API (Swagger), garantizando que el proyecto sea reproducible y mantenible por terceros.

**Criterios de aceptación:**
- Documentación técnica completa: arquitectura, Swagger de endpoints, reporte Prometheus y manual de usuario.
- Diagrama de arquitectura (C4 model nivel 2 mínimo).
- Swagger publicado y navegable.
- Documentos Prometheus de SP-007.
- Manual de usuario con capturas (registro, crear OVA, exportar SCORM).
- Guía de instalación/despliegue y troubleshooting común.

---

### DO-002 — Videos demostrativos del funcionamiento

| Campo | Valor |
|---|---|
| ID | DO-002 |
| Tipo | Documentación |
| Épica/Tema | EP10: Documentacion y Cierre |
| Sprint | Sprint 3 |
| Status | To Do |
| Prioridad | Baja |
| Estimación | 5 SP |
| Dependencia | EP-4 (Motor de Exportación SCORM) |
| Responsable | — |
| Fase | Documentacion |
| Fecha creación | 2026-07-06 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-07-09 |

**Objetivo:** Producir videos demostrativos de la interfaz, el flujo de creación de OVA y la exportación SCORM, como material de sustentación y difusión autocontenido.

**Criterios de aceptación:**
- Videos en formato MP4 mostrando interfaz, creación y exportación de OVAs.
- Resolución mínima 1080p y narración en español clara.
- Duración total ≤ 8 min divididos en capítulos (intro, registro/login, creación de OVA, vista 5E, exportación SCORM, importación en Canvas).
- Subtítulos y miniatura para el repositorio.

---

### DO-003 — Reporte comparativo de agentes LLM

| Campo | Valor |
|---|---|
| ID | DO-003 |
| Tipo | Documentación |
| Épica/Tema | EP10: Documentacion y Cierre |
| Sprint | Sprint 3 |
| Status | To Do |
| Prioridad | Baja |
| Estimación | 5 SP |
| Dependencia | EN-003 |
| Responsable | — |
| Fase | Documentacion |
| Fecha creación | 2026-07-06 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-07-10 |

**Objetivo:** Elaborar un informe comparando el desempeño de OpenAI vs Gemini en la generación de OVAs de ML, con evidencia empírica final que cierra el ciclo de SP-001.

**Criterios de aceptación:**
- Tabla comparativa documentada (precisión, costo, latencia) entre OpenAI y Gemini.
- Reporte de 5-8 páginas que extiende SP-001 con datos reales de producción (TA-003).
- Incluye costo total por OVA, latencia P50/P90, calidad pedagógica (evaluación cualitativa) y tasa de error.
- Recomendación final del modelo por defecto del sistema.

---

_Fin del backlog — 77 ítems (10 EP + 67 hijos), organizado por épica y estandarizado._
