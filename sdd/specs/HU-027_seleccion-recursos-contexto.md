# HU-027: Selección de recursos como contexto del prompt

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | HU-027 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | spec_ready |
| Prioridad | Media |
| Estimación | 5 SP (inferido) |
| Dependencia | HU-025, HU-026 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

## Historia de Usuario

Como **estudiante del curso de ML de UPAO**, quiero seleccionar qué recursos del
OVA recibe mi prompt, para que la modificación aplique solo a lo seleccionado.

## Contexto

En el workspace (HU-025), además del click individual sobre un recurso (HU-026),
el usuario quiere un **modo de selección múltiple**: marcar varios recursos y que
el prompt del chat aplique **solo a ellos**. El backend ya regenera por recurso
(`backend/ova/regen_router.py:33` acepta `fase_ids`), así que la selección se
traduce en la lista de ids enviada. Recurso = página/elemento completo (`OvaPhase`).

## Alcance

### Incluye
- Botón **"Seleccionar recursos"** que activa un **modo de selección**.
- Marcar/desmarcar recursos (selección múltiple) con estado **visible**.
- Que el prompt aplique **solo a los recursos seleccionados**.
- Comportamiento **por defecto** cuando no hay selección.

### No incluye
- El click individual + menú Regenerar/Editar/Eliminar (→ HU-026).
- La selección **granular** sub-recurso (→ HU-031).
- El motor de regeneración (reusa el existente).

## Dependencias

- **HU-025** — workspace (prompt + preview/lista de recursos).
- **HU-026** — interacción por recurso (coexisten sin conflicto).
- Reusa: `backend/ova/regen_router.py` (`fase_ids`), `regen_service.py`.
- Toca (frontend): componentes del workspace (panel chat + lista/preview de recursos), hook de selección, `services/ovaEditService.js`.

## Reglas de negocio

1. **R1** — Un botón **"Seleccionar recursos"** junto al prompt activa/desactiva un **modo de selección**.
2. **R2** — En modo selección, los recursos del OVA se pueden **marcar y desmarcar** (selección múltiple).
3. **R3** — El prompt enviado desde el chat aplica **solo a los recursos seleccionados** (se envía la lista de ids; reusa el regen por recurso).
4. **R4** — La **selección es visible**: los recursos elegidos se resaltan y se muestra un **contador** ("N seleccionados").
5. **R5** — **Sin selección**, el prompt aplica al **OVA completo** (comportamiento por defecto); seleccionar acota el alcance.
6. **R6** — Coexiste con HU-026: el click individual abre el menú de un recurso; "Seleccionar recursos" es el modo de **selección múltiple** para el prompt; no se pisan.
7. **R7** — Interfaz **responsive**, < 200 líneas/archivo, patrón services → hooks → pages.

## Criterios de aceptación

- "Seleccionar recursos" activa un modo en el que se pueden marcar y desmarcar varios recursos. **(R1, R2)**
- Los recursos seleccionados se resaltan y hay un contador de selección. **(R4)**
- Al enviar el prompt con recursos seleccionados, solo esos recursos se modifican. **(R3)**
- Al enviar el prompt sin selección, el cambio aplica al OVA completo. **(R5)**
- El modo de selección no interfiere con el menú por recurso de HU-026. **(R6)**
- La interfaz funciona en móvil y ningún archivo nuevo supera 200 líneas. **(R7, C3, C7)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Selección de recursos como contexto del prompt (HU-027)

  Scenario: El prompt aplica solo a los recursos seleccionados
    Given un OVA abierto en el workspace
    When el estudiante activa "Seleccionar recursos"
    And marca dos recursos
    And envía un prompt de modificación
    Then solo esos dos recursos se modifican
    And los demás recursos no cambian

  Scenario: Selección visible
    Given el modo de selección activo
    When el estudiante marca tres recursos
    Then los tres se muestran resaltados
    And el contador indica "3 seleccionados"

  Scenario: Sin selección el prompt aplica a todo el OVA
    Given el modo de selección sin recursos marcados
    When el estudiante envía un prompt
    Then el cambio aplica al OVA completo
```

## Mockup ASCII

```
Workspace · panel chat
┌───────────────────────────────────────────┐
│ [ ✓ Seleccionar recursos ]   2 seleccionados│
│ ┌───────────────────────────────────────┐ │
│ │ 📎 chips…                              │ │
│ │ Escribe el cambio…              [Enviar]│ │
│ └───────────────────────────────────────┘ │
└───────────────────────────────────────────┘
Preview (modo selección)
  [☑ Recurso A]  [☐ Recurso B]  [☑ Recurso C]
  (☑ = seleccionado → recibe el prompt)
```
