# HU-030: "Mis OVAs" — acceso al workspace + versión en metadata

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | HU-030 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | spec_ready |
| Prioridad | Media |
| Estimación | 3 SP (inferido) |
| Dependencia | HU-006, HU-025 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

## Historia de Usuario

Como **estudiante del curso de ML de UPAO**, quiero que en "Mis OVAs" el botón me
lleve al workspace de edición y que se muestre la versión del OVA, para entrar
directo a editar y conocer en qué versión está.

## Contexto

"Mis OVAs" (HU-006) lista los OVAs con acciones (editar, duplicar, descargar,
eliminar) en `frontend/src/pages/MisOvasPage.jsx` / `components/OvaCard.jsx`. El
botón "Editar" debe pasar a abrir el **workspace (HU-025)**, y la tarjeta debe
mostrar la **versión** activa del OVA. Hoy `_ova_to_dict`
(`backend/ova/helpers.py:22`) **no** expone la versión; hay que enlazar la versión
activa (`OvaVersion`).

## Alcance

### Incluye
- El botón de edición de cada OVA abre el **workspace (HU-025)**.
- La tarjeta del OVA muestra su **versión** activa.
- Exponer la versión activa en el contrato del OVA (`_ova_to_dict`).

### No incluye
- El workspace en sí (→ HU-025).
- El historial/diff/revertir de versiones (→ HU-028).
- Cambios a duplicar/descargar/eliminar (se conservan).

## Dependencias

- **HU-006** — listado "Mis OVAs".
- **HU-025** — workspace destino.
- **HU-028 / OvaVersion** — versión activa a mostrar.
- Toca: `pages/MisOvasPage.jsx`, `components/OvaCard.jsx`, `hooks/useOvaList.js` (frontend); `backend/ova/helpers.py` (`_ova_to_dict`).

## Reglas de negocio

1. **R1** — En "Mis OVAs", el botón que antes decía "Editar" pasa a **abrir el workspace (HU-025)** del OVA.
2. **R2** — La tarjeta del OVA muestra su **versión activa** (major `vN`); el backend la expone en `_ova_to_dict` (join a la versión activa).
3. **R3** — Las acciones **duplicar, descargar y eliminar (papelera)** se conservan sin cambios.
4. **R4** — Interfaz **responsive**, < 200 líneas/archivo, patrón services → hooks → pages (sin fetch en pages/hooks).

## Criterios de aceptación

- El botón de edición de cada OVA en "Mis OVAs" abre el workspace del OVA. **(R1)**
- La tarjeta muestra la versión activa del OVA. **(R2)**
- Duplicar, descargar y eliminar siguen funcionando igual. **(R3)**
- El endpoint del listado incluye la versión activa de cada OVA. **(R2)**
- La interfaz funciona en móvil y ningún archivo nuevo supera 200 líneas. **(R4, C3, C7)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: "Mis OVAs" — acceso al workspace + versión (HU-030)

  Scenario: Abrir el workspace desde Mis OVAs
    Given un estudiante en "Mis OVAs" con un OVA listo
    When pulsa el botón de edición del OVA
    Then se abre el workspace de ese OVA

  Scenario: Ver la versión del OVA en la tarjeta
    Given un OVA cuya versión activa es "v2"
    When el estudiante mira su tarjeta en "Mis OVAs"
    Then la tarjeta muestra "v2"

  Scenario: Las demás acciones se conservan
    Given un OVA en "Mis OVAs"
    Then el estudiante puede duplicarlo, descargarlo y enviarlo a la papelera como antes
```

## Mockup ASCII

```
"Mis OVAs"
┌───────────────────────────────────────────────┐
│  Árboles de decisión            v2             │
│   [ Abrir en workspace ]  [ Descargar ] [ ⋯ ]  │
│                              (⋯ = duplicar/eliminar)
└───────────────────────────────────────────────┘
```
