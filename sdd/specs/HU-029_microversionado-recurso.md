# HU-029: Micro-versionado por recurso editado

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | HU-029 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | spec_ready |
| Prioridad | Media |
| Estimación | 5 SP (inferido) |
| Dependencia | HU-028, HU-026 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

## Historia de Usuario

Como **estudiante del curso de ML de UPAO**, quiero versionar cada cambio de un
recurso (1.1, 1.2…) de forma independiente al versionado global del OVA, para
distinguir ediciones puntuales y poder revertir un recurso a un estado anterior.

## Contexto

Esquema de versiones **de 3 niveles** acordado:

| Nivel | Lo genera | Formato |
|---|---|---|
| **Major** | Generación del OVA completo | `v1`, `v2`, … |
| **Minor** | Regeneración/edición de uno o varios **recursos** (esta HU) | `v1.1`, `v1.2`, … |
| **Patch** | Edición/regen/eliminación **granular** sub-recurso (HU-031) | `v1.1.1`, `v1.1.2`, … |

Hoy cada edición clona todas las fases a una **versión OVA nueva**
(`backend/ova/edit_router.py:99`) y **no hay historial por recurso**. HU-029
introduce el nivel **minor**: editar/regenerar recursos sube `vN.M` (no `vN`) y
guarda historial por recurso. El **major** lo crea la generación completa
(HU-028); el **patch** granular es HU-031.

## Alcance

### Incluye
- Crear una **micro-versión (minor `vN.M`)** al editar/regenerar uno o varios recursos.
- **Historial de micro-versiones por recurso**, consultable.
- **Revertir** un recurso a una micro-versión anterior.
- Mostrar la micro-versión del recurso en la UI.

### No incluye
- El nivel **major** y el historial/diff/revertir del OVA completo → HU-028.
- El nivel **patch** granular (vN.M.P) → HU-031.
- El disparo de la edición/regen del recurso → HU-026 (aquí solo se versiona).

## Dependencias

- **HU-028** — versionado OVA-completo (nivel major) y modelo `OvaVersion`.
- **HU-026** — edición/regeneración por recurso (disparador).
- Reusa: `backend/models.py` (`OvaPhase`, `OvaVersion`), `regen_service.py`, `edit_router.py`.
- **Backend nuevo**: modelo/tabla de versiones por recurso (p. ej. `ova_phase_versions`) + migración; endpoints de historial y revertir por recurso.

## Reglas de negocio

1. **R1** — La numeración sigue el **esquema de 3 niveles**: `vN` (major, generación completa) · `vN.M` (minor, recursos) · `vN.M.P` (patch granular, HU-031). HU-029 gestiona el nivel **minor**.
2. **R2** — Editar/regenerar **uno o varios recursos** crea una **minor `vN.M`** dentro del major actual, **no** una versión completa nueva.
3. **R3** — Se persiste **historial por recurso** (tabla `ova_phase_versions` o equivalente): cada fila es una micro-versión de un recurso (contenido, número, fecha).
4. **R4** — El versionado **major** (OVA completo) y el **minor** (recurso) son **independientes** pero relacionados: una minor pertenece a un major.
5. **R5** — Cada recurso muestra su **micro-versión** actual y tiene un **historial** consultable de sus micro-versiones.
6. **R6** — Se puede **revertir** un recurso a una micro-versión anterior, con **confirmación**; el historial se conserva.
7. **R7** — El contador **minor** incrementa dentro del **major** vigente; al crear un nuevo major (generación completa) el minor se reinicia según corresponda.
8. **R8** — Backend nuevo sigue router → service → model + migración y `commit_or_500()`; interfaz **responsive**, < 200 líneas/archivo.

## Criterios de aceptación

- Editar/regenerar un recurso sube su micro-versión (`vN.M`) sin crear una versión completa nueva del OVA. **(R1, R2)**
- Cada recurso tiene un historial de micro-versiones con contenido, número y fecha. **(R3, R5)**
- Se puede revertir un recurso a una micro-versión anterior tras confirmar, conservando el historial. **(R6)**
- El versionado del OVA completo (major) y el del recurso (minor) no se interfieren. **(R4)**
- La generación completa del OVA crea un nuevo major (`vN`). **(R1, R7)**
- El backend nuevo no filtra errores de BD al cliente. **(R8, C4)**
- La interfaz funciona en móvil y ningún archivo nuevo supera 200 líneas. **(R8, C3, C7)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Micro-versionado por recurso (HU-029)

  Scenario: Editar un recurso sube su micro-versión
    Given un OVA en versión "v2"
    When el estudiante edita un recurso
    Then ese recurso pasa a "v2.1"
    And la versión global del OVA sigue siendo "v2"

  Scenario: Historial y revertir de un recurso
    Given un recurso con micro-versiones "v2.1" y "v2.2"
    When el estudiante abre el historial del recurso
    And revierte a "v2.1" y confirma
    Then el recurso vuelve al contenido de "v2.1"
    And el historial conserva "v2.1" y "v2.2"

  Scenario: La generación completa crea un nuevo major
    Given un OVA en versión "v2.3"
    When el estudiante regenera el OVA completo
    Then se crea la versión "v3"
```

## Mockup ASCII

```
Recurso (en preview/menú)
┌───────────────────────────────────────────┐
│  Recurso "Diagrama"            v2.3 🕘      │
│   [ ↻ Regenerar ] [ ✎ Editar ] [ Historial ]│
└───────────────────────────────────────────┘
Historial del recurso
  ○ v2.3 (actual)
  ○ v2.2            [ Revertir ]
  ○ v2.1            [ Revertir ]
     ⚠ "¿Revertir el recurso a v2.1?" [Cancelar][Revertir]
```
