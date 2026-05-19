# HU-011: Editar OVA Generado

## Historia de Usuario
Como estudiante del curso de ML de UPAO, quiero poder editar el contenido de un OVA ya generado (modificar el prompt original o editar el texto de fases individuales), para corregir errores o mejorar el material sin tener que generar un OVA completamente nuevo desde cero.

## Objetivo funcional
Proveer al estudiante una página de edición dedicada para cada OVA donde pueda: modificar el prompt original y regenerar el OVA completo, editar manualmente el texto de fases individuales, o regenerar fases de forma selectiva (individual o múltiple). Cada cambio guardado genera una nueva versión del OVA preservando el historial de versiones anteriores.

## Alcance

### Incluye
- Botón "Editar" en cada card del historial (`/mis-ovas`) y en la vista previa del OVA, visible solo para el creador del OVA.
- Página de edición `/mis-ovas/{ova_id}/editar` con:
  - Panel de prompt editable.
  - Lista de fases con su contenido actual.
  - Editor de texto enriquecido por fase (activado al hacer clic en "Editar fase").
  - Vista previa en tiempo real del texto de la fase mientras se edita.
  - Botón "Regenerar" individual por fase.
  - Opción de selección múltiple de fases con botón "Regenerar seleccionadas".
  - Botón "Regenerar OVA completo" que usa el prompt (modificado o actual).
- Diálogo de confirmación antes de cualquier regeneración (parcial o total).
- Indicador de progreso/carga durante la regeneración (sin navegación a otra página).
- Versionado incremental: cada guardado o regeneración crea una nueva versión (v1, v2, v3…).
- Historial de versiones del OVA consultable desde la página de edición.
- Re-exportación como SCORM del OVA editado (genera nuevo `.zip` con versión en el nombre).
- Botón "Editar" deshabilitado cuando el OVA tiene `status = 'generando'`.

### No incluye
- Edición colaborativa simultánea (multiusuario).
- Rollback automático a versión anterior (el usuario puede consultar versiones previas, pero no restaurarlas directamente en esta HU).
- Modificación de la estructura de fases (añadir, eliminar o reordenar fases).
- Cambio del modelo LLM durante la edición (se usa el mismo modelo del OVA original).
- Edición por parte de otro usuario distinto al creador (incluso administradores solo ven, no editan).
- Límite máximo de versiones almacenadas.

## Reglas de negocio
1. Solo el **creador** del OVA puede acceder a la página de edición. Cualquier otro usuario recibe `403`.
2. Un OVA con `status = 'generando'` no puede ser editado; el botón "Editar" está deshabilitado con tooltip explicativo.
3. Al guardar la edición manual de una fase o al completar una regeneración, se crea una **nueva versión** con número incremental. La versión anterior queda archivada y consultable.
4. Al regenerar el OVA completo con el prompt modificado, el nuevo prompt queda persistido en la nueva versión como `prompt` canónico.
5. Al regenerar fases selectivas, el prompt no cambia; solo se reescribe el contenido de las fases seleccionadas en la nueva versión.
6. El SCORM exportado a partir de un OVA editado usa el contenido de la **última versión activa**. El nombre del archivo incluye el número de versión: `{titulo_ova}_v{version}.zip`.
7. El estado del OVA cambia a `generando` durante cualquier regeneración (parcial o total) y vuelve a `listo` al completarse, o a `error` si falla.
8. La edición manual de texto de una fase (sin regeneración IA) no cambia el estado del OVA; el guardado es sincrónico.

## Modelo de datos — cambios requeridos

### Nueva tabla: `ova_versions`

| Columna          | Tipo        | Restricción                    | Descripción                                            |
|------------------|-------------|--------------------------------|--------------------------------------------------------|
| `id`             | UUID PK     | NOT NULL, default gen_random() | Identificador de versión                               |
| `ova_id`         | UUID FK     | NOT NULL → `ovas.id`           | OVA al que pertenece                                   |
| `version_number` | INT         | NOT NULL                       | Número incremental de versión (1, 2, 3…)               |
| `prompt`         | TEXT        | NOT NULL                       | Prompt utilizado en esta versión                       |
| `is_active`      | BOOLEAN     | NOT NULL, default TRUE         | TRUE solo para la versión actual del OVA               |
| `created_at`     | TIMESTAMP   | NOT NULL, default now()        | Fecha de creación de la versión                        |

