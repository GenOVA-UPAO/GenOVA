# HU-032: Añadir recurso al OVA (máx 4 por fase)

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | HU-032 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | spec_ready |
| Prioridad | Media |
| Estimación | 5 SP (inferido) |
| Dependencia | HU-025, HU-002, HU-029 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

## Historia de Usuario

Como **estudiante del curso de ML de UPAO**, quiero añadir un recurso nuevo a una
fase del OVA mediante un botón "+ Añadir recurso" (con un prompt), para enriquecer
el OVA sin regenerarlo, respetando el máximo de recursos por fase.

## Contexto

En el workspace (HU-025) el **chat edita** recursos existentes (HU-027); **crear**
es una acción **explícita** y separada. Regla de negocio transversal: **máx 4
recursos por fase 5E**. El backend ya tiene agentes de generación reusables
(`backend/ova/regen_agents.py`, `agents/*`); HU-032 añade el endpoint que genera e
**inserta** un `OvaPhase` nuevo en la fase, validando el límite. La **eliminación**
de recursos la cubre HU-026; el **reordenamiento**, HU-033.

## Alcance

### Incluye
- Botón **"+ Añadir recurso"** por fase en el workspace.
- Generación del recurso nuevo a partir de un **prompt** e inserción en la fase.
- Validación de la regla **máx 4 recursos/fase** (frontend y backend).
- Versionado del cambio (minor `vN.M`).

### No incluye
- Editar/regenerar/eliminar recursos existentes → HU-026.
- Reordenar recursos → HU-033.
- Un catálogo cerrado de tipos de recurso.

## Dependencias

- **HU-025** — workspace (lugar del botón).
- **HU-002** — agentes/flujo de generación reusados.
- **HU-029** — versionado minor del cambio.
- **Backend nuevo**: endpoint "añadir recurso" (genera + inserta `OvaPhase` + valida límite), patrón router → service → model.

## Reglas de negocio

1. **R1** — Cada fase del OVA en el workspace tiene un botón **"+ Añadir recurso"**.
2. **R2** — Al añadir, se solicita un **prompt** que describe el recurso; el backend **genera** el recurso reusando los agentes existentes y lo **inserta** en esa fase.
3. **R3** — Regla dura **máx 4 recursos/fase**: si la fase ya tiene 4, el botón se **deshabilita** en el frontend y el backend **rechaza** la operación con un aviso claro (no error genérico).
4. **R4** — El recurso nuevo se inserta en la fase y el cambio se versiona como **minor `vN.M`** (HU-029).
5. **R5** — El **chat** del workspace **edita** (HU-027); **añadir** es esta acción explícita, no se infiere del chat.
6. **R6** — El **prompt define el contenido**; no se fija un catálogo rígido de tipos (el tipo resulta de lo generado o de un selector simple).
7. **R7** — Backend sigue router → service → model + `commit_or_500()`; rate-limit en el endpoint de generación; interfaz **responsive**, < 200 líneas/archivo.

## Criterios de aceptación

- Cada fase muestra "+ Añadir recurso" en el workspace. **(R1)**
- Al añadir con un prompt, se genera e inserta un recurso nuevo en esa fase. **(R2)**
- Si la fase ya tiene 4 recursos, el botón está deshabilitado y el backend rechaza con un aviso claro. **(R3)**
- El recurso nuevo queda versionado como minor `vN.M`. **(R4)**
- El backend no filtra errores de BD ni del modelo al cliente. **(R7, C4)**
- La interfaz funciona en móvil y ningún archivo nuevo supera 200 líneas. **(R7, C3, C7)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Añadir recurso al OVA (HU-032)

  Scenario: Añadir un recurso a una fase con espacio
    Given una fase del OVA con 2 recursos
    When el estudiante pulsa "+ Añadir recurso" y escribe un prompt
    Then se genera e inserta un recurso nuevo en esa fase
    And la fase pasa a tener 3 recursos
    And el cambio se versiona como una minor

  Scenario: No se puede superar el máximo por fase
    Given una fase del OVA con 4 recursos
    Then el botón "+ Añadir recurso" está deshabilitado
    And si se intenta añadir vía API, el backend lo rechaza con un aviso

  Scenario: El chat no crea recursos
    Given el workspace de un OVA
    When el estudiante escribe un prompt en el chat
    Then se edita el OVA (recursos seleccionados o el OVA completo)
    And no se crea un recurso nuevo por el chat
```

## Mockup ASCII

```
Workspace · fase "Explain" (3/4 recursos)
┌───────────────────────────────────────────────┐
│  Explain                         [ + Añadir ]  │
│   • Texto teoría    • Diagrama    • Ejemplo     │
└───────────────────────────────────────────────┘
Fase "Engage" (4/4)
┌───────────────────────────────────────────────┐
│  Engage                      [ + Añadir ] (✕)  │  ← deshabilitado: "Máx 4 por fase"
└───────────────────────────────────────────────┘
```
