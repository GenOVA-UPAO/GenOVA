# HU-006: Ver historial de OVAs

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | HU-006 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 5 SP |
| Dependencia | EN-008 |
| Responsable | JEFFRY ANDERSON ROMERO URIOL |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-18 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 |

## Historia de Usuario
Como estudiante del curso de ML de UPAO, quiero ver el historial de OVAs creados, para gestionarlos o descargarlos nuevamente. Esto centraliza mi trabajo: facilita reutilizar OVAs anteriores, descargar versiones anteriores y eliminar los obsoletos sin tener que regenerarlos desde cero.

## Objetivo funcional
Proveer al estudiante una página dedicada que liste todos sus OVAs generados, con capacidad de búsqueda, filtro por estado, paginación y acciones de descarga y eliminación por ítem.

## Alcance

### Incluye
- Página `/mis-ovas` accesible desde el menú lateral de la aplicación.
- Listado paginado de OVAs del usuario autenticado (10 por página, orden descendente por `created_at`).
- Card por OVA con: título, descripción truncada, fecha de creación y badge de estado.
- Búsqueda por título (ejecutada en backend con ILIKE).
- Filtro por estado: `borrador`, `generando`, `listo`, `error`.
- Búsqueda y filtro combinables simultáneamente.
- Acción **Descargar** (habilitada solo para estado `listo`).
- Acción **Eliminar** con confirmación modal (soft delete).
- Estado vacío con CTA para crear el primer OVA.
- Vista de administrador: ve OVAs de todos los usuarios (con indicador de propietario).

### No incluye
- Vista previa reproducible del contenido SCORM inline.
- Edición del título o descripción desde el historial.
- Restauración de OVAs eliminados.
- Ordenamiento por columnas distintas a fecha de creación.

## Reglas de negocio
1. Un usuario con rol `usuario` solo ve sus propios OVAs. Un usuario con rol `administrador` ve todos.
2. El botón **Descargar** solo es interactuable cuando `status = 'listo'`; en cualquier otro estado aparece deshabilitado.
3. La eliminación es lógica (`deleted_at` ≠ NULL). Los OVAs eliminados no aparecen en el listado.
4. La paginación usa offset: `offset = (page - 1) * 10`. El backend devuelve `total_items` y `total_pages`.
5. La búsqueda por título ignora mayúsculas/minúsculas y coincide por subcadena (`ILIKE '%term%'`).
6. El campo `status` en la tabla `ovas` acepta exactamente: `borrador`, `generando`, `listo`, `error`.
7. Un OVA en estado `generando` muestra el botón **Eliminar** deshabilitado para evitar corrupción del job activo.

## Modelo de datos — cambios requeridos

La tabla `ovas` debe extenderse con las siguientes columnas:

| Columna       | Tipo           | Restricción                              | Descripción                                  |
|---------------|----------------|------------------------------------------|----------------------------------------------|
| `user_id`     | UUID FK        | NOT NULL → `users.id`                    | Propietario del OVA                          |
| `status`      | VARCHAR(20)    | NOT NULL, default `'borrador'`           | Estado del ciclo de vida                     |
| `file_path`   | TEXT           | NULLABLE                                 | Ruta/URL del paquete SCORM generado          |
| `deleted_at`  | TIMESTAMP      | NULLABLE                                 | Soft delete; NULL = activo                   |

## Contrato de API

### `GET /api/ovas`
Lista OVAs del usuario autenticado (o todos si es admin).

**Query params:**

| Parámetro | Tipo    | Default | Descripción                                     |
|-----------|---------|---------|-------------------------------------------------|
| `page`    | int     | 1       | Página actual                                   |
| `limit`   | int     | 10      | Ítems por página (máx. 100)                     |
| `search`  | string  | —       | Búsqueda por título (ILIKE)                     |
| `status`  | string  | —       | Filtro por estado exacto                        |

**Response 200:**
```json
{
  "ovas": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string | null",
      "status": "listo",
      "file_path": "string | null",
      "created_at": "ISO8601",
      "updated_at": "ISO8601",
      "owner": { "id": "uuid", "full_name": "string" }
    }
  ],
  "total_items": 42,
  "total_pages": 5,
  "page": 1,
  "limit": 10
}
```

