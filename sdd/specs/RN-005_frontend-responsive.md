# RN-005: Frontend responsive

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | RN-005 |
| Tipo | Req. No Funcional |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | spec_ready |
| Prioridad | Media |
| Estimación | — |
| Dependencia | — |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | — |
| Fecha actualización | — |
| Fecha Fin (info) | — |

## Objetivo

Garantizar que **toda** la interfaz del frontend sea responsive y usable en
escritorio, tablet y móvil, sin scroll horizontal ni solapamientos. Es un
requisito no funcional **transversal**: actúa como paraguas del criterio
"responsive" que cada HU de UI ya incluye, más un checklist de verificación.

## Contexto

El frontend usa **Tailwind CSS** (ya en el stack). Varias vistas existen (login,
dashboard, crear OVA, mis OVAs, perfil, panel admin) y se suman las del editor
(workspace HU-025 y derivados, que en móvil colapsan a pestañas/stack). RN-005 no
añade UI propia: fija el estándar responsive y cómo se verifica.

## Alcance

### Incluye
- Estándar responsive aplicable a todas las vistas (existentes y nuevas).
- Breakpoints de referencia y criterios de "sin scroll horizontal / sin solapamientos".
- Checklist de verificación por vista.

### No incluye
- UI nueva propia (se ajustan componentes existentes/nuevos).
- Cambios de arquitectura o de librería (se usa Tailwind).

## Dependencias

- Transversal: se relaciona con todas las HU de UI (HU-010, HU-003, HU-006, HU-025…), que ya llevan su criterio responsive.

## Reglas de negocio

1. **R1** — Todas las vistas se adaptan a **móvil (≤ 360px)**, **tablet (768px)** y **escritorio (≥ 1280px)** **sin scroll horizontal** ni solapamientos.
2. **R2** — Los componentes del **layout** y del **workspace** mantienen usabilidad en pantallas pequeñas (el split del workspace colapsa a pestañas/stack).
3. **R3** — Se usan **breakpoints de Tailwind** y contenedores fluidos; **sin** librería nueva.
4. **R4** — Cada HU de UI cumple su criterio responsive; **RN-005 es el paraguas** y aporta el checklist de verificación.
5. **R5** — La **verificación** se hace por vista en los tres anchos de referencia (DevTools/Lighthouse) y queda documentada (checklist en `sdd/progress/implementados/impl_RN-005.md`).
6. **R6** — Se respeta < 200 líneas/archivo y el patrón services → hooks → pages.

## Criterios de aceptación

- Cada vista del frontend se visualiza sin scroll horizontal ni solapamientos en ≤ 360px, 768px y ≥ 1280px. **(R1)**
- El layout y el workspace son usables en móvil (el split colapsa a pestañas/stack). **(R2)**
- Solo se usan utilidades de Tailwind para responsive (sin librería nueva). **(R3)**
- Existe un checklist de vistas verificadas en los tres anchos. **(R4, R5)**
- Ningún archivo nuevo o modificado supera 200 líneas. **(R6, C3)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Frontend responsive (RN-005)

  Scenario Outline: Las vistas se adaptan a cada ancho
    Given una vista del frontend
    When se visualiza a un ancho de <ancho>
    Then no hay scroll horizontal ni solapamientos
    And el contenido es usable

    Examples:
      | ancho  |
      | 360px  |
      | 768px  |
      | 1280px |

  Scenario: El workspace colapsa en móvil
    Given el workspace de un OVA en una pantalla de 360px
    Then el chat y el OVA se muestran en pestañas/stack en lugar de lado a lado
```
