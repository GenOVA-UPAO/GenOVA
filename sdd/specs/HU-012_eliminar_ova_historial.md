# HU-012: Eliminar OVA del Historial

## Historia de Usuario
Como estudiante del curso de ML de UPAO, quiero poder eliminar OVAs que ya no necesito de mi historial, para mantener mi espacio de trabajo organizado y no acumular material obsoleto.

## Objetivo funcional
Implementar un flujo completo de gestión de eliminación con papelera de reciclaje: los OVAs se mueven primero a una papelera (soft delete), desde donde pueden restaurarse o eliminarse permanentemente. Todas las operaciones admiten selección múltiple por checkboxes para acciones en lote.

## Alcance

### Incluye
- Botón **"Mover a la papelera"** por cada OVA en `/mis-ovas`, con selección múltiple por checkboxes y barra de acciones en lote.
- Página dedicada `/papelera` accesible desde el menú lateral, con listado paginado de OVAs en la papelera.
- En `/papelera`, cada OVA tiene: botón **"Restaurar"** (regresa al historial activo) y botón **"Borrar definitivamente"**.
- Modal de confirmación antes del borrado definitivo (individual o en lote).
- Al borrar definitivamente: eliminación del registro en BD + archivo SCORM del servidor + versiones y fases asociadas (cascade).
- Selección múltiple por checkboxes en `/papelera` para: restaurar varios, borrar definitivamente varios.
- Badge/contador en el acceso a papelera del menú lateral indicando la cantidad de OVAs en ella.
- Estado vacío en `/papelera` cuando no hay OVAs eliminados.
- Un administrador puede mover a papelera o borrar definitivamente OVAs de cualquier usuario.

### No incluye
- Vaciado automático de la papelera por tiempo (sin TTL en esta HU).
- Restauración desde el toast/snackbar inmediato (no hay undo-toast; el flujo de recuperación es siempre desde `/papelera`).
- Eliminación de archivos temporales de uploads originales del OVA.
- Filtros o búsqueda dentro de la papelera (se listan todos, paginados).

## Reglas de negocio
1. "Mover a la papelera" realiza un **soft delete** (`deleted_at = NOW()`). El OVA deja de aparecer en `/mis-ovas` pero existe en BD.
2. "Borrar definitivamente" realiza un **hard delete**: elimina el registro de `ovas`, sus `ova_versions` y `ova_phases` en cascada, y borra el archivo SCORM del sistema de archivos si existe.
3. Si el archivo SCORM no existe físicamente en el servidor al borrar definitivamente, la operación de BD procede igualmente sin error.
4. Un OVA en estado `generando` **no puede moverse a la papelera** — el botón está deshabilitado con tooltip "No se puede eliminar mientras se está generando".
5. Solo el propietario del OVA puede moverlo a la papelera o restaurarlo. Un administrador puede realizar ambas acciones sobre OVAs de cualquier usuario.
6. La barra de acciones en lote aparece únicamente cuando hay al menos un OVA seleccionado.
7. El checkbox "seleccionar todos" en la cabecera selecciona/deselecciona todos los OVAs visibles en la página actual.
8. La paginación en `/papelera` es idéntica a la de `/mis-ovas`: 10 por página, orden descendente por `deleted_at`.

## Modelo de datos — cambios requeridos

No se requieren columnas nuevas. La columna `deleted_at` (TIMESTAMPTZ, NULLABLE) ya existe en `ovas` desde HU-006 y actúa como marcador de papelera.

El **borrado definitivo** (`DELETE FROM ovas WHERE id = ?`) borra en cascada gracias a los `ON DELETE CASCADE` definidos en las migraciones de HU-011 para `ova_versions` y `ova_phases`.

## Contrato de API

### Cambio semántico en endpoint existente

El endpoint `DELETE /api/ovas/{ova_id}` ya implementa soft delete (HU-006). Su comportamiento **no cambia** — únicamente su semántica se re-etiqueta como "mover a papelera" en la UI.

---

### `GET /api/ovas/papelera`
Lista los OVAs en la papelera del usuario autenticado (o de todos si es admin).

**Query params:**

| Parámetro | Tipo | Default | Descripción                      |
|-----------|------|---------|----------------------------------|
| `page`    | int  | 1       | Página actual                    |
| `limit`   | int  | 10      | Ítems por página (máx. 100)      |

**Response 200:**
```json
{
  "ovas": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string | null",
      "status": "listo",
      "deleted_at": "ISO8601",
      "owner": { "id": "uuid", "full_name": "string" }
    }
  ],
  "total_items": 5,
  "total_pages": 1,
  "page": 1,
  "limit": 10
}
```

