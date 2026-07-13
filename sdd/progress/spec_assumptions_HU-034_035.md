# Asunciones — Amend HU-034 + HU-035 (PASO 1→2)

**Fecha:** 2026-07-11  
**Estado:** Correcciones D3–D7 aplicadas — esperando **Continuar** / **Adelante** para generar specs

## Correcciones del stakeholder (2026-07-11)

| ID | Decisión |
|---|---|
| **D3 / B.3** | Video **sí** tiene generación IA con la cadena asignada. Hay **switch activar/desactivar** (como Imagen hoy). **Video desactivado por defecto**: si está off, solo prompts / no genera. Si on, consume primario+fallbacks. |
| **D4 / B.2** | Retirar `media-task-card` **en este amend** (borrar uso y componente, no follow-up). |
| **D6** | Categorías `multimodal`, `embedding`, `audio` **visibles** en catálogo (y disponibles donde aplique el master-detail / filtros). |
| **D7** | Un modelo **multimodal puede asignarse a varias tareas** (no queda preso de una sola categoría canónica exclusiva). |

## Asunciones vigentes (post-corrección)

### A. HU-034 — Catálogo
1. Origen único de verdad con categoría(s) / aptitudes por modelo.
2. OpenRouter y LLM actuales aportan imagen y video si la API lo declara.
3. HF / SiliconFlow / Runware / fal.ai entran al mismo catálogo (categoría imagen).
4. Video se lista en catálogo; consumo en OVA gobernado por switch + cadena (HU-035).
5. Categorización obligatoria; multimodal puede mapearse a **varias tareas** (D7).
6. Deduplicación coherente por proveedor+id.
7. Credenciales fuera del catálogo.
8. Fuera de alcance: proveedores nuevos no listados; audio como producto de generación OVA (sí se **muestra** en catálogo D6); Prometheus; HU-036; rediseño visual ya cerrado.

### B. HU-035 — Asignación
1. Mismo patrón primario+fallbacks para todas las tareas incl. imagen y video.
2. **Retiro inmediato** de `media-task-card`.
3. **Video + Imagen:** switch enable (video **off** por defecto). Off → no genera (solo prompts). On → genera con cadena del catálogo.
4. Pipeline imagen (y video cuando on) consume cadena asignada, no circuito paralelo `ova_settings` a largo plazo.
5. Migración one-shot / legacy map desde `image_*` hacia cadena tarea imagen.
6. Pool = catálogo habilitado ∩ apto para esa tarea (multimodal puede aparecer en varias).
7. Admin plataforma vs override usuario sin cambiar permisos.
8. Misma página `/models` + sticky save.
9. Fuera de alcance: nuevos tipos de tarea; rediseño Credenciales/Plataforma; permisos nuevos.

### C. Transversal
1. Amend HU-034 + HU-035 (no HU-037).
2. Orden impl: HU-034 → HU-035.
3. Criterios verificables con tests.

---

Escribe **Continuar** o **Adelante** para generar las specs en disco.