> Solo una versión por OVA puede tener `is_active = TRUE` en todo momento.

### Nueva tabla: `ova_phases`

| Columna        | Tipo        | Restricción                         | Descripción                                       |
|----------------|-------------|-------------------------------------|---------------------------------------------------|
| `id`           | UUID PK     | NOT NULL, default gen_random()      | Identificador de fase                             |
| `version_id`   | UUID FK     | NOT NULL → `ova_versions.id`        | Versión del OVA a la que pertenece                |
| `phase_type`   | VARCHAR(30) | NOT NULL                            | Tipo de fase: `motivacion`, `contenido`, `actividad`, `evaluacion`, `cierre` |
| `phase_order`  | INT         | NOT NULL                            | Orden de visualización (1-based)                  |
| `content`      | TEXT        | NOT NULL                            | Contenido textual de la fase (puede ser HTML/Markdown) |
| `regenerated`  | BOOLEAN     | NOT NULL, default FALSE             | TRUE si esta fase fue generada/regenerada por IA  |
| `created_at`   | TIMESTAMP   | NOT NULL, default now()             | Fecha de creación/actualización de la fase        |

### Cambio en tabla: `ovas`

| Columna               | Tipo    | Cambio                          | Descripción                                  |
|-----------------------|---------|---------------------------------|----------------------------------------------|
| `current_version_id`  | UUID FK | Nueva columna, NULLABLE → `ova_versions.id` | Apunta a la versión activa actual |

## Contrato de API

### `GET /api/ovas/{ova_id}/editar`
Retorna los datos de edición del OVA: prompt actual, fases de la versión activa e historial de versiones.

**Response 200:**
```json
{
  "ova_id": "uuid",
  "title": "string",
  "status": "listo",
  "current_version": {
    "id": "uuid",
    "version_number": 2,
    "prompt": "string",
    "created_at": "ISO8601",
    "phases": [
      {
        "id": "uuid",
        "phase_type": "motivacion",
        "phase_order": 1,
        "content": "string",
        "regenerated": true
      }
    ]
  },
  "version_history": [
    { "id": "uuid", "version_number": 1, "created_at": "ISO8601" },
    { "id": "uuid", "version_number": 2, "created_at": "ISO8601" }
  ]
}
```

**Errores:**

| Código | Condición                                              |
|--------|--------------------------------------------------------|
| 403    | El usuario no es el creador del OVA                   |
| 404    | OVA no existe o fue eliminado                          |
| 409    | OVA tiene `status = 'generando'`                       |

---

### `PATCH /api/ovas/{ova_id}/fases/{fase_id}`
Guarda el texto editado manualmente de una fase. Crea una nueva versión del OVA.

**Request body:**
```json
{ "content": "string" }
```

**Response 200:**
```json
{
  "new_version_number": 3,
  "version_id": "uuid",
  "fase_id": "uuid",
  "message": "Fase guardada. Nueva versión v3 creada."
}
```

**Errores:**

| Código | Condición                                          |
|--------|----------------------------------------------------|
| 400    | `content` vacío o ausente                          |
| 403    | El usuario no es el creador del OVA               |
| 404    | OVA o fase no encontrada                           |
| 409    | OVA tiene `status = 'generando'`                   |

---

### `POST /api/ovas/{ova_id}/regenerar`
Dispara la regeneración del OVA. Acepta regeneración completa (con prompt actualizado) o selectiva (por fases).

**Request body:**
```json
{
  "prompt": "string | null",
  "fase_ids": ["uuid", "uuid"] 
}
```

> - Si `prompt` se provee → se usa como nuevo prompt (persiste en la nueva versión).
> - Si `fase_ids` está vacío o ausente → se regeneran **todas** las fases.
> - Si `fase_ids` tiene valores → se regeneran **solo** esas fases.

**Response 202:**
```json
{
  "job_id": "uuid",
  "message": "Regeneración iniciada.",
  "ova_status": "generando"
}
```

**Errores:**

| Código | Condición                                              |
|--------|--------------------------------------------------------|
| 400    | `fase_ids` contiene IDs que no pertenecen al OVA      |
| 403    | El usuario no es el creador                           |
| 404    | OVA no existe                                          |
| 409    | OVA ya está en estado `generando`                      |