> `owner` solo se incluye cuando el solicitante es administrador.

---

### `PATCH /api/ovas/{ova_id}/restaurar`
Restaura un OVA de la papelera al historial activo (soft delete reversal).

**Response 200:**
```json
{ "message": "OVA restaurado correctamente.", "id": "uuid" }
```

**Errores:**

| Código | Condición                                               |
|--------|---------------------------------------------------------|
| 403    | El usuario no es propietario ni administrador           |
| 404    | OVA no existe o no está en la papelera                 |

---

### `DELETE /api/ovas/{ova_id}/permanente`
Borra definitivamente el OVA: elimina el registro de BD (cascade a versiones/fases) y el archivo SCORM del servidor.

**Response 200:**
```json
{ "message": "OVA eliminado permanentemente.", "id": "uuid" }
```

**Errores:**

| Código | Condición                                               |
|--------|---------------------------------------------------------|
| 403    | El usuario no es propietario ni administrador           |
| 404    | OVA no existe o no está en la papelera                 |
| 409    | OVA tiene `status = 'generando'`                        |

---

### `POST /api/ovas/lote/papelera`
Mueve múltiples OVAs a la papelera en una sola operación.

**Request body:**
```json
{ "ova_ids": ["uuid", "uuid"] }
```

**Response 200:**
```json
{
  "moved": ["uuid", "uuid"],
  "skipped": ["uuid"],
  "message": "2 OVAs movidos a la papelera. 1 omitido (en generación)."
}
```

> `skipped` contiene IDs de OVAs en estado `generando` u OVAs sin permiso.

---

### `POST /api/ovas/lote/restaurar`
Restaura múltiples OVAs de la papelera.

**Request body:**
```json
{ "ova_ids": ["uuid", "uuid"] }
```

**Response 200:**
```json
{
  "restored": ["uuid", "uuid"],
  "skipped": [],
  "message": "2 OVAs restaurados correctamente."
}
```

---

### `DELETE /api/ovas/lote/permanente`
Borra definitivamente múltiples OVAs de la papelera (BD + archivos SCORM).

**Request body:**
```json
{ "ova_ids": ["uuid", "uuid"] }
```

**Response 200:**
```json
{
  "deleted": ["uuid", "uuid"],
  "skipped": [],
  "message": "2 OVAs eliminados permanentemente."
}
```

---

## Criterios de Aceptación

### CA-01: Botón "Mover a la papelera" en historial
**Dado** que soy el propietario de un OVA con estado distinto a `generando`,
**cuando** veo su card en `/mis-ovas`,
**entonces** veo un botón "Mover a la papelera" habilitado.

### CA-02: Botón deshabilitado durante generación
**Dado** que un OVA tiene `status = 'generando'`,
**cuando** veo su card en `/mis-ovas`,
**entonces** el botón "Mover a la papelera" está deshabilitado y un tooltip indica "No se puede eliminar mientras se está generando".

### CA-03: Mover a papelera individual
**Dado** que hago clic en "Mover a la papelera" de un OVA,
**cuando** confirmo la acción en el modal,
**entonces** el OVA desaparece del listado de `/mis-ovas` y se muestra una notificación de éxito. El OVA ahora aparece en `/papelera`.

### CA-04: Selección múltiple en historial
**Dado** que estoy en `/mis-ovas`,
**cuando** selecciono varios OVAs mediante sus checkboxes,
**entonces** aparece una barra de acciones en lote con el botón "Mover a la papelera (N)" indicando la cantidad seleccionada.

### CA-05: Mover múltiples a papelera
**Dado** que tengo N OVAs seleccionados en `/mis-ovas`,
**cuando** presiono "Mover a la papelera (N)" en la barra de acciones,
**entonces** aparece un modal de confirmación indicando cuántos OVAs se moverán; al confirmar, todos desaparecen del historial activo y se muestra notificación de éxito.

### CA-06: Página de papelera accesible
**Dado** que soy un usuario autenticado,
**cuando** navego a `/papelera` desde el menú lateral,
**entonces** veo el listado paginado de mis OVAs en la papelera, con la fecha en que fueron movidos a ella.

### CA-07: Restaurar OVA individual desde papelera
**Dado** que estoy en `/papelera`,
**cuando** presiono "Restaurar" en un OVA,
**entonces** el OVA desaparece de `/papelera` y vuelve a aparecer en `/mis-ovas` con su estado original. Se muestra una notificación de éxito.

### CA-08: Borrar definitivamente OVA individual
**Dado** que estoy en `/papelera`,
**cuando** presiono "Borrar definitivamente" en un OVA y confirmo en el modal de advertencia,
**entonces** el OVA se elimina permanentemente de la BD, el archivo SCORM se borra del servidor, y el OVA desaparece de `/papelera`. Se muestra una notificación de éxito.

