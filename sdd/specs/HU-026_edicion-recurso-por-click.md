# HU-026: Edición de recurso por click en el preview

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | HU-026 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | spec_ready |
| Prioridad | Alta |
| Estimación | 8 SP (inferido) |
| Dependencia | HU-025 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

## Historia de Usuario

Como **estudiante del curso de ML de UPAO**, quiero hacer click en un recurso del
preview del OVA para regenerarlo, editarlo o eliminarlo, y poder editar su código
directamente, para ajustar partes puntuales sin rehacer todo el OVA.

## Contexto

Un **recurso** es una **página/elemento completo del OVA** (fila `OvaPhase`). El
backend ya regenera por recurso (`backend/ova/regen_router.py:33` acepta `fase_ids`,
`backend/ova/regen_service.py`); falta poder **seleccionarlo desde el preview** y
ofrecer **editar/eliminar**. HU-026 vive dentro del workspace (HU-025). La
selección **granular** por debajo del recurso (sub-elementos) es un ítem
**aparte** del backlog (HU-031) y queda fuera de aquí.

## Alcance

### Incluye
- Identificar el recurso al hacer **click** en el preview (marcador por recurso).
- Menú **Regenerar / Editar / Eliminar** sobre el recurso.
- Regenerar el recurso (reuso del flujo de regen existente).
- Editar el recurso con un **prompt puntual**.
- **Eliminar** el recurso del OVA (con confirmación).
- **Editar/eliminar por código** el HTML de un recurso en la vista **Code**, reflejándose en Preview.

### No incluye
- Selección **granular** de sub-elementos (por debajo del recurso) → ítem aparte del backlog (HU-031).
- El **versionado** del cambio (micro-versión/historial) → HU-028 / HU-029.
- El botón "Seleccionar recursos" como contexto del prompt → HU-027.
- La cáscara del workspace (layout, Preview/Code, SCORM) → HU-025.

## Dependencias

- **HU-025** — workspace (preview/code + anclajes).
- Reusa: `backend/ova/regen_router.py`, `regen_service.py`, `regen_agents.py`.
- **Backend nuevo**: endpoint para **eliminar** un recurso y para **actualizar el contenido/código** de un recurso (editar por código). Patrón router → service → model.
- Habilitado por: **HU-028/HU-029** versionan los cambios disparados aquí.

## Reglas de negocio

1. **R1** — Cada recurso renderizado en el preview lleva un **marcador** (`data-resource-id`) que permite identificarlo al hacer **click**.
2. **R2** — Al hacer click en un recurso aparece un **popover/menú** con **Regenerar**, **Editar** y **Eliminar**.
3. **R3** — **Regenerar** rehace **solo ese recurso**, reusando el flujo de regen existente (`regen_router`/`regen_service`).
4. **R4** — **Editar** abre un cuadro con un **prompt puntual** que modifica **solo ese recurso**.
5. **R5** — **Eliminar** quita ese recurso del OVA, previa **confirmación** (modal).
6. **R6** — En la vista **Code**, el usuario puede **editar o eliminar** el HTML/código de un recurso manualmente; al guardar, el cambio se refleja en **Preview**.
7. **R7** — Tras regenerar/editar/eliminar/editar-código, **Preview y Code** quedan sincronizados; mientras un recurso regenera se muestra su progreso (polling de EN-013/HU-023).
8. **R8** — Solo los **recursos generados** abren el menú; el código editado a mano se valida/sanitiza antes de persistir (no romper el OVA).
9. **R9** — El **versionado** del cambio lo cubren HU-028/HU-029 (HU-026 solo dispara la operación).
10. **R10** — Interfaz **responsive** (menú accesible por tap), < 200 líneas/archivo, patrón services → hooks → pages.

## Criterios de aceptación

- Al hacer click en un recurso del preview, se identifica ese recurso y aparece el menú Regenerar/Editar/Eliminar. **(R1, R2)**
- "Regenerar" rehace solo ese recurso y actualiza Preview y Code al terminar. **(R3, R7)**
- "Editar" permite enviar un prompt que cambia solo ese recurso. **(R4, R7)**
- "Eliminar" pide confirmación y, al confirmar, quita el recurso del OVA y de la vista. **(R5)**
- En la vista Code se puede modificar o borrar el código de un recurso y el Preview refleja el cambio al guardar. **(R6)**
- El código editado a mano se sanitiza antes de persistir. **(R8, C4)**
- Las zonas que no son recurso no abren menú. **(R8)**
- La interacción funciona en móvil (tap) y ningún archivo nuevo supera 200 líneas. **(R10, C3, C7)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Edición de recurso por click en el preview (HU-026)

  Scenario: Regenerar un recurso desde el preview
    Given un OVA abierto en el workspace
    When el estudiante hace click en un recurso del preview
    And elige "Regenerar"
    Then solo ese recurso se regenera
    And al terminar, Preview y Code muestran el recurso actualizado

  Scenario: Editar un recurso con un prompt puntual
    Given un recurso seleccionado por click
    When el estudiante elige "Editar" y escribe un prompt
    Then solo ese recurso se modifica según el prompt
    And los demás recursos no cambian

  Scenario: Eliminar un recurso con confirmación
    Given un recurso seleccionado por click
    When el estudiante elige "Eliminar"
    Then se muestra un modal de confirmación
    When confirma
    Then el recurso se quita del OVA y del preview

  Scenario: Editar el código de un recurso
    Given la vista "Code" de un OVA en el workspace
    When el estudiante edita el HTML de un recurso y guarda
    Then el Preview refleja el cambio
    And el código se sanitiza antes de persistir
```

## Mockup ASCII

```
Workspace · Preview
┌───────────────────────────────────────────────┐
│  [Recurso: "Diagrama de árbol"]  ◄ click       │
│   ┌─────────────────────────────────────────┐  │
│   │  (imagen / texto del recurso)           │  │
│   └─────────────────────────────────────────┘  │
│        ┌───────── popover ─────────┐           │
│        │  ↻ Regenerar              │           │
│        │  ✎ Editar (prompt)        │           │
│        │  🗑 Eliminar              │           │
│        └───────────────────────────┘           │
├───────────────────────────────────────────────┤
│  Code (editable por recurso)                   │
│   <section data-resource-id="r-42"> … </section>│
└───────────────────────────────────────────────┘
```
