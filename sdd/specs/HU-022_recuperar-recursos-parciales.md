# HU-022: Recuperación de recursos parciales tras error de generación

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | HU-022 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | spec_ready |
| Prioridad | Alta |
| Estimación | 8 SP (inferido) |
| Dependencia | HU-002, EN-013, EN-012 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

## Historia de Usuario

Como **estudiante del curso de ML de UPAO**, quiero recuperar los recursos que sí
se generaron cuando la creación de un OVA falla a mitad, para conservar al menos
un resultado parcial y no perder el trabajo.

## Contexto

Un **recurso** es cada **elemento generable dentro de una fase 5E** (texto,
imagen, código, ejercicio, …); una fase agrupa varios recursos (filas `OvaPhase`
con su `resource_type`). Los errores de generación pueden ser del modelo,
agotamiento de tokens u otros. Hoy, si un recurso falla, el cliente lo **omite en
silencio** (`frontend/src/hooks/useOvaCreation.js:140`) y el backend devuelve un
`500` genérico sin identificador. Esta HU se apoya en **EN-013** (persiste cada
recurso apenas se completa y expone su estado/`error_id` + `resume`) y en **EN-012**
(registra el error en Supabase y emite el Error ID). HU-022 hace **visible y
recuperable** ese estado parcial en la interfaz.

## Alcance

### Incluye
- Conservar el OVA parcial (recursos ya generados) cuando la generación falla a mitad.
- Mensaje de error con **Error ID** en la ubicación del **recurso** fallido.
- Marca **"X"** del recurso fallido en la lista de recursos de la página de creación.
- **Reintentar** individual por recurso.
- **Reintento múltiple**: selección de recursos fallidos, "Seleccionar todos los fallidos" y "Reintentar seleccionados".
- Manejo del caso de **fallo total** (ningún recurso generado).

### No incluye
- La tabla de jobs / persistencia incremental / `resume` (→ EN-013).
- El registro del error en Supabase para análisis (→ EN-012).
- La generación en background ni reanudar como sesión desde "Mis OVAs" (→ HU-023).
- La edición por click en el preview (→ HU-026).

## Dependencias

- **EN-013** — persistencia incremental por recurso + estado/`error_id` + endpoint `resume` (continúa recursos `pending`/`error`).
- **EN-012** — emite y registra el `error_id` opaco.
- **HU-002** — flujo de creación de OVA desde prompt.
- Toca (frontend): `hooks/useOvaCreation.js`, `pages/CrearOvaPage.jsx`, lista/tarjetas de recursos (`components/PhaseCard.jsx` u homólogo), `services/ovaCreationService.js`.

## Reglas de negocio

1. **R1** — Si la generación falla con **≥1 recurso `done`**, el OVA se conserva como **borrador parcial** con sus recursos generados (no se descarta lo logrado).
2. **R2** — El OVA parcial aparece en **"Mis OVAs"** para retomarlo o editarlo después.
3. **R3** — En la **ubicación del recurso fallido** se muestra: *"Lo sentimos, hubo un error generando el recurso. Error ID: <error_id>"* (texto ajustable).
4. **R4** — El **Error ID es opaco** (UUID), coincide con el registrado por EN-012, y la interfaz **nunca** muestra `str(e)`, stack ni tokens.
5. **R5** — En la **lista de recursos** (agrupados por fase) cada recurso se marca según estado: `error` → **"X"**, `done` → check, `pending`/`running` → indicador de progreso.
6. **R6** — Cada recurso fallido ofrece **"Reintentar"**, que regenera **solo ese recurso** (vía `resume` de EN-013) sin tocar los demás.
7. **R7** — **Reintento múltiple**: los recursos fallidos son **seleccionables** (checkbox); un botón **"Seleccionar todos los fallidos"** los marca todos; un botón **"Reintentar seleccionados"** regenera el lote en una sola operación (vía `resume`).
8. **R8** — En **fallo total** (0 recursos generados) no se crea un OVA vacío; se muestra el error general con su Error ID y la opción de reintentar.
9. **R9** — La interfaz es **responsive** (RN-005), respeta < 200 líneas/archivo y el patrón services → hooks → pages (sin fetch en pages/hooks).