---

### `GET /api/ovas/{ova_id}/versiones`
Lista el historial de versiones del OVA.

**Response 200:**
```json
{
  "ova_id": "uuid",
  "versions": [
    {
      "id": "uuid",
      "version_number": 1,
      "prompt": "string",
      "is_active": false,
      "created_at": "ISO8601"
    },
    {
      "id": "uuid",
      "version_number": 2,
      "prompt": "string",
      "is_active": true,
      "created_at": "ISO8601"
    }
  ]
}
```

---

### `GET /api/ovas/{ova_id}/export-scorm`
Genera y retorna la URL de descarga del paquete SCORM de la versión activa.

**Response 200:**
```json
{
  "download_url": "https://...",
  "filename": "Redes_Neuronales_v2.zip",
  "version_number": 2
}
```

**Errores:**

| Código | Condición                                              |
|--------|--------------------------------------------------------|
| 403    | Sin permisos                                           |
| 404    | OVA no existe                                          |
| 409    | OVA no está en estado `listo`                          |

---

## Criterios de Aceptación

### CA-01: Botón "Editar" accesible en historial y vista previa
**Dado** que soy el creador de un OVA con estado `listo` o `borrador` o `error`,
**cuando** veo la card del OVA en `/mis-ovas` o su vista previa,
**entonces** veo un botón "Editar" habilitado que me lleva a `/mis-ovas/{ova_id}/editar`.

### CA-02: Botón "Editar" deshabilitado durante generación
**Dado** que un OVA tiene `status = 'generando'`,
**cuando** veo su card,
**entonces** el botón "Editar" está deshabilitado y un tooltip indica "No disponible mientras se genera el OVA".

### CA-03: Solo el creador puede editar
**Dado** que soy un usuario distinto al creador del OVA (incluso administrador),
**cuando** intento acceder a `/mis-ovas/{ova_id}/editar`,
**entonces** recibo un error `403` y soy redirigido con un mensaje "No tienes permiso para editar este OVA".

### CA-04: Editar prompt y regenerar OVA completo
**Dado** que estoy en la página de edición del OVA,
**cuando** modifico el texto del prompt y presiono "Regenerar OVA completo",
**entonces** aparece un diálogo de confirmación; al confirmar, el OVA cambia a estado `generando`, se muestra un indicador de progreso en la página y al finalizar se crea la nueva versión con el prompt actualizado y todas las fases regeneradas.

### CA-05: Editar texto de una fase individual (sin IA)
**Dado** que estoy en la página de edición,
**cuando** presiono "Editar" en una fase, modifico el texto en el editor enriquecido y presiono "Guardar fase",
**entonces** el cambio se guarda de forma sincrónica, se crea una nueva versión del OVA, y el número de versión visible se incrementa sin necesidad de recargar la página.

### CA-06: Vista previa en tiempo real al editar fase
**Dado** que estoy editando el texto de una fase en el editor enriquecido,
**cuando** escribo o modifico el contenido,
**entonces** un panel de vista previa adyacente refleja los cambios en tiempo real.

### CA-07: Regenerar fase individual con IA
**Dado** que estoy en la página de edición,
**cuando** presiono el botón "Regenerar" de una fase específica,
**entonces** aparece un diálogo de confirmación; al confirmar, solo esa fase se regenera con IA (las demás permanecen intactas), se muestra progreso en la fase afectada, y al terminar se crea una nueva versión con el contenido regenerado de esa fase.

### CA-08: Regenerar múltiples fases con selección
**Dado** que estoy en la página de edición y he marcado más de una fase mediante checkboxes,
**cuando** presiono "Regenerar seleccionadas",
**entonces** aparece un diálogo de confirmación listando las fases seleccionadas; al confirmar, solo esas fases son regeneradas por IA y se crea una nueva versión.

### CA-09: Nueva versión incremental por cada cambio
**Dado** que el OVA está en la versión N,
**cuando** guardo una edición manual o completo una regeneración (parcial o total),
**entonces** el OVA pasa a la versión N+1 y la versión N queda archivada y visible en el historial de versiones.

