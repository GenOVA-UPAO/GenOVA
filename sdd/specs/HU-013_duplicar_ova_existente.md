# HU-013: Duplicar OVA Existente

## Historia de Usuario
Como estudiante del curso de ML de UPAO, quiero poder duplicar un OVA existente para usarlo como punto de partida para un nuevo material relacionado, ahorrando tiempo al no tener que empezar desde cero con un prompt nuevo.

## Objetivo funcional
Permitir al usuario crear una copia independiente de un OVA existente con un clic, copiando su título, descripción, prompt y fases de la versión activa, para que pueda editarla libremente sin afectar al original. El duplicado se crea de forma sincrónica y redirige al editor inmediatamente.

## Alcance

### Incluye
- Botón **"Duplicar"** en cada card de OVA activo en `/mis-ovas`.
- Duplicación sincrónica: crea un nuevo registro `ovas` + versión v1 + fases copiadas de la versión activa del original.
- Título del duplicado: `"{título original} (copia)"`. Si ya existe, `"{título original} (copia 2)"`, `"(copia 3)"`, etc.
- El duplicado inicia con `status = 'borrador'` y sin archivo SCORM.
- El duplicado pertenece al usuario que presionó "Duplicar" (no necesariamente al creador del original).
- Redirección automática al editor del duplicado (`/mis-ovas/{nuevo_id}/editar`) tras la creación.
- El botón "Duplicar" está **deshabilitado** para OVAs en estado `generando`, con tooltip explicativo.
- El botón "Duplicar" **no aparece** para OVAs en la papelera.

### No incluye
- Copia del archivo SCORM físico (el duplicado comienza sin SCORM; debe exportarse desde el editor).
- Herencia del historial de versiones del original (el duplicado tiene su propio historial desde v1).
- Selección de qué versión copiar (siempre se copia la versión activa).
- Duplicación en lote (multi-selección).
- Configuración del nombre del duplicado antes de crearlo (el sufijo es automático).

## Reglas de negocio
1. Solo se pueden duplicar OVAs con `deleted_at IS NULL` (activos, no en papelera).
2. Un OVA en estado `generando` no puede duplicarse. El botón aparece deshabilitado.
3. El duplicado siempre pertenece al usuario autenticado que realiza la acción, independientemente de quién sea el propietario del original.
4. El título del duplicado sigue el patrón: `"{título} (copia)"`. Si ese título ya existe para el mismo usuario, se intenta `"{título} (copia 2)"`, `"(copia 3)"`, hasta encontrar un nombre libre (máximo 10 intentos; si se superan, se usa `"(copia N)"` con un timestamp).
5. La duplicación copia las fases de la versión activa del original. Si el original no tiene versión activa (OVA anterior a HU-011), se crea el duplicado solo con prompt y sin fases.
6. La operación es atómica: si falla cualquier paso (crear OVA, versión o fases), se revierte todo el cambio.
7. El duplicado no hereda `file_path` del original.

## Modelo de datos — cambios requeridos

No se requieren tablas nuevas. La duplicación inserta registros en las tablas existentes:

| Tabla        | Acción                                                    |
|--------------|-----------------------------------------------------------|
| `ovas`       | INSERT con nuevo `id`, `user_id` del solicitante, título con sufijo, `status = 'borrador'`, `file_path = NULL` |
| `ova_versions` | INSERT versión v1 con `is_active = TRUE`, copiando el `prompt` de la versión activa del original |
| `ova_phases` | INSERT por cada fase de la versión activa original, copiando `phase_type`, `phase_order`, `content` |

## Contrato de API

### `POST /api/ovas/{ova_id}/duplicar`
Crea un duplicado independiente del OVA especificado.

**Response 201:**
```json
{
  "id": "uuid-del-duplicado",
  "title": "Redes Neuronales (copia)",
  "status": "borrador",
  "message": "OVA duplicado correctamente.",
  "edit_url": "/mis-ovas/{nuevo_id}/editar"
}
```

**Errores:**

| Código | Condición                                                        |
|--------|------------------------------------------------------------------|
| 404    | OVA original no encontrado o está en la papelera                |
| 409    | OVA original tiene `status = 'generando'`                       |

