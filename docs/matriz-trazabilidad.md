# Matriz de trazabilidad requisito ↔ test

> Generado por `scripts/gen_traceability.py` el 2026-07-08 — **no editar a mano**.
> Capas: **unit** (cucumber-js), **backend** (pytest-bdd), **e2e** (playwright-bdd).
> Los `.feature` verbatim de specs cuentan escenarios aunque su capa ejecutable sea otra.

| ID | Título | Status | Escenarios | Unit | Backend | E2E | Notas |
|---|---|---|---:|:-:|:-:|:-:|---|
| BU-001 | Sesión expirada no redirige a pantalla de inicio de sesión | done | 9 | ✅ | — | ✅ |  |
| BU-002 | Cambio de rol o cuenta no actualiza la navegación del usuario | done | 7 | — | — | ✅ |  |
| DO-001 | Documentación técnica completa | pending | — | — | — | — | N/A — documentación |
| DO-002 | Videos demostrativos del funcionamiento | pending | — | — | — | — | N/A — documentación |
| DO-003 | Reporte comparativo de agentes LLM | pending | — | — | — | — | N/A — documentación |
| EN-001 | Habilitar especificaciones Gherkin Sprint 1 | done | 0 | — | — | — | ⚠️ sin cobertura |
| EN-002 | Habilitar automatización BDD | done | 0 | — | — | — | ⚠️ sin cobertura |
| EN-003 | Orquestación multiagente Prometheus con LangGraph | done | 0 | — | — | — | ⚠️ sin cobertura |
| EN-004 | Habilitar pgvector (BD Vectorial) | done | 0 | — | — | — | ⚠️ sin cobertura |
| EN-005 | Habilitar pipeline RAG end-to-end | done | 0 | — | — | — | ⚠️ sin cobertura |
| EN-006 | Habilitar entornos Cloud y orquestación | done | 0 | — | — | — | ⚠️ sin cobertura |
| EN-007 | Habilitar pruebas de integración en Canvas | pending | 0 | — | — | — | ⚠️ sin cobertura |
| EN-008 | Habilitar Base de Datos para Gestión de Usuarios | done | 5 | — | ✅ | — |  |
| EN-009 | Integración Frontend ↔ Backend de Agentes | done | 0 | — | — | — | ⚠️ sin cobertura |
| EN-010 | Configuración Monorepo y Arquitectura Base React | done | 4 | — | — | — | ⚠️ sin cobertura |
| EN-011 | Setup Base FastAPI y Orquestación Docker | done | 4 | — | — | — | ⚠️ sin cobertura |
| EN-012 | Observabilidad de errores de generación en Supabase | done | 4 | — | ✅ | — |  |
| EN-013 | Persistencia del estado de generación (jobs) | done | 14 | — | ✅ | — |  |
| EN-014 |  |  | 5 | — | ✅ | — |  |
| EN-015 | Crítico evaluator-optimizer pedagógico por recurso | done | 5 | — | ✅ | — |  |
| EN-016 | Editor de Coherencia 5E | done | 3 | — | ✅ | — |  |
| EN-017 | Panel de Nodos/Agentes Prometheus + Nodo Video + Nodo Imágenes | done | 3 | — | ✅ | — |  |
| EN-018 | Progreso de generación en vivo (SSE) | done | 3 | — | ✅ | — |  |
| EN-019 | Cola de jobs durable (arq + Redis) y rate-limit distribuido | done | 0 | — | — | — | ⚠️ sin cobertura |
| EN-020 | Observabilidad con Pydantic Logfire | done | 0 | — | — | — | ⚠️ sin cobertura |
| EN-021 | Error boundaries (frontend) y redacción de PII en logs (backend) | done | 0 | — | — | — | ⚠️ sin cobertura |
| EN-022 | Tests de componente (Vitest) y adopción de TypeScript | in_progress | 0 | — | — | — | ⚠️ sin cobertura |
| EN-023 | Deprecación completa del módulo Labs (sandbox de prompts) | done | 0 | — | — | — | ⚠️ sin cobertura |
| EP-1 | Especificación del Sistema (SDD — Fase Specify) | pending | — | — | — | — | N/A — épica (agrupa HUs) |
| EP-10 | Documentación y Cierre del Proyecto | pending | — | — | — | — | N/A — épica (agrupa HUs) |
| EP-2 | Plataforma Web y Autenticación | pending | — | — | — | — | N/A — épica (agrupa HUs) |
| EP-3 | Interfaz de Creación y Gestión de OVAs | pending | — | — | — | — | N/A — épica (agrupa HUs) |
| EP-4 | Motor de Exportación SCORM | pending | — | — | — | — | N/A — épica (agrupa HUs) |
| EP-5 | Especificación del Sistema Multiagente | pending | — | — | — | — | N/A — épica (agrupa HUs) |
| EP-6 | Base de Conocimiento Contextual RAG | pending | — | — | — | — | N/A — épica (agrupa HUs) |
| EP-7 | Despliegue e Infraestructura Cloud | pending | — | — | — | — | N/A — épica (agrupa HUs) |
| EP-8 | Validación Técnica y de Calidad | pending | — | — | — | — | N/A — épica (agrupa HUs) |
| EP-9 | Evaluación de Usabilidad y UX | pending | — | — | — | — | N/A — épica (agrupa HUs) |
| HU-001 | Registro de Cuenta de Usuario | done | 13 | ✅ | ✅ | ✅ |  |
| HU-002 | Crear nuevo OVA desde prompt | done | 6 | — | — | ✅ |  |
| HU-003 | Visualizar completa 5E | done | 6 | — | — | — | ⚠️ sin cobertura |
| HU-004 | Exportar OVA como paquete SCORM | done | 6 | — | — | ✅ |  |
| HU-005 | Evaluar plataforma mediante encuesta SUS | pending | 0 | — | — | — | ⚠️ sin cobertura |
| HU-006 | Ver historial de OVAs | done | 13 | — | ✅ | ✅ |  |
| HU-007 | Subir archivos base para el OVA (RAG) | done | 7 | — | — | — | ⚠️ sin cobertura |
| HU-008 | Inicio de sesión con credenciales | done | 5 | — | ✅ | ✅ |  |
| HU-009 | Recuperación de contraseña | done | 0 | — | — | — | ⚠️ sin cobertura |
| HU-010 | Maquetación Layout Principal y Enrutamiento Modular | done | 6 | — | — | ✅ |  |
| HU-011 | Editar OVA generado | done | 1 | — | — | — | ⚠️ sin cobertura |
| HU-012 | Eliminar OVA del historial (soft-delete) | done | 16 | — | — | ✅ |  |
| HU-013 | Duplicar OVA existente | done | 10 | — | — | ✅ |  |
| HU-014 | Renombrar y editar metadatos del OVA | done | 5 | — | — | — | ⚠️ sin cobertura |
| HU-015 | Ver y Editar Perfil de Usuario | done | 3 | — | — | ✅ |  |
| HU-016 | Cambiar Contraseña desde el Perfil | done | 3 | — | — | — | ⚠️ sin cobertura |
| HU-017 | Eliminar / dar de baja cuenta | done | 0 | — | — | — | ⚠️ sin cobertura |
| HU-018 | Gestión de Roles — Crear Rol | done | 6 | — | ✅ | ✅ |  |
| HU-019 | Gestión de Roles — Editar Rol | done | 6 | — | ✅ | ✅ |  |
| HU-020 | Gestión de Roles — Eliminar Rol | done | 5 | — | ✅ | ✅ |  |
| HU-021 | Gestión de Usuarios y Roles | done | 6 | — | — | ✅ |  |
| HU-022 | Recuperación de recursos parciales tras error de generación | done | 5 | ✅ | — | — |  |
| HU-023 | Generación de OVA en background persistente y reanudación | done | 4 | ✅ | — | — |  |
| HU-024 | Carga de archivos contextuales estilo chat | done | 4 | ✅ | — | — |  |
| HU-025 | Workspace de edición de OVA (panel dividido) | done | 6 | ✅ | — | ✅ |  |
| HU-026 | Edición de recurso por click en el preview | done | 4 | ✅ | — | — |  |
| HU-027 | Selección de recursos como contexto del prompt | done | 4 | ✅ | — | — |  |
| HU-028 | Versionado de OVA (historial, diff y revertir) | done | 3 | ✅ | — | — |  |
| HU-029 | Micro-versionado por recurso editado | done | 3 | ✅ | — | — |  |
| HU-030 | Mis OVAs: acceso al workspace + versión en metadata | done | 3 | ✅ | — | — |  |
| HU-031 | Selección y edición granular de elementos dentro de un recurso | done | 3 | ✅ | — | — |  |
| HU-032 | Añadir recurso al OVA (máx 4 por fase) | done | 4 | ✅ | — | — |  |
| HU-033 | Reordenar recursos del OVA | done | 4 | ✅ | — | — |  |
| HU-034 | Catálogo unificado de modelos con fetch de APIs OpenRouter/Groq + enable/disable + pricing en UI | done | 0 | — | — | — | ⚠️ sin cobertura |
| HU-035 | Configuración dedicada de modelos y fallback | done | 0 | — | — | — | ⚠️ sin cobertura |
| HU-036 | Vinculación de usuarios con permisos granulares | done | 0 | — | — | — | ⚠️ sin cobertura |
| RN-001 | Latencia ≤ 278 ms | pending | 0 | — | — | — | carga (tests/load, gate P90 ≤ 278 ms) |
| RN-002 | Tiempo de generación ≤ 180 segundos | done | 0 | — | — | — | ⚠️ sin cobertura |
| RN-003 | Seguridad y manejo de API Keys | done | 0 | — | — | — | ⚠️ sin cobertura |
| RN-004 | Prueba de humo de rendimiento post-despliegue | done | 0 | — | — | — | carga (tests/load) + backend/tests/test_latency.py |
| RN-005 | Frontend responsive | done | 0 | — | — | — | ⚠️ sin cobertura |
| RN-006 | Experiencia visual unificada del frontend | done | 0 | — | — | — | ⚠️ sin cobertura |
| SP-001 | Comparativa APIs multimodales | done | — | — | — | — | N/A — spike |
| SP-002 | Metodología 5E y Estructura OVA | done | — | — | — | — | N/A — spike |
| SP-003 | Mapeo de recursos y estructura de 5E | done | — | — | — | — | N/A — spike |
| SP-004 | Spike: Herramientas de Orquestación y Despliegue | done | — | — | — | — | N/A — spike |
| SP-005 | Investigación Spec-Driven Development | done | — | — | — | — | N/A — spike |
| SP-006 | Estructura Técnica del Estándar SCORM | done | — | — | — | — | N/A — spike |
| SP-007 | Metodología Prometheus para Agentes | done | — | — | — | — | N/A — spike |
| SP-008 | Investigación de buenos principios para el frontend de aplicaciones web | pending | — | — | — | — | N/A — spike |
| SP-009 | Ingeniería de Harness Engineering en Sistemas de IA | done | — | — | — | — | N/A — spike |
| TA-001 | Configuración de repositorios y ramas | done | 0 | — | — | — | ⚠️ sin cobertura |
| TA-002 | Crear template base SCORM XML | done | 0 | — | — | — | ⚠️ sin cobertura |
| TA-003 | Ejecutar scripts de precisión IA | pending | 0 | — | — | — | ⚠️ sin cobertura |
| TA-004 | Preparación y coordinación de sesión SUS | pending | 0 | — | — | — | ⚠️ sin cobertura |
| TA-005 | Validación SCORM con SCORM Cloud Rustici | pending | 0 | — | — | — | ⚠️ sin cobertura |
| TA-006 | Configuración del Entorno de Producción y Despliegue del Backend en Render | done | 0 | — | — | — | ⚠️ sin cobertura |
| TA-007 | Configuración y Despliegue del Frontend en Vercel | done | 0 | — | — | — | ⚠️ sin cobertura |

## Resumen

- Requisitos testeables: **74** · con cobertura en ≥1 capa: **37**
- Escenarios Gherkin totales: **236** en 58 archivos `.feature`
- Capa unit: 14 IDs · backend: 14 IDs · e2e: 16 IDs

## ⚠️ Requisitos `done` sin cobertura de test

- EN-001
- EN-002
- EN-003
- EN-004
- EN-005
- EN-006
- EN-009
- EN-010
- EN-011
- EN-019
- EN-020
- EN-021
- EN-023
- HU-003
- HU-007
- HU-009
- HU-011
- HU-014
- HU-016
- HU-017
- HU-034
- HU-035
- HU-036
- RN-002
- RN-003
- RN-005
- RN-006
- TA-001
- TA-002
- TA-006
- TA-007
