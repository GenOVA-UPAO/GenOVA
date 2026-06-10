# HU-025: Workspace de edición de OVA (panel dividido)

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | HU-025 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | spec_ready |
| Prioridad | Alta |
| Estimación | 13 SP (inferido) |
| Dependencia | HU-003, HU-004, HU-024, HU-023 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

## Historia de Usuario

Como **estudiante del curso de ML de UPAO**, quiero un workspace con el chat de
creación/edición a la izquierda y el OVA a la derecha, para crear, previsualizar y
editar el OVA en una sola vista.

## Contexto

Hoy el flujo está partido entre `CrearOvaPage`, la vista previa 5E y
`EditarOvaPage`. El usuario quiere una vista tipo "chat + lienzo": a la izquierda
el prompt (con adjuntos de HU-024), a la derecha el OVA con **Preview**/**Code** y
**descarga SCORM**. Esta HU define la **cáscara** del workspace y deja anclajes
para las HU que viven dentro: edición por click (**HU-026**), selección de
recursos (**HU-027**) y versionado/historial (**HU-028**). Reusa los visores
existentes (`OvaFiveEViewer`, `HtmlCodePreview`) y el job server-side de EN-013/HU-023.

## Alcance

### Incluye
- Ruta/vista nueva del workspace con **layout dividido** y **divider ajustable**.
- Panel izquierdo: chat/prompt (con adjuntos de HU-024).
- Panel derecho: **Preview** / **Code** + **descarga SCORM**.
- Botón **Atrás → "Mis OVAs"**.
- Reuso del progreso de generación (EN-013/HU-023).
- **Anclajes** (placeholders) para HU-026/HU-027/HU-028.

### No incluye
- El comportamiento de **click-to-edit** en el preview (→ HU-026).
- El botón **"Seleccionar recursos"** y su lógica (→ HU-027).
- El **versionado/historial/diff/revertir** y el badge de versión (→ HU-028).
- Cambios en el motor de generación o exportación SCORM (reusa lo existente).

## Dependencias

- **HU-003** (vista 5E) y visores `OvaFiveEViewer` / `HtmlCodePreview` / `PhaseCard`.
- **HU-004** — descarga SCORM (endpoint `GET` de descarga en `backend/ova/router.py`).
- **HU-024** — componente de adjuntos en el prompt.
- **EN-013 / HU-023** — generación server-side + progreso reusados.
- Toca (frontend): `App.jsx` (ruta), nueva `pages/OvaWorkspacePage.jsx`, componentes `components/workspace/*` (panel chat, panel OVA, divider, toolbar), reuso de visores; hook `hooks/useOvaWorkspace.js`; servicios existentes.

## Reglas de negocio

1. **R1** — Existe una **vista/ruta nueva** de workspace (p. ej. `/ova/:ovaId/workspace`) con un botón **Atrás** que lleva a **"Mis OVAs"** (no a crear de nuevo).
2. **R2** — **Layout dividido**: izquierda chat/prompt, derecha el OVA. Una **línea/divider central** permite **ajustar la proporción** arrastrando.
3. **R3** — El panel derecho ofrece **Preview** (render del OVA) y **Code** (HTML/código), reusando `OvaFiveEViewer` / `HtmlCodePreview`.
4. **R4** — La **descarga SCORM** está en el panel derecho y reusa el endpoint de descarga existente.
5. **R5** — El **prompt izquierdo** permite adjuntar archivos reusando el componente de **HU-024**.
6. **R6** — La generación/progreso dentro del workspace **reusa** el job server-side (EN-013) y su visualización (HU-023); HU-025 no reimplementa la generación.
7. **R7** — El área de preview y la barra del panel derecho dejan **anclajes** para: click-to-edit (HU-026), botón "Seleccionar recursos" (HU-027) y versión/historial (HU-028). Estos anclajes **no** llevan lógica en HU-025.
8. **R8** — **Responsive**: en pantallas pequeñas el split colapsa a **pestañas/stack** (Chat / Preview-Code) en lugar de lado a lado.
9. **R9** — **Modularidad**: el workspace se divide en varios componentes para respetar < 200 líneas/archivo; patrón services → hooks → pages (sin fetch en pages/hooks).

## Criterios de aceptación

- Existe una vista de workspace con layout dividido (chat izquierda / OVA derecha) y un botón Atrás que lleva a "Mis OVAs". **(R1, R2)**
- El divider central permite cambiar la proporción de ambos paneles arrastrando. **(R2)**
- El panel derecho alterna entre Preview y Code mostrando el OVA. **(R3)**
- El botón de descarga SCORM del panel derecho descarga el paquete del OVA. **(R4)**
- El prompt izquierdo permite adjuntar archivos (componente de HU-024). **(R5)**
- Si el OVA se está generando, el workspace muestra el progreso reusando el flujo de EN-013/HU-023. **(R6)**
- Existen los anclajes visuales para HU-026/HU-027/HU-028 sin comportamiento aún. **(R7)**
- En móvil el contenido se reorganiza en pestañas/stack sin solapamientos. **(R8)**
- Ningún archivo nuevo supera 200 líneas y se respeta services → hooks → pages. **(R9, C3, C7)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Workspace de edición de OVA (HU-025)

  Scenario: Abrir el workspace de un OVA
    Given un estudiante con un OVA en "Mis OVAs"
    When abre el OVA en el workspace
    Then ve el chat/prompt a la izquierda y el OVA a la derecha
    And puede volver a "Mis OVAs" con el botón Atrás

  Scenario: Alternar Preview y Code
    Given el workspace de un OVA abierto
    When pulsa "Code"
    Then el panel derecho muestra el HTML/código del OVA
    When pulsa "Preview"
    Then el panel derecho muestra el OVA renderizado

  Scenario: Ajustar la proporción del split
    Given el workspace con paneles izquierdo y derecho
    When el estudiante arrastra el divider central
    Then la proporción de los paneles cambia de acuerdo al arrastre

  Scenario: Descargar SCORM desde el workspace
    Given un OVA listo en el workspace
    When pulsa el botón de descarga SCORM del panel derecho
    Then se descarga el paquete SCORM del OVA

  Scenario: Layout responsive en móvil
    Given el workspace en una pantalla pequeña
    Then el chat y el OVA se muestran en pestañas/stack en lugar de lado a lado
```

## Mockup ASCII

```
/ova/123/workspace
┌─────────────────────────────────────────────────────────────────────┐
│ [← Mis OVAs]   Árboles de decisión            v1 ▾ · ⋯               │ ← (v/⋯ anclaje HU-028/030)
├───────────────────────────────┬─────────────────────────────────────┤
│  Chat / Prompt                 │  [ Preview ] [ Code ]   [⤓ SCORM]   │
│  ┌──────────────────────────┐  │ ┌─────────────────────────────────┐ │
│  │ 📎 chips (HU-024)        │  ║ │  (OVA renderizado / código)     │ │
│  │ Escribe un cambio…   📎  │  ║ │   · click-to-edit → HU-026      │ │
│  └──────────────────────────┘  │ └─────────────────────────────────┘ │
│  [ Seleccionar recursos ]→HU-027                                     │
└───────────────────────────────┴─────────────────────────────────────┘
        (║ = divider ajustable · móvil → pestañas Chat / Preview-Code)
```