> No se requiere que el solicitante sea propietario del original — cualquier usuario autenticado puede duplicar cualquier OVA activo visible para él.

---

## Criterios de Aceptación

### CA-01: Botón "Duplicar" visible en historial
**Dado** que soy un usuario autenticado con OVAs activos en `/mis-ovas`,
**cuando** veo las cards de mis OVAs,
**entonces** cada card tiene un botón "Duplicar" visible (excepto los que están en la papelera).

### CA-02: Botón deshabilitado durante generación
**Dado** que un OVA tiene `status = 'generando'`,
**cuando** veo su card en `/mis-ovas`,
**entonces** el botón "Duplicar" aparece deshabilitado y un tooltip indica "No disponible mientras se genera el OVA".

### CA-03: Duplicación exitosa y redirección
**Dado** que presiono "Duplicar" en un OVA con título "Redes Neuronales",
**cuando** la operación completa,
**entonces** se crea un nuevo OVA con título "Redes Neuronales (copia)" y status "borrador", y soy redirigido automáticamente a `/mis-ovas/{nuevo_id}/editar`.

### CA-04: El duplicado aparece en el historial
**Dado** que el duplicado fue creado,
**cuando** navego a `/mis-ovas`,
**entonces** el OVA "Redes Neuronales (copia)" aparece al inicio del listado con badge "Borrador" y la fecha actual.

### CA-05: Independencia del original
**Dado** que edito el contenido de una fase del duplicado,
**cuando** guardo los cambios,
**entonces** el OVA original "Redes Neuronales" no ve modificado ninguno de sus contenidos ni versiones.

### CA-06: Nombre auto-incremental ante duplicados
**Dado** que ya existe un OVA llamado "Redes Neuronales (copia)",
**cuando** duplico nuevamente "Redes Neuronales",
**entonces** el nuevo duplicado se llama "Redes Neuronales (copia 2)".

### CA-07: El duplicado inicia sin SCORM
**Dado** que el OVA original tiene `status = 'listo'` con un archivo SCORM,
**cuando** lo duplico,
**entonces** el duplicado tiene `status = 'borrador'` y sin archivo SCORM disponible para descargar.

### CA-08: Fases del duplicado son independientes
**Dado** que el duplicado tiene las fases copiadas del original,
**cuando** edito una fase del duplicado,
**entonces** la versión v1 del duplicado recibe los cambios y el original no se ve afectado.

### CA-09: Estado de carga durante duplicación
**Dado** que presiono "Duplicar",
**cuando** la operación está en curso,
**entonces** el botón muestra "Duplicando..." y está deshabilitado temporalmente para evitar doble envío.

---

## Escenarios BDD (Gherkin)