### CA-09: Selección múltiple en papelera
**Dado** que estoy en `/papelera`,
**cuando** selecciono varios OVAs mediante sus checkboxes,
**entonces** aparece una barra de acciones en lote con los botones "Restaurar (N)" y "Borrar definitivamente (N)".

### CA-10: Restaurar múltiples OVAs
**Dado** que tengo N OVAs seleccionados en `/papelera`,
**cuando** presiono "Restaurar (N)",
**entonces** todos los OVAs seleccionados regresan al historial activo y desaparecen de la papelera. Se muestra notificación de éxito.

### CA-11: Borrar definitivamente múltiples OVAs
**Dado** que tengo N OVAs seleccionados en `/papelera`,
**cuando** presiono "Borrar definitivamente (N)" y confirmo en el modal de advertencia,
**entonces** todos los OVAs seleccionados se eliminan permanentemente de la BD y sus archivos SCORM del servidor. Se muestra notificación de éxito.

### CA-12: Archivo SCORM no encontrado no bloquea borrado
**Dado** que un OVA en la papelera no tiene archivo SCORM en el servidor,
**cuando** se ejecuta el borrado definitivo,
**entonces** la operación completa el borrado del registro en BD sin mostrar error al usuario.

### CA-13: Estado vacío de la papelera
**Dado** que no tengo OVAs en la papelera,
**cuando** navego a `/papelera`,
**entonces** veo un mensaje ilustrado "Tu papelera está vacía" sin listado.

### CA-14: Badge de conteo en menú lateral
**Dado** que tengo OVAs en la papelera,
**cuando** veo el menú lateral de la aplicación,
**entonces** el enlace a "Papelera" muestra un badge numérico con la cantidad de OVAs en ella.

### CA-15: Checkbox "seleccionar todos" en página actual
**Dado** que estoy en `/mis-ovas` o `/papelera` con múltiples OVAs,
**cuando** hago clic en el checkbox de la cabecera de la lista,
**entonces** se seleccionan o deseleccionan todos los OVAs visibles en la página actual.

---

## Escenarios BDD (Gherkin)

