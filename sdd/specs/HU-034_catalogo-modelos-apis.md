# HU-034: Catálogo unificado de modelos y APIs

| Campo | Valor |
|---|---|
| ID | HU-034 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creación y Gestión de OVAs |
| Sprint | Sprint 2 |
| Status | spec_ready |
| Prioridad | Alta |
| Estimación | 8 SP |
| Dependencia | — |
| Responsable | - |
| Fase | SDD - Specify (amend) |
| Fecha creación | 2026-06-08 |
| Fecha actualización | 2026-07-11 |
| Fecha Fin (info) | 2026-06-08 (baseline done; amend pendiente) |

## Historia de Usuario

Como **usuario de GenOVA con permisos de configuración IA**, quiero un catálogo
único de modelos de todas las modalidades y proveedores soportados, categorizados
y filtrables, para habilitar o deshabilitar qué modelos puedo usar al asignar
tareas.

## Objetivo funcional

Un origen único de verdad enumera modelos de texto, código, razonamiento, imagen,
video, multimodal, embedding y audio; cada entrada tiene categoría(s)/aptitudes,
proveedor e identificador; el usuario puede filtrar, buscar y activar/desactivar
modelos sin gestionar credenciales en esta pantalla.

## Comportamiento actual (baseline 2026-06-08)

Ya entregado (`merge_commit: f143a76`):

- Agregación de modelos de proveedores de texto/chat existentes (aprox. cientos de
  entradas) con deduplicación por identificador.
- UI de catálogo con búsqueda, filtro por categoría, desplazamiento infinito y
  toggle habilitar/deshabilitar por usuario.
- Precarga de un conjunto curado para entornos sin claves de proveedor.
- Precios mostrados cuando el proveedor los declara.

Limitaciones del baseline (motivo del amend): el catálogo no cubría de forma
unificada proveedores de imagen/video listados ni categorías multimodal,
embedding y audio visibles; la aptitud multimodal no se trataba como asignable a
varias tareas.

## Alcance

### Incluye (amend 2026-07-11 — alcance principal)

- Origen único de verdad del catálogo con categoría(s) / aptitudes por modelo.
- Inclusión en el mismo catálogo de:
  - Modelos de imagen y video declarados por los proveedores de chat ya
    integrados, cuando la API los expone.
  - Proveedores de imagen: Hugging Face, SiliconFlow, Runware y fal.ai
    (categoría imagen).
  - Entradas de video listadas en catálogo (el consumo en generación de OVA lo
    gobierna HU-035 vía switch + cadena).
- Categorización obligatoria; un modelo **multimodal** puede mapearse a **varias**
  tareas (no queda preso de una sola categoría canónica exclusiva).
- Categorías **multimodal**, **embedding** y **audio** visibles en el catálogo
  (filtros / master-detail donde aplique).
- Deduplicación coherente por par proveedor + identificador.
- Enable/disable de modelos del catálogo unificado.
- Filtros y búsqueda coherentes con las categorías ampliadas.

### No incluye

- Credenciales / claves de API (viven fuera del catálogo; sección Credenciales de
  HU-035).
- Proveedores nuevos no listados arriba.
- Audio como producto de generación OVA (sí se **muestra** en catálogo).
- Cambios a Prometheus / nodos de orquestación.
- Vinculación de usuarios (HU-036).
- Rediseño visual de `/models` ya cerrado el 2026-07-11 (wireframe HU-035).

## Dependencias

- Ninguna bloqueante previa al amend.
- HU-035 consume este catálogo para pools de asignación por tarea.

## Reglas de negocio

1. **R1** — Existe un único catálogo de modelos como origen de verdad; cada
   modelo declara categoría(s) o aptitudes.
2. **R2** — Los proveedores de imagen listados (Hugging Face, SiliconFlow,
   Runware, fal.ai) aparecen en el mismo catálogo bajo categoría imagen.
3. **R3** — Si un proveedor de chat ya integrado declara modelos de imagen o
   video, esos modelos entran al mismo catálogo.
4. **R4** — Las categorías multimodal, embedding y audio son visibles y
   filtrables en la UI de catálogo.
5. **R5** — Un modelo multimodal puede estar apto para más de una tarea de
   asignación (HU-035); no se fuerza exclusividad a una sola categoría.
6. **R6** — La deduplicación usa proveedor + identificador de modelo.
7. **R7** — El usuario con permiso puede habilitar o deshabilitar modelos; los
   deshabilitados no entran al pool de asignación.
8. **R8** — El catálogo no almacena ni edita credenciales de proveedor.

## Criterios de aceptación

1. El catálogo lista modelos de texto/código/razonamiento e imagen de los
   proveedores de chat ya integrados cuando la API los declara. **(R1, R3)**
2. Los modelos de Hugging Face, SiliconFlow, Runware y fal.ai aparecen en el
   catálogo categorizados como imagen. **(R2)**
3. Los modelos de video declarados por proveedores soportados aparecen listados
   en el catálogo. **(R3)**
4. El usuario puede filtrar el catálogo por categorías que incluyen multimodal,
   embedding y audio (además de las existentes). **(R4)**
5. Un mismo modelo multimodal aparece como candidato apto para más de una tarea
   cuando sus aptitudes lo permiten. **(R5)**
6. Dos entradas con el mismo proveedor e identificador no se duplican en el
   listado. **(R6)**
7. Habilitar/deshabilitar un modelo persiste y afecta la disponibilidad en
   asignación. **(R7)**
8. Ninguna acción del catálogo crea ni modifica claves de API. **(R8)**
9. `./verify.ps1 -Quick` pasa tras el amend.

## Escenarios BDD (Gherkin)

```gherkin
Feature: Catálogo unificado de modelos y APIs (HU-034)

  Scenario: Catálogo muestra categorías multimodal embedding y audio
    Given un usuario autenticado con permiso de modelos
    When abre el catálogo de modelos
    Then puede filtrar por las categorías multimodal, embedding y audio
    And ve entradas pertenecientes a esas categorías cuando existen en el origen

  Scenario: Proveedores de imagen entran al mismo catálogo
    Given el catálogo unificado está disponible
    When el usuario filtra por categoría imagen
    Then ve modelos de los proveedores de imagen soportados listados
    And no necesita una pantalla de catálogo distinta por proveedor

  Scenario: Modelo multimodal apto para varias tareas
    Given un modelo categorizado como multimodal con aptitudes de texto e imagen
    When el sistema construye el pool de candidatos por tarea
    Then ese modelo puede aparecer en más de una tarea
    And no queda restringido a una sola categoría exclusiva

  Scenario: Enable disable afecta disponibilidad
    Given un modelo listado en el catálogo
    When el usuario lo deshabilita
    Then el modelo deja de estar disponible para asignación
    And al rehabilitarlo vuelve a estar disponible
```

## Mockup ASCII

```
┌─ Catálogo (drawer / vista) ─────────────────────────────┐
│ Buscar…          [Todas ▼] [texto][imagen][video]…      │
│                  [multimodal][embedding][audio]         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ✓ proveedor/modelo-a   imagen        [habilitado]   │ │
│ │ ✓ proveedor/modelo-b   multimodal    [habilitado]   │ │
│ │ ○ proveedor/modelo-c   video         [deshabilitado]│ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Cambios posteriores

**2026-07-11 (amend — catálogo unificado multimodal):** ampliar catálogo a todas
las modalidades/proveedores listados; categorías multimodal/embedding/audio
visibles; multimodal multi-tarea; sin nueva HU.