> El campo `owner` solo se incluye cuando el solicitante es administrador.

---

### `DELETE /api/ovas/{ova_id}`
Soft delete del OVA. Solo el propietario o un administrador puede eliminarlo.

**Response 200:**
```json
{ "message": "OVA eliminado correctamente.", "id": "uuid" }
```

**Errores:**

| Código | Condición                                          |
|--------|----------------------------------------------------|
| 403    | El usuario no es propietario ni administrador      |
| 404    | OVA no existe o ya fue eliminado                   |
| 409    | El OVA tiene `status = 'generando'`                |

---

### `GET /api/ovas/{ova_id}/download`
Retorna la URL firmada o redirige al archivo del OVA.

**Response 200:**
```json
{ "download_url": "https://..." }
```

**Errores:**

| Código | Condición                              |
|--------|----------------------------------------|
| 403    | Sin permisos                           |
| 404    | OVA no existe o no tiene archivo       |
| 409    | OVA no está en estado `listo`          |

---

## Criterios de Aceptación

### CA-01: Lista visible al ingresar a /mis-ovas
**Dado** que soy un usuario autenticado con OVAs creados,
**cuando** navego a `/mis-ovas`,
**entonces** veo una lista paginada de mis OVAs ordenados del más reciente al más antiguo, mostrando título, descripción truncada, fecha de creación y badge de estado coloreado.

### CA-02: Paginación de 10 ítems
**Dado** que tengo más de 10 OVAs,
**cuando** cargo la página,
**entonces** se muestran exactamente 10 OVAs por página con controles de navegación que indican la página actual y el total de páginas.

### CA-03: Búsqueda por título
**Dado** que estoy en `/mis-ovas`,
**cuando** escribo un término en el campo de búsqueda,
**entonces** la lista se actualiza mostrando solo los OVAs cuyo título contenga ese término (sin importar mayúsculas), la paginación se reinicia a la página 1 y el total de ítems refleja los resultados filtrados.

### CA-04: Filtro por estado
**Dado** que estoy en `/mis-ovas`,
**cuando** selecciono un estado del selector de filtro,
**entonces** la lista muestra únicamente OVAs con ese estado, combinable con cualquier búsqueda activa.

### CA-05: Búsqueda y filtro combinados
**Dado** que tengo búsqueda y filtro activos simultáneamente,
**cuando** ambos parámetros están presentes,
**entonces** la lista muestra solo OVAs que cumplan ambas condiciones a la vez.

### CA-06: Descarga de OVA listo
**Dado** que un OVA tiene estado `listo`,
**cuando** hago clic en "Descargar",
**entonces** el navegador inicia la descarga del paquete SCORM asociado.

### CA-07: Descarga deshabilitada para otros estados
**Dado** que un OVA tiene estado diferente a `listo` (borrador, generando, error),
**cuando** veo su card,
**entonces** el botón "Descargar" aparece visualmente deshabilitado y no es interactuable.

### CA-08: Eliminar OVA con confirmación
**Dado** que quiero eliminar un OVA que no está en estado `generando`,
**cuando** hago clic en "Eliminar",
**entonces** aparece un modal de confirmación con el título del OVA; al confirmar, el OVA desaparece de la lista sin recargar la página y se muestra una notificación de éxito.

### CA-09: Eliminación bloqueada en estado generando
**Dado** que un OVA tiene estado `generando`,
**cuando** veo su card,
**entonces** el botón "Eliminar" aparece deshabilitado y un tooltip indica "No se puede eliminar mientras se está generando".

### CA-10: Estado vacío
**Dado** que el usuario no tiene ningún OVA creado (o el filtro no arroja resultados),
**cuando** cargo `/mis-ovas`,
**entonces** veo un mensaje ilustrado de estado vacío; si no hay OVAs en absoluto, se muestra un botón "Crear mi primer OVA" que redirige al formulario de creación.

