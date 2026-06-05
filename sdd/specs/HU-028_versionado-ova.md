# HU-028: Versionado de OVA (historial, diff y revertir)

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | HU-028 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | spec_ready |
| Prioridad | Alta |
| Estimación | 8 SP (inferido) |
| Dependencia | HU-011, HU-025 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

## Historia de Usuario

Como **estudiante del curso de ML de UPAO**, quiero ver la versión del OVA, su
historial de cambios, comparar versiones y poder revertir, para recuperar una
versión anterior si no me gusta la nueva.

## Contexto

El versionado **OVA-completo ya existe**: el modelo `OvaVersion`
(`backend/models.py:67`) se crea en regeneración y edición
(`backend/ova/regen_service.py:65`, `edit_router.py:99`), con una sola
`is_active=TRUE` por OVA; `VersionHistory.jsx` solo **lista**. **Faltan**:
mostrar la versión activa, **comparar (diff)** entre versiones y **revertir**.
Esta HU vive en el workspace (HU-025) y extiende lo existente. El versionado es
del **OVA completo** (1.0/2.0); la micro-versión por recurso es **HU-029**.

## Alcance

### Incluye
- Badge de **versión** del OVA en la toolbar (junto a descarga SCORM).
- Botón de **historial** que abre la lista de versiones.
- **Diff** (preview y código) entre dos versiones.
- **Revertir** a una versión anterior, con confirmación.
- Menú **"…"** con duplicar/eliminar del OVA.

### No incluye
- Micro-versionado por recurso (1.1/1.2) → HU-029.
- GC/limpieza de zips SCORM huérfanos → tarea aparte (riesgo conocido).
- La creación de versiones en regen/edit (ya existe).

## Dependencias

- **HU-025** — workspace (toolbar del panel derecho).
- **HU-011** — edición que ya crea versiones.
- Reusa: `backend/models.py` (`OvaVersion`), `backend/ova/edit_view_router.py` (`/versiones`), `edit_helpers.py` (`_version_to_dict`, `_ensure_version_exists`), `frontend/src/components/VersionHistory.jsx`.
- **Backend nuevo**: endpoint de **revertir** (activar una versión) y de **diff** entre dos versiones (router → service → model).

## Reglas de negocio

1. **R1** — La **versión activa** del OVA se muestra como **badge** en la toolbar del panel derecho, junto a la descarga SCORM.
2. **R2** — Un botón de **historial** junto a "Descargar SCORM" abre el listado de versiones del OVA (extiende `VersionHistory.jsx`).
3. **R3** — El historial muestra cada versión con su número y fecha; permite elegir dos para comparar.
4. **R4** — El **diff** muestra las diferencias de **preview y código** entre las dos versiones seleccionadas.
5. **R5** — **Revertir** reactiva la versión elegida como **activa** (`is_active`) sin destruir el historial; requiere **modal de confirmación**.
6. **R6** — Un menú **"…"** en la toolbar agrupa **duplicar** y **eliminar** del OVA (reusan HU-013 / HU-012).
7. **R7** — Esquema de versiones de **3 niveles**: **major `vN`** = generación del OVA completo (esta HU) · **minor `vN.M`** = regeneración de recurso(s) (HU-029) · **patch `vN.M.P`** = edición granular sub-recurso (HU-031). HU-028 gestiona el nivel **major**.
8. **R8** — Backend nuevo (revert/diff) sigue router → service → model y `commit_or_500()`; interfaz **responsive**, < 200 líneas/archivo.

## Criterios de aceptación

- La toolbar muestra la versión activa del OVA junto a la descarga SCORM. **(R1)**
- El botón de historial abre la lista de versiones del OVA. **(R2, R3)**
- Seleccionar dos versiones muestra un diff de su preview y código. **(R4)**
- "Revertir" pide confirmación y, al confirmar, deja la versión elegida como activa; el historial se conserva. **(R5)**
- El menú "…" ofrece duplicar y eliminar el OVA. **(R6)**
- Los endpoints nuevos no filtran errores de BD al cliente. **(R8, C4)**
- La interfaz funciona en móvil y ningún archivo nuevo supera 200 líneas. **(R8, C3, C7)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Versionado de OVA — historial, diff y revertir (HU-028)

  Scenario: Ver la versión activa
    Given un OVA con varias versiones en el workspace
    Then la toolbar muestra el número de la versión activa junto a la descarga SCORM

  Scenario: Comparar dos versiones
    Given el historial de versiones abierto
    When el estudiante elige la versión 1 y la versión 3
    Then se muestra un diff de su preview y de su código

  Scenario: Revertir a una versión anterior con confirmación
    Given un OVA cuya versión activa es la 3
    When el estudiante elige revertir a la versión 1
    Then se muestra un modal de confirmación
    When confirma
    Then la versión 1 queda como activa
    And el historial conserva todas las versiones

  Scenario: Menú de acciones del OVA
    Given el workspace de un OVA
    When el estudiante abre el menú "…"
    Then puede duplicar o eliminar el OVA
```

## Mockup ASCII

```
Workspace · toolbar panel derecho
┌─────────────────────────────────────────────────────────────┐
│  [ Preview ] [ Code ]      v3 ▾   [ 🕘 Historial ] [⤓ SCORM] [⋯]│
└─────────────────────────────────────────────────────────────┘
Historial (modal/panel)
  ○ v3 (activa) · 2026-…   ◉ comparar
  ○ v2 · 2026-…            ◉ comparar
  ○ v1 · 2026-…            ◉ comparar     [ Ver diff ]  [ Revertir ]
        ⚠ modal: "¿Revertir a v1? Esta acción cambia la versión activa." [Cancelar][Revertir]
```