```gherkin
Feature: HU-012 — Eliminar OVA del Historial con Papelera

  Background:
    Given el usuario "ana@upao.edu" está autenticado con rol "usuario"
    And existen los siguientes OVAs activos para "ana@upao.edu":
      | id   | title                | status    |
      | ov-1 | Redes Neuronales     | listo     |
      | ov-2 | Regresión Lineal     | borrador  |
      | ov-3 | SVM Clasificación    | generando |

  Scenario: CA-01 — Botón visible y habilitado en historial
    When "ana@upao.edu" navega a "/mis-ovas"
    Then ve el botón "Mover a la papelera" habilitado en los OVAs "ov-1" y "ov-2"

  Scenario: CA-02 — Botón deshabilitado durante generación
    When "ana@upao.edu" navega a "/mis-ovas"
    Then el botón "Mover a la papelera" del OVA "ov-3" está deshabilitado
    And al pasar el cursor muestra "No se puede eliminar mientras se está generando"

  Scenario: CA-03 — Mover a papelera individual
    When "ana@upao.edu" hace clic en "Mover a la papelera" del OVA "ov-1"
    Then aparece un modal con el texto "¿Mover 'Redes Neuronales' a la papelera?"
    When confirma la acción
    Then el OVA "ov-1" desaparece de "/mis-ovas"
    And aparece una notificación "OVA movido a la papelera"
    And el OVA "ov-1" aparece en "/papelera"

  Scenario: CA-04 y CA-05 — Selección múltiple y mover en lote
    When "ana@upao.edu" navega a "/mis-ovas"
    And selecciona los checkboxes de "ov-1" y "ov-2"
    Then aparece la barra de acciones con el botón "Mover a la papelera (2)"
    When presiona "Mover a la papelera (2)"
    Then aparece un modal con el texto "¿Mover 2 OVAs a la papelera?"
    When confirma
    Then "ov-1" y "ov-2" desaparecen de "/mis-ovas"
    And aparece la notificación "2 OVAs movidos a la papelera"

  Scenario: CA-06 — Página de papelera lista OVAs eliminados
    Given el OVA "ov-1" fue movido a la papelera
    When "ana@upao.edu" navega a "/papelera"
    Then ve el OVA "Redes Neuronales" con su fecha de eliminación
    And cada card tiene los botones "Restaurar" y "Borrar definitivamente"

  Scenario: CA-07 — Restaurar OVA individual
    Given el OVA "ov-1" está en la papelera
    And "ana@upao.edu" está en "/papelera"
    When presiona "Restaurar" del OVA "ov-1"
    Then "ov-1" desaparece de "/papelera"
    And aparece en "/mis-ovas" con su estado original
    And muestra la notificación "OVA restaurado correctamente"

  Scenario: CA-08 — Borrar definitivamente OVA individual
    Given el OVA "ov-1" está en la papelera con archivo SCORM en el servidor
    And "ana@upao.edu" está en "/papelera"
    When presiona "Borrar definitivamente" del OVA "ov-1"
    Then aparece un modal con el texto "¿Eliminar permanentemente 'Redes Neuronales'? Esta acción no se puede deshacer."
    When confirma
    Then "ov-1" desaparece de "/papelera"
    And el registro es eliminado de la base de datos
    And el archivo SCORM es eliminado del servidor
    And muestra la notificación "OVA eliminado permanentemente"

  Scenario: CA-09, CA-10 — Restaurar múltiples OVAs desde papelera
    Given los OVAs "ov-1" y "ov-2" están en la papelera
    And "ana@upao.edu" está en "/papelera"
    When selecciona los checkboxes de "ov-1" y "ov-2"
    Then aparece la barra de acciones con "Restaurar (2)" y "Borrar definitivamente (2)"
    When presiona "Restaurar (2)"
    Then "ov-1" y "ov-2" desaparecen de "/papelera"
    And aparecen en "/mis-ovas"
    And muestra la notificación "2 OVAs restaurados correctamente"

  Scenario: CA-11 — Borrar definitivamente múltiples OVAs
    Given los OVAs "ov-1" y "ov-2" están en la papelera
    And "ana@upao.edu" está en "/papelera"
    When selecciona "ov-1" y "ov-2" y presiona "Borrar definitivamente (2)"
    Then aparece un modal "¿Eliminar permanentemente 2 OVAs? Esta acción no se puede deshacer."
    When confirma
    Then "ov-1" y "ov-2" son eliminados de la BD y sus archivos SCORM del servidor
    And muestra la notificación "2 OVAs eliminados permanentemente"

  Scenario: CA-12 — Borrado sin archivo SCORM no genera error
    Given el OVA "ov-2" está en la papelera sin archivo SCORM (status "borrador")
    And "ana@upao.edu" está en "/papelera"
    When presiona "Borrar definitivamente" y confirma
    Then "ov-2" es eliminado de la BD sin error al usuario
    And muestra la notificación "OVA eliminado permanentemente"

  Scenario: CA-13 — Estado vacío de papelera
    Given "ana@upao.edu" no tiene OVAs en la papelera
    When navega a "/papelera"
    Then ve el mensaje "Tu papelera está vacía"
    And no se muestra listado de OVAs

  Scenario: CA-14 — Badge de conteo en menú
    Given "ana@upao.edu" tiene 3 OVAs en la papelera
    When ve el menú lateral
    Then el enlace "Papelera" muestra el badge "3"

  Scenario: CA-15 — Checkbox "seleccionar todos"
    Given "ana@upao.edu" está en "/papelera" con 4 OVAs visibles
    When hace clic en el checkbox de la cabecera
    Then los 4 OVAs quedan seleccionados
    When hace clic de nuevo en el checkbox de la cabecera
    Then todos los OVAs quedan deseleccionados
```

---

## Mockups ASCII

### `/mis-ovas` con checkboxes y barra de acciones en lote

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Mis OVAs                                                               │
│  ─────────────────────────────────────────────────────────────────────  │
│  [🔍 Buscar...]          [Estado ▾]                                     │
│                                                                         │
│  ☑ Seleccionar todos en esta página          ← checkbox de cabecera    │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ ☑  Redes Neuronales                              [LISTO ✓]      │   │
│  │     Aprendizaje profundo aplicado a...  · 15 may 2026           │   │
│  │     [Editar] [Descargar] [Mover a la papelera]                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ ☑  Regresión Lineal                           [BORRADOR]        │   │
│  │     Modelo predictivo básico...  · 12 may 2026                  │   │
│  │     [Editar] [Descargar·] [Mover a la papelera]                 │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ ☐  SVM Clasificación                        [GENERANDO ···]     │   │
│  │     Máquinas de vectores...  · 18 may 2026                      │   │
│  │     [Editar·] [Descargar·] [Mover a la papelera·]               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────── BARRA DE ACCIONES EN LOTE ────────┐  │
│  │  2 OVAs seleccionados                                             │  │
│  │                    [ Mover a la papelera (2) ]  [ Cancelar ]     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
  Leyenda: [·] = botón deshabilitado