### CA-11: Vista de administrador
**Dado** que soy un administrador,
**cuando** accedo a `/mis-ovas`,
**entonces** veo OVAs de todos los usuarios, cada card incluye el nombre del propietario y puedo eliminar cualquier OVA independientemente de la autoría.

---

## Escenarios BDD (Gherkin)

```gherkin
Feature: HU-006 — Ver historial de OVAs

  Background:
    Given el usuario "ana@upao.edu" está autenticado con rol "usuario"
    And existen los siguientes OVAs para "ana@upao.edu":
      | id | title                   | status     |
      | 1  | Redes Neuronales        | listo      |
      | 2  | Regresión Lineal        | borrador   |
      | 3  | Árboles de Decisión     | error      |
      | 4  | SVM Clasificación       | generando  |

  Scenario: CA-01 — Ver lista de OVAs propios
    When navego a "/mis-ovas"
    Then veo exactamente 4 cards de OVAs
    And están ordenados por fecha de creación descendente
    And cada card muestra título, fecha y badge de estado

  Scenario: CA-02 — Paginación con más de 10 OVAs
    Given existen 15 OVAs para "ana@upao.edu"
    When navego a "/mis-ovas"
    Then veo 10 OVAs en la primera página
    And veo el control de paginación con "Página 1 de 2"
    When hago clic en "Siguiente"
    Then veo los 5 OVAs restantes

  Scenario: CA-03 — Búsqueda por título
    When navego a "/mis-ovas"
    And escribo "Redes" en el campo de búsqueda
    Then veo únicamente el OVA "Redes Neuronales"
    And el contador muestra "1 resultado"

  Scenario: CA-04 — Filtro por estado
    When navego a "/mis-ovas"
    And selecciono el filtro "listo"
    Then veo únicamente el OVA "Redes Neuronales"

  Scenario: CA-05 — Búsqueda y filtro combinados sin resultados
    When navego a "/mis-ovas"
    And escribo "Redes" en el campo de búsqueda
    And selecciono el filtro "error"
    Then veo el estado vacío con el mensaje "Sin resultados para tu búsqueda"

  Scenario: CA-06 — Descargar OVA en estado listo
    When navego a "/mis-ovas"
    And hago clic en "Descargar" del OVA "Redes Neuronales"
    Then el navegador inicia la descarga del paquete SCORM

  Scenario: CA-07 — Botón Descargar deshabilitado para estado borrador
    When navego a "/mis-ovas"
    Then el botón "Descargar" del OVA "Regresión Lineal" está deshabilitado

  Scenario: CA-08 — Eliminar OVA con confirmación
    When navego a "/mis-ovas"
    And hago clic en "Eliminar" del OVA "Regresión Lineal"
    Then aparece un modal con el texto "¿Eliminar 'Regresión Lineal'?"
    When confirmo la eliminación
    Then el OVA "Regresión Lineal" desaparece de la lista
    And aparece una notificación "OVA eliminado correctamente"

  Scenario: CA-09 — Eliminar bloqueado en estado generando
    When navego a "/mis-ovas"
    Then el botón "Eliminar" del OVA "SVM Clasificación" está deshabilitado
    And al pasar el cursor muestra "No se puede eliminar mientras se está generando"

  Scenario: CA-10 — Estado vacío sin OVAs
    Given "ana@upao.edu" no tiene OVAs creados
    When navego a "/mis-ovas"
    Then veo el mensaje "Aún no has creado ningún OVA"
    And veo el botón "Crear mi primer OVA"

  Scenario: CA-11 — Vista de administrador ve todos los OVAs
    Given el usuario "admin@upao.edu" está autenticado con rol "administrador"
    When navega a "/mis-ovas"
    Then ve OVAs de todos los usuarios
    And cada card muestra el nombre del propietario
```

---

## Mockups ASCII

### Vista principal — `/mis-ovas`

