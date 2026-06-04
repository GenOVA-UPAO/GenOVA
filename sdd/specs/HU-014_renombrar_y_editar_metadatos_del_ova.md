# HU-014: Renombrar y Editar Metadatos del OVA

## Historia de Usuario
Como estudiante del curso de ML de UPAO, quiero poder cambiar el título y la descripción de un OVA desde el historial, para organizarlos con nombres más descriptivos que me ayuden a identificarlos fácilmente sin necesidad de abrirlos.

## Objetivo funcional
Permitir la edición de metadatos (título y descripción) desde la tarjeta del historial de OVAs mediante modal, con validaciones de negocio y actualización inmediata de la lista sin recargar la página.

## Alcance

### Incluye
- Opción **Editar metadatos** en cada tarjeta de `/mis-ovas`.
- Edición mediante modal con campos `Título` y `Descripción`.
- Validación de `Título` obligatorio.
- Validación de longitud máxima de `Título` de 100 caracteres.
- Guardado mediante botón de confirmación.
- Actualización inmediata en la tarjeta del historial tras guardar.
- Mensajería de éxito y error para feedback al usuario.

### No incluye
- Edición masiva de metadatos.
- Versionado de cambios de metadatos.
- Cambios en contenido de fases o proceso de regeneración.

## Reglas de negocio
1. El campo `title` es obligatorio y no acepta solo espacios en blanco.
2. El `title` no puede superar los 100 caracteres.
3. El campo `description` es opcional y puede quedar vacío.
4. El guardado se realiza únicamente cuando el usuario confirma en el modal.
5. Al guardar exitosamente, la tarjeta refleja cambios de inmediato sin recarga.
6. Si el guardado falla, se muestra error y se mantiene el estado previo en UI.
7. No se permite editar metadatos cuando el OVA está en estado `generando`.

## Contrato de API

### `PATCH /api/ovas/{ova_id}/metadata`
Actualiza título y descripción de un OVA activo.

**Request Body**
```json
{
  "title": "Nuevo título",
  "description": "Descripción opcional"
}
```

**Response 200**
```json
{
  "id": "uuid",
  "title": "Nuevo título",
  "description": "Descripción opcional",
  "message": "Metadatos actualizados correctamente."
}
```

**Errores**

| Código | error            | Condición |
|--------|------------------|-----------|
| 400    | title_required   | Título vacío o solo espacios |
| 400    | title_too_long   | Título mayor a 100 caracteres |
| 403    | forbidden        | Usuario sin permisos sobre el OVA |
| 404    | not_found        | OVA no existe o está en papelera |
| 409    | ova_generating   | OVA en proceso de generación |

## Criterios de Aceptación

### CA-01: Opción de edición desde historial
**Dado** que el usuario está en `/mis-ovas`,
**cuando** visualiza una tarjeta de OVA activa,
**entonces** dispone de una opción para editar título y descripción desde un modal.

### CA-02: Título obligatorio
**Dado** que el usuario abre el modal,
**cuando** intenta guardar con título vacío,
**entonces** el sistema muestra el mensaje "El título es obligatorio" y no guarda.

### CA-03: Límite de 100 caracteres
**Dado** que el usuario ingresa un título,
**cuando** supera 100 caracteres y confirma,
**entonces** el sistema muestra el mensaje "El título no puede superar 100 caracteres" y no guarda.

### CA-04: Guardado exitoso
**Dado** que el usuario ingresa datos válidos,
**cuando** confirma en el modal,
**entonces** los metadatos se persisten y la tarjeta se actualiza sin recargar la página.

### CA-05: Manejo de errores
**Dado** que ocurre un error al persistir,
**cuando** el usuario confirma el guardado,
**entonces** se notifica el error y no se muestran cambios no confirmados.

## Escenarios BDD (Gherkin)

```gherkin
Feature: HU-014 — Renombrar y Editar Metadatos del OVA

  Background:
    Given el usuario "ana@upao.edu" está autenticado
    And existe un OVA activo "Introducción a Regresión" con id "ov-1"

  Scenario: CA-01 — Abrir modal de edición
    When la usuaria hace clic en "Editar metadatos" de la tarjeta "ov-1"
    Then se abre un modal con los campos "Título" y "Descripción"
    And ambos campos aparecen precargados con los datos actuales del OVA

  Scenario: CA-02 — Rechazo por título vacío
    Given la usuaria abrió el modal de "ov-1"
    When borra el título y hace clic en "Guardar"
    Then el sistema muestra "El título es obligatorio"
    And no se envía actualización exitosa

  Scenario: CA-03 — Rechazo por longitud excedida
    Given la usuaria abrió el modal de "ov-1"
    When ingresa un título con 101 caracteres y hace clic en "Guardar"
    Then el sistema muestra "El título no puede superar 100 caracteres"
    And no se persisten cambios

  Scenario: CA-04 — Guardado y actualización inmediata
    Given la usuaria abrió el modal de "ov-1"
    When ingresa título y descripción válidos y confirma
    Then el backend responde éxito
    And la tarjeta "ov-1" muestra el nuevo título y descripción sin recargar

  Scenario: CA-05 — Error de persistencia
    Given la usuaria abrió el modal de "ov-1"
    When confirma guardado y el backend falla
    Then se muestra un mensaje de error
    And la tarjeta mantiene los metadatos anteriores
```

## Mockup ASCII

### Historial con acción de editar

```
┌─────────────────────────────────────────────────────────────┐
│ OVA: Introducción a Regresión                 [Borrador]    │
│ Desc: Caso de uso aplicado a datasets de ventas             │
│ [✏ Editar] [⧉ Duplicar] [⬇ Descargar] [🗑 Papelera]        │
│ [📝 Editar metadatos]                                       │
└─────────────────────────────────────────────────────────────┘
```

### Modal de edición de metadatos

```
┌────────────────────────────────────────────┐
│ Editar metadatos del OVA                   │
│                                            │
│ Título*                                    │
│ [________________________________________] │
│ (máx. 100 caracteres)                      │
│                                            │
│ Descripción                                │
│ [________________________________________] │
│ [________________________________________] │
│                                            │
│                 [Cancelar] [Guardar]       │
└────────────────────────────────────────────┘
```

## Definición de terminado (DoD)
- Existe acción de edición de metadatos desde la tarjeta del historial.
- Se cumple validación de título obligatorio y máximo 100 caracteres.
- Los cambios se guardan con botón de confirmación.
- La UI actualiza título y descripción sin recargar la página.
- Se cubren mensajes de éxito/error en la experiencia de usuario.
