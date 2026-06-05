# HU-033: Reordenar recursos del OVA

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | HU-033 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | spec_ready |
| Prioridad | Media |
| Estimación | 5 SP (inferido) |
| Dependencia | HU-025 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

## Historia de Usuario

Como **estudiante del curso de ML de UPAO**, quiero reorganizar el orden de los
recursos dentro de cada fase del OVA, para ajustar la secuencia pedagógica.

## Contexto

En el workspace (HU-025), además de añadir (HU-032) y eliminar/editar (HU-026)
recursos, el estudiante quiere **reordenarlos**. El orden se guarda en
`OvaPhase.phase_order` (`backend/models.py:86`). El reordenamiento está
**limitado a la propia fase**: un recurso pertenece a su fase 5E y no se mueve a
otra (un recurso de Engage no puede pasar a Explore).

## Alcance

### Incluye
- Reordenar recursos por **drag-drop** **dentro de una fase**.
- Persistir el nuevo orden.
- Reflejar el orden en preview y código.

### No incluye
- **Mover recursos entre fases** (prohibido).
- Añadir/eliminar/editar recursos → HU-032 / HU-026.
- Crear una versión nueva por reordenar (no aplica).

## Dependencias

- **HU-025** — workspace (lista/preview de recursos).
- **Backend nuevo**: endpoint para actualizar el orden de los recursos de una fase, validando que el reorden ocurra **dentro de la misma fase**. router → service → model.

## Reglas de negocio

1. **R1** — Los recursos de una fase se pueden **reordenar** (p. ej. drag-drop) en el workspace.
2. **R2** — El reordenamiento está **limitado a la misma fase**: **no** se pueden mover recursos entre fases.
3. **R3** — El nuevo orden se **persiste** (`phase_order` / orden del recurso dentro de la fase).
4. **R4** — El cambio se refleja en **preview y código**.
5. **R5** — Reordenar **no crea una versión nueva** por sí mismo; actualiza el orden de la versión activa.
6. **R6** — El backend **valida** que el reorden sea dentro de la misma fase y rechaza intentos de cambiar de fase; sigue router → service → model + `commit_or_500()`.
7. **R7** — Interfaz **responsive**, < 200 líneas/archivo, services → hooks → pages.

## Criterios de aceptación

- Se pueden reordenar los recursos dentro de una fase y el nuevo orden persiste. **(R1, R3)**
- No es posible mover un recurso de una fase a otra (la interfaz no lo permite y el backend lo rechaza). **(R2, R6)**
- El preview y el código reflejan el nuevo orden. **(R4)**
- Reordenar no genera una versión nueva del OVA. **(R5)**
- La interfaz funciona en móvil y ningún archivo nuevo supera 200 líneas. **(R7, C3, C7)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Reordenar recursos del OVA (HU-033)

  Scenario: Reordenar dentro de una fase
    Given una fase con los recursos en el orden A, B, C
    When el estudiante arrastra C antes de B
    Then el orden persiste como A, C, B
    And el preview y el código reflejan el nuevo orden

  Scenario: No se puede mover un recurso a otra fase
    Given un recurso en la fase Engage
    When el estudiante intenta moverlo a la fase Explore
    Then la interfaz no lo permite
    And el backend rechaza el cambio de fase
```

## Mockup ASCII

```
Workspace · fase "Explain"
┌───────────────────────────────────────────────┐
│  Explain                                       │
│   ⠿ Texto teoría     ◄ arrastrar               │
│   ⠿ Diagrama                                    │
│   ⠿ Ejemplo                                     │
│  (⠿ = handle drag · solo dentro de la fase)    │
└───────────────────────────────────────────────┘
```