```
┌─────────────────────────────────────────────────────────────────────┐
│  GenOVA                                              [Ana López ▾]  │
├──────────────┬──────────────────────────────────────────────────────┤
│              │                                                       │
│  Dashboard   │  Mis OVAs                                            │
│  Crear OVA   │                                                       │
│▶ Mis OVAs    │  ┌─────────────────────────┐  ┌───────────────────┐  │
│  Perfil      │  │ 🔍 Buscar por título... │  │ Estado     ▾      │  │
│              │  └─────────────────────────┘  └───────────────────┘  │
│              │                                                       │
│              │  ┌─────────────────────────────────────────────────┐ │
│              │  │ ● Redes Neuronales                   [LISTO  ✓] │ │
│              │  │   Aprendizaje profundo aplicado a...             │ │
│              │  │   15 may 2026                                    │ │
│              │  │                           [Descargar] [Eliminar] │ │
│              │  └─────────────────────────────────────────────────┘ │
│              │                                                       │
│              │  ┌─────────────────────────────────────────────────┐ │
│              │  │ ○ Regresión Lineal               [BORRADOR   ] │ │
│              │  │   Modelo predictivo básico para...               │ │
│              │  │   12 may 2026                                    │ │
│              │  │                          [Descargar·] [Eliminar] │ │
│              │  └─────────────────────────────────────────────────┘ │
│              │                                                       │
│              │  ┌─────────────────────────────────────────────────┐ │
│              │  │ ⚠ Árboles de Decisión              [ERROR   ✗] │ │
│              │  │   Clasificación supervisada con...               │ │
│              │  │   10 may 2026                                    │ │
│              │  │                          [Descargar·] [Eliminar] │ │
│              │  └─────────────────────────────────────────────────┘ │
│              │                                                       │
│              │  ┌─────────────────────────────────────────────────┐ │
│              │  │ ⟳ SVM Clasificación            [GENERANDO ···] │ │
│              │  │   Máquinas de vectores de soporte...             │ │
│              │  │   18 may 2026                                    │ │
│              │  │                          [Descargar·] [Eliminar·]│ │
│              │  └─────────────────────────────────────────────────┘ │
│              │                                                       │
│              │  ←  Página 1 de 3  →          Mostrando 4 de 24    │
└──────────────┴──────────────────────────────────────────────────────┘

  Leyenda: [·] = botón deshabilitado
```

---

### Modal de confirmación — Eliminar OVA

```
          ┌────────────────────────────────────┐
          │         Eliminar OVA               │
          │                                    │
          │  ¿Estás seguro de que deseas        │
          │  eliminar                          │
          │  "Regresión Lineal"?               │
          │                                    │
          │  Esta acción no se puede deshacer. │
          │                                    │
          │          [Cancelar]  [Eliminar]    │
          └────────────────────────────────────┘
```

---

### Estado vacío

```
              ┌──────────────────────────────┐
              │                              │
              │       📂                     │
              │                              │
              │  Aún no has creado           │
              │  ningún OVA                  │
              │                              │
              │  Genera tu primer objeto     │
              │  virtual de aprendizaje      │
              │  con ayuda de la IA.         │
              │                              │
              │    [ Crear mi primer OVA ]   │
              │                              │
              └──────────────────────────────┘
```

---

### Selector de filtro — dropdown desplegado

```
  ┌───────────────────┐
  │ Estado       ▴    │
  ├───────────────────┤
  │ Todos             │  ← opción por defecto
  │ Borrador          │
  │ Generando         │
  │ Listo          ✓  │  ← ítem seleccionado activo
  │ Error             │
  └───────────────────┘
```

---

## Consideraciones técnicas (no son tareas de implementación)

- Se requiere una migración de BD para añadir `user_id`, `status`, `file_path` y `deleted_at` a la tabla `ovas`.
- El endpoint `GET /api/ovas` debe aplicar `WHERE deleted_at IS NULL` por defecto.
- La lógica de autorización reutiliza `get_current_user` y `require_admin` ya existentes.
- El frontend puede reutilizar el patrón de paginación de `AdminUsersPage.jsx` como referencia.
- Los badges de estado deben usar colores semánticamente consistentes con el design system existente (Tailwind CSS).

| Estado     | Color sugerido  |
|------------|-----------------|
| borrador   | Gris neutro     |
| generando  | Amarillo/amber  |
| listo      | Verde           |
| error      | Rojo            |