### CA-10: Historial de versiones consultable
**Dado** que estoy en la página de edición,
**cuando** despliego el historial de versiones,
**entonces** veo la lista de todas las versiones con su número, fecha de creación y prompt usado, ordenadas de la más reciente a la más antigua.

### CA-11: Exportar SCORM con contenido actualizado
**Dado** que el OVA editado está en estado `listo`,
**cuando** presiono "Exportar SCORM",
**entonces** se genera y descarga un archivo `.zip` con el nombre `{titulo_ova}_v{version}.zip` que contiene el contenido de la última versión activa.

---

## Escenarios BDD (Gherkin)

```gherkin
Feature: HU-011 — Editar OVA Generado

  Background:
    Given el usuario "ana@upao.edu" está autenticado con rol "usuario"
    And existe el OVA "Redes Neuronales" con id "ova-1" creado por "ana@upao.edu"
    And el OVA "ova-1" tiene status "listo" y está en versión v1
    And el OVA "ova-1" tiene las fases: "motivacion", "contenido", "actividad", "evaluacion", "cierre"

  Scenario: CA-01 — Botón Editar visible para el creador
    When "ana@upao.edu" navega a "/mis-ovas"
    Then ve el botón "Editar" habilitado en la card "Redes Neuronales"
    When hace clic en "Editar"
    Then es redirigida a "/mis-ovas/ova-1/editar"

  Scenario: CA-02 — Botón Editar deshabilitado en estado generando
    Given el OVA "ova-1" tiene status "generando"
    When "ana@upao.edu" navega a "/mis-ovas"
    Then el botón "Editar" del OVA "Redes Neuronales" está deshabilitado
    And al pasar el cursor muestra "No disponible mientras se genera el OVA"

  Scenario: CA-03 — Usuario no creador no puede editar
    Given el usuario "juan@upao.edu" está autenticado con rol "usuario"
    When "juan@upao.edu" accede a "/mis-ovas/ova-1/editar"
    Then recibe un error 403
    And ve el mensaje "No tienes permiso para editar este OVA"

  Scenario: CA-04 — Regenerar OVA completo con prompt modificado
    Given "ana@upao.edu" está en "/mis-ovas/ova-1/editar"
    When modifica el prompt a "Redes neuronales profundas aplicadas a visión artificial"
    And presiona "Regenerar OVA completo"
    Then aparece un diálogo de confirmación con el texto "¿Regenerar todas las fases con el nuevo prompt?"
    When confirma la acción
    Then el OVA cambia a status "generando"
    And se muestra un indicador de progreso en la página
    When la generación finaliza
    Then el OVA cambia a status "listo"
    And el número de versión pasa a v2
    And el prompt guardado en v2 es "Redes neuronales profundas aplicadas a visión artificial"
    And todas las fases tienen contenido nuevo

  Scenario: CA-05 — Editar texto de una fase sin IA
    Given "ana@upao.edu" está en "/mis-ovas/ova-1/editar"
    When presiona "Editar" en la fase "motivacion"
    And modifica el texto en el editor a "Nuevo contenido de motivación"
    And presiona "Guardar fase"
    Then el cambio se guarda sin mostrar indicador de regeneración IA
    And el número de versión pasa a v2
    And la fase "motivacion" en v2 muestra "Nuevo contenido de motivación"
    And las demás fases permanecen sin cambios

  Scenario: CA-06 — Vista previa en tiempo real
    Given "ana@upao.edu" está editando la fase "contenido" en "/mis-ovas/ova-1/editar"
    When escribe "Texto de ejemplo" en el editor
    Then el panel de vista previa muestra "Texto de ejemplo" simultáneamente

  Scenario: CA-07 — Regenerar una sola fase con IA
    Given "ana@upao.edu" está en "/mis-ovas/ova-1/editar"
    When presiona el botón "Regenerar" de la fase "actividad"
    Then aparece un diálogo de confirmación con el texto "¿Regenerar la fase 'Actividad'?"
    When confirma la acción
    Then solo la fase "actividad" muestra indicador de carga
    And las fases "motivacion", "contenido", "evaluacion", "cierre" permanecen visibles y sin cambios
    When la regeneración finaliza
    Then el número de versión pasa a v2
    And solo la fase "actividad" tiene contenido nuevo

  Scenario: CA-08 — Regenerar múltiples fases seleccionadas
    Given "ana@upao.edu" está en "/mis-ovas/ova-1/editar"
    When marca los checkboxes de las fases "contenido" y "evaluacion"
    And presiona "Regenerar seleccionadas"
    Then aparece un diálogo de confirmación listando "Contenido, Evaluación"
    When confirma la acción
    Then solo las fases "contenido" y "evaluacion" son regeneradas por IA
    And el número de versión pasa a v2

  Scenario: CA-09 — Versionado incremental
    Given el OVA "ova-1" está en v1
    When "ana@upao.edu" guarda la edición de la fase "cierre"
    Then el OVA pasa a v2
    When vuelve a editar la fase "motivacion"
    Then el OVA pasa a v3
    And el historial muestra las versiones v1, v2 y v3

  Scenario: CA-10 — Historial de versiones visible
    Given el OVA "ova-1" tiene las versiones v1 y v2 archivadas
    And "ana@upao.edu" está en "/mis-ovas/ova-1/editar"
    When despliega el panel "Historial de versiones"
    Then ve una lista con v1 y v2
    And cada entrada muestra número de versión, fecha y prompt usado

  Scenario: CA-11 — Exportar SCORM con contenido actualizado
    Given el OVA "ova-1" está en v2 con status "listo"
    And "ana@upao.edu" está en "/mis-ovas/ova-1/editar"
    When presiona "Exportar SCORM"
    Then el navegador descarga el archivo "Redes_Neuronales_v2.zip"
    And el archivo contiene el contenido de la versión v2
```