```gherkin
Feature: HU-013 — Duplicar OVA Existente

  Background:
    Given el usuario "ana@upao.edu" está autenticado con rol "usuario"
    And existe el OVA "Redes Neuronales" con id "ov-1" de "ana@upao.edu"
    And el OVA "ov-1" tiene status "listo" y versión activa v2 con 5 fases

  Scenario: CA-01 — Botón Duplicar visible en historial
    When "ana@upao.edu" navega a "/mis-ovas"
    Then ve el botón "Duplicar" habilitado en la card de "Redes Neuronales"

  Scenario: CA-02 — Botón deshabilitado durante generación
    Given el OVA "ov-1" tiene status "generando"
    When "ana@upao.edu" navega a "/mis-ovas"
    Then el botón "Duplicar" del OVA "ov-1" está deshabilitado
    And al pasar el cursor muestra "No disponible mientras se genera el OVA"

  Scenario: CA-03 — Duplicación exitosa y redirección al editor
    When "ana@upao.edu" hace clic en "Duplicar" del OVA "Redes Neuronales"
    Then el botón muestra "Duplicando..." y se deshabilita temporalmente
    And se crea un nuevo OVA con título "Redes Neuronales (copia)" y status "borrador"
    And "ana@upao.edu" es redirigida a "/mis-ovas/{nuevo_id}/editar"
    And el editor muestra las mismas 5 fases que tenía la versión activa v2 del original

  Scenario: CA-04 — El duplicado aparece en el historial
    Given el duplicado "Redes Neuronales (copia)" fue creado
    When "ana@upao.edu" navega a "/mis-ovas"
    Then "Redes Neuronales (copia)" aparece primero en el listado
    And muestra el badge "Borrador" y la fecha actual

  Scenario: CA-05 — Independencia entre original y duplicado
    Given existe el duplicado "Redes Neuronales (copia)" con id "ov-2"
    When "ana@upao.edu" edita la fase "motivacion" del duplicado "ov-2"
    And guarda los cambios
    Then el OVA original "ov-1" conserva su contenido sin cambios
    And el duplicado "ov-2" tiene el contenido actualizado en su versión v2

  Scenario: CA-06 — Nombre auto-incremental
    Given ya existe el OVA "Redes Neuronales (copia)" para "ana@upao.edu"
    When "ana@upao.edu" duplica nuevamente "Redes Neuronales"
    Then el nuevo duplicado se llama "Redes Neuronales (copia 2)"

  Scenario: CA-07 — El duplicado inicia sin SCORM
    Given el OVA "ov-1" tiene status "listo" con archivo SCORM disponible
    When "ana@upao.edu" duplica "ov-1"
    Then el duplicado tiene status "borrador"
    And el botón "Descargar" del duplicado aparece deshabilitado

  Scenario: CA-08 — Fases copiadas son independientes
    Given el duplicado hereda las fases de la versión activa del original
    When "ana@upao.edu" regenera la fase "actividad" del duplicado
    Then solo el duplicado tiene la fase "actividad" regenerada
    And el OVA original conserva su fase "actividad" intacta

  Scenario: CA-09 — Estado de carga sin doble envío
    When "ana@upao.edu" hace clic en "Duplicar"
    Then el botón cambia a "Duplicando..." y no puede presionarse de nuevo
    When la operación finaliza
    Then el botón vuelve a su estado normal en la card original
```

---

## Mockups ASCII

### Card de OVA en `/mis-ovas` con botón Duplicar

```
┌──────────────────────────────────────────────────────────────────┐
│ ☐  Redes Neuronales                              [LISTO ✓]      │
│     Aprendizaje profundo aplicado a...  · 15 may 2026           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  [✏ Editar]                                             │    │
│  │  [⬇ Descargar]   [📋 Duplicar]   [🗑 Mover a papelera] │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘

Estado durante duplicación:
┌──────────────────────────────────────────────────────────────────┐
│ ☐  Redes Neuronales                              [LISTO ✓]      │
│     Aprendizaje profundo aplicado a...  · 15 may 2026           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  [✏ Editar·]                                            │    │
│  │  [⬇ Descargar·] [📋 Duplicando...·] [🗑 Papelera·]     │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
  Leyenda: [·] = botón deshabilitado
```

---

### Resultado en `/mis-ovas` tras duplicar

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Mis OVAs                                                               │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ ☐  Redes Neuronales (copia)                   [BORRADOR]        │   │
│  │     Aprendizaje profundo aplicado a...  · Hoy, 14:32            │   │
│  │     [✏ Editar] [⬇ Descargar·] [📋 Duplicar] [🗑 Papelera]      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ ☐  Redes Neuronales                              [LISTO ✓]      │   │
│  │     Aprendizaje profundo aplicado a...  · 15 may 2026           │   │
│  │     [✏ Editar] [⬇ Descargar] [📋 Duplicar] [🗑 Papelera]       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Consideraciones técnicas (no son tareas de implementación)

- El endpoint `POST /api/ovas/{ova_id}/duplicar` debe ejecutarse en una **transacción atómica** que cree el `Ova`, el `OvaVersion` y los `OvaPhase` en un solo bloque; si falla, hace rollback completo.
- La lógica de nombre auto-incremental puede implementarse con una consulta que cuente cuántos títulos del patrón `"{título} (copia*)"` ya existen para el usuario y derivar el siguiente número libre.
- El `edit_url` en la respuesta del backend facilita que el frontend navegue directamente sin necesidad de construir la URL en el cliente.
- El frontend debe deshabilitar todos los botones de la card durante la operación de duplicación para evitar interacciones concurrentes.
- No se copia `file_path` del original; el campo queda en `NULL` en el duplicado.