```

---

### Modal — Mover a la papelera (individual)

```
        ┌──────────────────────────────────────────┐
        │       Mover a la papelera                │
        │                                          │
        │  ¿Mover a la papelera                    │
        │  "Redes Neuronales"?                     │
        │                                          │
        │  Podrás restaurarlo desde               │
        │  la sección Papelera.                    │
        │                                          │
        │         [Cancelar]  [Mover]              │
        └──────────────────────────────────────────┘
```

---

### Página `/papelera`

```
┌─────────────────────────────────────────────────────────────────────────┐
│  GenOVA                                                  [Ana López ▾]  │
├──────────────┬──────────────────────────────────────────────────────────┤
│              │                                                           │
│  Dashboard   │  Papelera                                                │
│  Crear OVA   │  ─────────────────────────────────────────────────────  │
│  Mis OVAs    │                                                           │
│▶ Papelera [2]│  ☑ Seleccionar todos en esta página                     │
│  Perfil      │                                                           │
│              │  ┌──────────────────────────────────────────────────┐    │
│              │  │ ☑  Redes Neuronales              [LISTO ✓]       │    │
│              │  │     Eliminado el 18 may 2026                     │    │
│              │  │                  [Restaurar]  [Borrar definitiv.] │    │
│              │  └──────────────────────────────────────────────────┘    │
│              │                                                           │
│              │  ┌──────────────────────────────────────────────────┐    │
│              │  │ ☑  Regresión Lineal           [BORRADOR]         │    │
│              │  │     Eliminado el 17 may 2026                     │    │
│              │  │                  [Restaurar]  [Borrar definitiv.] │    │
│              │  └──────────────────────────────────────────────────┘    │
│              │                                                           │
│              │  ┌────────────── BARRA DE ACCIONES EN LOTE ──────────┐   │
│              │  │  2 OVAs seleccionados                             │   │
│              │  │  [ Restaurar (2) ]  [ Borrar definitivamente (2) ]│   │
│              │  └───────────────────────────────────────────────────┘   │
│              │                                                           │
│              │  ← Página 1 de 1 →                                       │
└──────────────┴──────────────────────────────────────────────────────────┘
```

---

### Modal — Borrar definitivamente (individual)

```
        ┌──────────────────────────────────────────┐
        │      Borrar definitivamente              │
        │                                          │
        │  ¿Eliminar permanentemente               │
        │  "Redes Neuronales"?                     │
        │                                          │
        │  Esta acción eliminará el OVA y su       │
        │  paquete SCORM del servidor.             │
        │  No se puede deshacer.                   │
        │                                          │
        │         [Cancelar]  [Borrar]             │
        └──────────────────────────────────────────┘
```

---

### Modal — Borrar definitivamente (en lote)

```
        ┌──────────────────────────────────────────┐
        │      Borrar definitivamente              │
        │                                          │
        │  ¿Eliminar permanentemente               │
        │  2 OVAs?                                 │
        │                                          │
        │  Esta acción eliminará los OVAs y sus    │
        │  paquetes SCORM del servidor.            │
        │  No se puede deshacer.                   │
        │                                          │
        │         [Cancelar]  [Borrar 2]           │
        └──────────────────────────────────────────┘
```

---

### Estado vacío — Papelera

```
              ┌──────────────────────────────┐
              │                              │
              │           🗑️                 │
              │                              │
              │   Tu papelera está vacía     │
              │                              │
              │   Los OVAs que muevas a la   │
              │   papelera aparecerán aquí.  │
              │                              │
              └──────────────────────────────┘
```

---

## Consideraciones técnicas (no son tareas de implementación)

- El endpoint `GET /api/ovas` (historial activo) ya filtra `WHERE deleted_at IS NULL`. La papelera usa `WHERE deleted_at IS NOT NULL`.
- `DELETE /api/ovas/{ova_id}` (soft delete de HU-006) se reutiliza tal cual para "Mover a la papelera" — solo cambia la etiqueta en la UI.
- El borrado definitivo requiere eliminar el archivo en `ova.file_path` usando `os.remove()` (ignorando `FileNotFoundError`).
- Las rutas de lote deben recibir los IDs en el body (no en la URL) para admitir listas arbitrariamente largas.
- El badge de conteo en el menú lateral requiere un endpoint ligero `GET /api/ovas/papelera/count` → `{ "count": N }` o incluir el conteo en el response del listado.
- Los checkboxes deben resetearse automáticamente tras cada acción en lote exitosa.
- El botón "seleccionar todos" aplica solo a la página actual, no a todas las páginas.