---

## Mockups ASCII

### Página de edición — `/mis-ovas/{ova_id}/editar`

```
┌──────────────────────────────────────────────────────────────────────────┐
│  GenOVA                                                   [Ana López ▾]  │
├──────────────┬───────────────────────────────────────────────────────────┤
│              │                                                            │
│  Dashboard   │  Editar OVA: Redes Neuronales          [v2]  [Exportar SCORM] │
│  Crear OVA   │  ─────────────────────────────────────────────────────── │
│  Mis OVAs    │                                                            │
│  Perfil      │  PROMPT ORIGINAL                                           │
│              │  ┌──────────────────────────────────────────────────────┐ │
│              │  │ Redes neuronales aplicadas a clasificación de        │ │
│              │  │ imágenes en datasets de ML estándar (MNIST, CIFAR)   │ │
│              │  └──────────────────────────────────────────────────────┘ │
│              │                                                            │
│              │  [ Regenerar OVA completo ]                               │
│              │                                                            │
│              │  ─────────────────────────────────────────────────────── │
│              │  FASES DEL OVA                  [ ☐ Seleccionar todas ]  │
│              │                        [ Regenerar seleccionadas (2) ]   │
│              │                                                            │
│              │  ┌─────────────────────────────────────────────────────┐ │
│              │  │ ☑  1. MOTIVACIÓN                      [Regenerar ↺] │ │
│              │  │    En el mundo actual, el aprendizaje profundo...    │ │
│              │  │    [Editar ✏]                                        │ │
│              │  └─────────────────────────────────────────────────────┘ │
│              │                                                            │
│              │  ┌─────────────────────────────────────────────────────┐ │
│              │  │ ☐  2. CONTENIDO                       [Regenerar ↺] │ │
│              │  │    Las redes neuronales artificiales son modelos...  │ │
│              │  │    [Editar ✏]                                        │ │
│              │  └─────────────────────────────────────────────────────┘ │
│              │                                                            │
│              │  ┌─────────────────────────────────────────────────────┐ │
│              │  │ ☑  3. ACTIVIDAD                       [Regenerar ↺] │ │
│              │  │    Implementa una red neuronal con PyTorch para...   │ │
│              │  │    [Editar ✏]                                        │ │
│              │  └─────────────────────────────────────────────────────┘ │
│              │                                                            │
│              │  ┌─────────────────────────────────────────────────────┐ │
│              │  │ ☐  4. EVALUACIÓN                      [Regenerar ↺] │ │
│              │  │    Responde las siguientes preguntas sobre redes...  │ │
│              │  │    [Editar ✏]                                        │ │
│              │  └─────────────────────────────────────────────────────┘ │
│              │                                                            │
│              │  ┌─────────────────────────────────────────────────────┐ │
│              │  │ ☐  5. CIERRE                          [Regenerar ↺] │ │
│              │  │    En esta sesión aprendiste los fundamentos de...   │ │
│              │  │    [Editar ✏]                                        │ │
│              │  └─────────────────────────────────────────────────────┘ │
│              │                                                            │
│              │  ▼ Historial de versiones (2)                            │
└──────────────┴───────────────────────────────────────────────────────────┘
```