## Criterios de aceptación

- Cuando ≥1 recurso quedó listo y otro falla, los recursos listos siguen visibles/previsualizables y el OVA queda guardado como borrador parcial. **(R1)**
- El OVA parcial es accesible desde "Mis OVAs". **(R2)**
- El recurso fallido muestra el mensaje con un Error ID en su ubicación. **(R3, R4)**
- La lista de recursos marca con "X" cada recurso fallido y con check los completados. **(R5)**
- "Reintentar" sobre un recurso regenera solo ese recurso y, si tiene éxito, reemplaza la "X" por check sin tocar los demás. **(R6)**
- Se pueden seleccionar varios recursos fallidos; "Seleccionar todos los fallidos" los marca todos y "Reintentar seleccionados" los regenera en lote, actualizando cada uno según su resultado. **(R7)**
- Ante fallo total no aparece un OVA vacío en el historial; se ofrece reintentar. **(R8)**
- La vista funciona en escritorio y móvil sin solapamientos, y ningún archivo nuevo supera 200 líneas. **(R9, C3, C7)**
- La respuesta de error del backend no contiene `str(e)` ni tokens (solo `status` + `error_id`). **(R4, C4)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Recuperación de recursos parciales tras error de generación (HU-022)

  Scenario: Se conservan los recursos generados cuando uno falla
    Given un estudiante genera un OVA cuyas fases contienen varios recursos
    And varios recursos se generan correctamente
    When un recurso falla por un error del modelo
    Then los recursos ya generados permanecen visibles y previsualizables
    And el OVA se guarda como borrador parcial accesible en "Mis OVAs"

  Scenario: El recurso fallido muestra mensaje con Error ID y marca X
    Given una generación en la que un recurso quedó en error
    When el estudiante mira la página de creación
    Then ese recurso muestra "Lo sentimos, hubo un error generando el recurso. Error ID: <id>"
    And en la lista de recursos ese recurso aparece marcado con una "X"
    And el mensaje no contiene el detalle interno de la excepción

  Scenario: Reintentar regenera solo el recurso fallido
    Given un recurso en error y los demás listos
    When el estudiante pulsa "Reintentar" en ese recurso
    Then solo ese recurso se regenera
    And si tiene éxito su "X" se reemplaza por un check
    And los demás recursos no se regeneran

  Scenario: Reintentar varios recursos fallidos a la vez
    Given tres recursos en error y el resto listos
    When el estudiante pulsa "Seleccionar todos los fallidos"
    And pulsa "Reintentar seleccionados"
    Then los tres recursos en error se regeneran en una sola operación
    And cada uno se actualiza a check o se mantiene en "X" según su resultado
    And los recursos que ya estaban listos no se tocan

  Scenario: Fallo total no crea un OVA vacío
    Given una generación en la que ningún recurso se completó
    When la generación termina en error
    Then no aparece un OVA vacío en "Mis OVAs"
    And se muestra un error general con su Error ID y la opción de reintentar
```

## Mockup ASCII

```
┌────────────────────────────────────────────────────────────┐
│  Crear OVA — "Árboles de decisión"                          │
│  Recursos:           [ Seleccionar todos los fallidos ]     │
│                      [ Reintentar seleccionados (2) ]       │
│  ▸ Engage                                                   │
│     ✔ Texto introductorio     ✔ Imagen de portada          │
│  ▸ Explain                                                  │
│     ✔ Texto teoría            ☑✖ Diagrama (error)          │
│     ☐✖ Ejercicio (error)                                    │
│  ▸ Evaluate                                                 │
│     … Quiz (generando)                                      │
├────────────────────────────────────────────────────────────┤
│  Preview · recurso "Diagrama"                               │
│   ⚠ Lo sentimos, hubo un error generando el recurso.        │
│      Error ID: 8f3a…c1            [ Reintentar ]            │
└────────────────────────────────────────────────────────────┘
  (✔ listo · ✖ error · … generando · ○ pendiente · ☑/☐ selección)
```
