# HU-023: Generación de OVA en background persistente y reanudación

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | HU-023 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | spec_ready |
| Prioridad | Alta |
| Estimación | 13 SP (inferido) |
| Dependencia | HU-002, EN-013 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

## Historia de Usuario

Como **estudiante del curso de ML de UPAO**, quiero que la generación de un OVA
continúe aunque cierre o recargue la pestaña, para no perder el progreso y poder
retomarlo después desde "Mis OVAs".

## Contexto

Hoy la generación es **síncrona y orquestada desde el navegador**
(`frontend/src/hooks/useOvaCreation.js`): si se cierra la pestaña, se pierde. Esta
HU es el **flujo de usuario** que se apoya en **EN-013** (que mueve la
orquestación al servidor, persiste el job y el estado por recurso, y ofrece
`resume`). HU-023 hace que la generación corra en segundo plano y sea **retomable**
desde "Mis OVAs", reconstruyendo el estado desde el backend.

## Alcance

### Incluye
- Disparar la generación como **job server-side** (EN-013) y observar el progreso por **polling**.
- Que la generación **continúe** aunque se cierre/recargue la pestaña.
- Mostrar el OVA en generación en **"Mis OVAs"** con estado "generando".
- **"Reanudar / Ver progreso"** que reabre la vista y reconstruye el estado (recursos `done`/`pending`/`running`/`error`).
- **Continuar** un job `interrupted` (vía `resume` de EN-013).

### No incluye
- La tabla de jobs / orquestación server-side / `resume` (→ EN-013).
- El mensaje "Error ID" y la "X" por recurso (→ HU-022; aquí solo se reflejan).
- El registro del error en Supabase (→ EN-012).
- Notificación push/email al terminar.
- El workspace split de edición (→ HU-025); reusa la vista de generación actual.

## Dependencias

- **EN-013** — job server-side, estado persistido por recurso, lookup por `ova_id`, `resume`.
- **HU-002** — origen del flujo de creación (pasa a disparar el job).
- **HU-022** — la vista de progreso reusa la marca "X" + Error ID por recurso.
- Toca (frontend): `pages/CrearOvaPage.jsx` (vista de progreso), `pages/MisOvasPage.jsx`, `hooks/useOvaList.js`, nuevo hook de polling de job (p. ej. `hooks/useOvaJob.js`), `services/ovaCreationService.js`, `services/ovaHistoryService.js`.

## Reglas de negocio

1. **R1** — La generación se **inicia como job server-side** (EN-013); el cliente solo dispara y **observa** el progreso.
2. **R2** — El progreso se actualiza por **polling** (~4s, patrón de `useRegenEditor`). Cerrar o recargar la pestaña **no detiene** la generación.
3. **R3** — El OVA en generación aparece en **"Mis OVAs"** con estado **"generando"** y un indicador de avance (p. ej. recursos listos / total).
4. **R4** — Un OVA "generando" o "interrumpido" ofrece **"Reanudar / Ver progreso"**, que reabre la vista y **reconstruye el estado desde el backend** (`GET` job por `ova_id`): `done` con contenido, `pending`/`running` con indicador, `error` con "X" + Error ID (HU-022).
5. **R5** — Si la generación **terminó** mientras la pestaña estaba cerrada, al volver el OVA muestra su estado final (`listo`, o `error`/parcial) y su resultado.
6. **R6** — El **polling se detiene** cuando el job alcanza un estado terminal (`done`/`error`).
7. **R7** — Si el job quedó **`interrupted`** (server reiniciado), "Mis OVAs" permite **continuar** (llama `resume` de EN-013, que regenera solo lo `pending`/`error`).
8. **R8** — Un OVA tiene **a lo sumo un job activo**. Mientras "genera", la descarga SCORM y la edición están deshabilitadas; se habilitan al terminar.
9. **R9** — **Sin** notificación push/email; el usuario ve el resultado al volver a "Mis OVAs".
10. **R10** — Interfaz **responsive** (RN-005), patrón services → hooks → pages (sin fetch en pages/hooks) y < 200 líneas/archivo.

## Criterios de aceptación

- Iniciada la generación, cerrar/recargar la pestaña no la detiene; la generación sigue en el servidor. **(R1, R2)**
- El OVA en curso aparece en "Mis OVAs" con estado "generando" y avance. **(R3)**
- "Reanudar / Ver progreso" reabre la vista con los recursos ya generados, los pendientes/en curso y los fallidos (X + Error ID). **(R4)**
- Si la generación terminó mientras la pestaña estaba cerrada, al volver el OVA está listo (o error/parcial) con su resultado. **(R5)**
- El polling deja de consultar cuando el job termina. **(R6)**
- Un job interrumpido por reinicio del servidor puede continuarse desde "Mis OVAs" y solo regenera lo pendiente/fallido. **(R7)**
- Mientras genera, no se puede descargar SCORM ni editar; al terminar, sí. **(R8)**
- La vista funciona en escritorio y móvil y ningún archivo nuevo supera 200 líneas. **(R10, C3, C7)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Generación en background y reanudación (HU-023)

  Scenario: La generación continúa tras cerrar la pestaña
    Given un estudiante inicia la generación de un OVA
    And el servidor está generando los recursos
    When el estudiante cierra la pestaña
    And vuelve a abrir "Mis OVAs" más tarde
    Then el OVA aparece con estado "generando" o ya "listo"
    And no se perdió ningún recurso generado durante la ausencia

  Scenario: Reanudar muestra el progreso reconstruido
    Given un OVA en estado "generando" en "Mis OVAs"
    When el estudiante pulsa "Reanudar / Ver progreso"
    Then la vista muestra los recursos listos con su contenido
    And los recursos pendientes o en curso con su indicador
    And los recursos fallidos con su "X" y Error ID

  Scenario: Continuar un job interrumpido
    Given un OVA cuyo job quedó "interrumpido" por un reinicio del servidor
    When el estudiante pulsa "Continuar" desde "Mis OVAs"
    Then se regeneran solo los recursos pendientes o fallidos
    And los recursos ya listos permanecen sin cambios

  Scenario: El OVA en generación no es descargable hasta terminar
    Given un OVA en estado "generando"
    Then las acciones de descargar SCORM y editar están deshabilitadas
    When la generación termina con estado "listo"
    Then dichas acciones quedan habilitadas
```

## Mockup ASCII

```
"Mis OVAs"
┌───────────────────────────────────────────────────────────┐
│  Árboles de decisión            ⏳ Generando  3/8          │
│     [ Reanudar / Ver progreso ]   (descargar/editar ✕)     │
├───────────────────────────────────────────────────────────┤
│  Regresión lineal               ✔ Listo   v2               │
│     [ Abrir ] [ Descargar ] [ ⋯ ]                          │
├───────────────────────────────────────────────────────────┤
│  Redes neuronales               ⚠ Interrumpido            │
│     [ Continuar ]                                          │
└───────────────────────────────────────────────────────────┘

Vista de progreso (al Reanudar)
┌───────────────────────────────────────────────────────────┐
│  Generando "Árboles de decisión" …  (polling)             │
│   ✔ Engage·Texto   ✔ Engage·Imagen   … Explore·Código     │
│   ✖ Explain·Diagrama (Error ID 8f3a…c1)  ○ Evaluate·Quiz   │
└───────────────────────────────────────────────────────────┘
```