---

### Editor de fase individual (panel expandido)

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │ ☑  1. MOTIVACIÓN                                      [Regenerar ↺] │
  │ ────────────────────────────────────────────────────────────────────│
  │  EDITOR                          │  VISTA PREVIA                    │
  │  ┌───────────────────────────┐   │  ┌────────────────────────────┐  │
  │  │ En el mundo actual, el    │   │  │ En el mundo actual, el     │  │
  │  │ aprendizaje profundo ha   │   │  │ aprendizaje profundo ha    │  │
  │  │ transformado múltiples    │   │  │ transformado múltiples     │  │
  │  │ industrias...█            │   │  │ industrias...              │  │
  │  └───────────────────────────┘   │  └────────────────────────────┘  │
  │  [B] [I] [U] [Lista] [Título]    │                                  │
  │                                                                      │
  │                          [Cancelar]  [Guardar fase]                 │
  └──────────────────────────────────────────────────────────────────────┘
```

---

### Diálogo de confirmación — Regenerar OVA completo

```
          ┌──────────────────────────────────────────┐
          │         Regenerar OVA completo            │
          │                                          │
          │  Se regenerarán TODAS las fases usando   │
          │  el nuevo prompt. Esta acción creará     │
          │  la versión v3.                          │
          │                                          │
          │  El contenido actual de todas las fases  │
          │  quedará archivado en v2.                │
          │                                          │
          │            [Cancelar]  [Regenerar]       │
          └──────────────────────────────────────────┘
```

---

### Diálogo de confirmación — Regenerar fases seleccionadas

```
          ┌──────────────────────────────────────────┐
          │       Regenerar fases seleccionadas       │
          │                                          │
          │  Se regenerarán las siguientes fases:    │
          │                                          │
          │    • Motivación                          │
          │    • Actividad                           │
          │                                          │
          │  Esto creará la versión v3. Las demás    │
          │  fases no se modificarán.                │
          │                                          │
          │            [Cancelar]  [Regenerar]       │
          └──────────────────────────────────────────┘
```

---

### Historial de versiones (panel desplegado)

```
  ▲ Historial de versiones (3)
  ┌─────────────────────────────────────────────────────────────────┐
  │  v3  (actual)   18 may 2026, 14:32   Prompt: "Redes neuronal…" │
  │  v2             18 may 2026, 13:10   Prompt: "Redes neuronal…" │
  │  v1             15 may 2026, 09:45   Prompt: "Redes neuronal…" │
  └─────────────────────────────────────────────────────────────────┘
```

---

### Indicador de progreso durante regeneración de fase

```
  ┌─────────────────────────────────────────────────────────────────┐
  │ ⟳  3. ACTIVIDAD                               [Regenerando...] │
  │    [████████░░░░░░░░░░░░░░░░░░░░] 40%                          │
  │    "Generando contenido de actividad..."                        │
  └─────────────────────────────────────────────────────────────────┘
```

---

## Consideraciones técnicas (no son tareas de implementación)

- Se requiere una migración de BD para crear las tablas `ova_versions` y `ova_phases`, y agregar `current_version_id` a `ovas`.
- La transición de `is_active` entre versiones debe realizarse en una transacción atómica (desactivar versión anterior y activar la nueva).
- El endpoint `POST /api/ovas/{ova_id}/regenerar` debe disparar el job de generación asíncronamente y retornar `202 Accepted`.
- El frontend puede suscribirse por WebSocket o polling al estado del job para actualizar el progreso en tiempo real (reutilizar el mecanismo de HU-002).
- El editor de texto enriquecido por fase puede reutilizar una librería ya integrada en el proyecto (p. ej. TipTap o Quill) manteniendo consistencia con el design system Tailwind.
- El archivo SCORM generado debe usar el contenido de `ova_phases` de la versión activa, no del OVA original.
- Los badges de estado durante la regeneración deben ser consistentes con los colores definidos en HU-006.
