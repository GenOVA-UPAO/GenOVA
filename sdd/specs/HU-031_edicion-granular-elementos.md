# HU-031: Selección y edición granular de elementos dentro de un recurso

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | HU-031 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | spec_ready |
| Prioridad | Media |
| Estimación | 8 SP (inferido) |
| Dependencia | HU-026, HU-029 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

## Historia de Usuario

Como **estudiante del curso de ML de UPAO**, quiero seleccionar un elemento
concreto dentro de un recurso para regenerarlo o editarlo, para hacer ajustes muy
finos sin tocar el resto del recurso.

## Contexto

HU-026 opera a nivel de **recurso** (página/elemento completo). HU-031 baja un
nivel: **sub-elementos** dentro de un recurso. No se fija qué tipos de sub-elemento
son editables — depende de los tipos de recurso que el OVA llegue a soportar. En el
esquema de versiones es el nivel **patch `vN.M.P`** (major `vN` = generación
completa, minor `vN.M` = recurso / HU-029). Es la HU más exploratoria del bloque:
exige marcar sub-elementos en el render y que el backend pueda rehacer un fragmento.

## Alcance

### Incluye
- **Seleccionar un sub-elemento** dentro de un recurso (marcado identificable).
- **Regenerar** y **Editar** (prompt puntual) ese sub-elemento.
- Versionar el cambio como **patch `vN.M.P`** + historial/revertir granular (reusa HU-029).

### No incluye
- La edición a nivel de **recurso** (Regenerar/Editar/Eliminar/código) → HU-026.
- El versionado **major/minor** → HU-028 / HU-029.
- La definición cerrada de tipos de sub-elemento (queda abierta).

## Dependencias

- **HU-026** — edición por recurso e infraestructura de identificación en el preview/código.
- **HU-029** — micro-versionado (se extiende un nivel para el patch).
- **Backend/render**: capacidad de **marcar sub-elementos** y de **rehacer/editar un fragmento** de un recurso (puede requerir cambios al motor de generación).

## Reglas de negocio

1. **R1** — En el preview/código, se puede **seleccionar un sub-elemento** dentro de un recurso; el render lo **marca** de forma identificable. No se fijan los tipos de sub-elemento.
2. **R2** — El sub-elemento ofrece **Regenerar** y **Editar** (prompt puntual); el cambio afecta **solo** ese sub-elemento y deja el resto del recurso intacto.
3. **R3** — Cada cambio granular sube una **patch `vN.M.P`** (reusa la infraestructura de versionado de HU-029, extendida un nivel) y queda en el **historial**; se puede **revertir** el sub-elemento.
4. **R4** — **Riesgo técnico** (anotado): requiere render que marque sub-elementos y backend capaz de rehacer/editar un fragmento; si no es viable rehacer un fragmento aislado, se acota a los sub-elementos que sí lo permitan.
5. **R5** — La **eliminación** granular se cubre por la edición por código de HU-026; HU-031 se centra en **regenerar/editar**.
6. **R6** — Interfaz **responsive**, < 200 líneas/archivo, patrón services → hooks → pages; backend router → service → model.

## Criterios de aceptación

- Se puede seleccionar un sub-elemento dentro de un recurso. **(R1)**
- "Regenerar" rehace solo ese sub-elemento; "Editar" lo modifica con un prompt puntual; el resto del recurso no cambia. **(R2)**
- El cambio granular sube una patch `vN.M.P` y queda en el historial, con opción de revertir. **(R3)**
- La interfaz funciona en móvil y ningún archivo nuevo supera 200 líneas. **(R6, C3, C7)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Edición granular de sub-elementos (HU-031)

  Scenario: Regenerar un sub-elemento
    Given un recurso que contiene varios sub-elementos
    When el estudiante selecciona un sub-elemento y elige "Regenerar"
    Then solo ese sub-elemento se regenera
    And el resto del recurso queda igual

  Scenario: Editar un sub-elemento con un prompt
    Given un sub-elemento seleccionado
    When el estudiante elige "Editar" y escribe un prompt
    Then solo ese sub-elemento se modifica según el prompt

  Scenario: El cambio granular sube una patch
    Given un recurso en versión "v2.3"
    When el estudiante regenera un sub-elemento de ese recurso
    Then el cambio queda como "v2.3.1" en el historial
    And se puede revertir el sub-elemento a su estado anterior
```

## Mockup ASCII

```
Recurso "Explain" (modo granular)
┌───────────────────────────────────────────────┐
│  [ sub-elemento A ]  ◄ seleccionado            │
│   ┌─────────── popover ───────────┐            │
│   │  ↻ Regenerar    ✎ Editar      │            │
│   └───────────────────────────────┘            │
│  [ sub-elemento B ]   [ sub-elemento C ]        │
│                              versión: v2.3.1 🕘  │
└───────────────────────────────────────────────┘
```
