# HU-002: Crear nuevo OVA desde prompt

## Historia de Usuario
Como **usuario general del sistema** (rol configurable por administración, con valor por defecto “usuarios generales autenticados”),
quiero ingresar un tema de ML en un prompt y seleccionar el modelo LLM,
para generar automáticamente material educativo (OVA), optimizando costo y calidad según el modelo elegido.

## Objetivo funcional
Permitir la creación de un OVA desde una interfaz principal que reciba:
- Prompt del usuario (tema de ML)
- Modelo/proveedor LLM seleccionado

Con validaciones básicas y seguimiento de progreso de generación.

## Alcance

### Incluye
- Formulario UI con:
  - Campo prompt
  - Selector LLM
  - Botón “Generar”
- Contador visible de caracteres en tiempo real (sin tope funcional definitivo)
- Validaciones de entrada:
  - No vacío
  - Longitud mínima
- Indicador de progreso con:
  - Barra visual
  - Porcentaje exacto (0–100)
  - Mensaje de etapa actual
- Bloqueo de doble envío durante la generación

### No incluye
- Definición final del límite máximo de caracteres del prompt
- Flujo detallado de edición/publicación posterior del OVA

## Dependencias
- **SP-001** para habilitación/validación de opciones LLM (OpenAI, Gemini y otros).
- Servicio de generación con reporte de avance exacto para UI.

## Reglas de negocio
1. El prompt es obligatorio.
2. El prompt debe cumplir una longitud mínima configurable (`MIN_PROMPT_CHARS`).
3. El **máximo de caracteres queda pendiente de definición de negocio** (N/D en esta HU).
4. El contador de caracteres debe actualizarse en tiempo real.
5. El selector LLM muestra únicamente opciones validadas por SP-001.
6. Si no hay LLM habilitados, no se puede iniciar la generación.
7. El botón “Generar” solo se habilita con formulario válido.
8. Durante la ejecución, el botón queda deshabilitado y se muestra progreso exacto con etapa actual.

## Criterios de aceptación
1. La interfaz muestra prompt, selector LLM y botón Generar.
2. El prompt muestra contador visible y en tiempo real.
3. El sistema valida prompt no vacío.
4. El sistema valida longitud mínima configurada.
5. El sistema **no aplica un límite máximo funcional cerrado en esta HU** (queda pendiente).
6. El selector LLM lista únicamente proveedores habilitados por SP-001.
7. Durante la generación se visualiza barra + porcentaje exacto + etapa actual.
8. Durante la generación no se permite doble envío.
9. Si no hay LLM disponibles, la UI lo informa y bloquea el inicio.
10. Al finalizar, el progreso llega a 100% y se informa resultado.

## Escenarios BDD (Gherkin)

```gherkin
Feature: Crear nuevo OVA desde prompt

  Scenario: Generación exitosa con datos válidos
    Given que el usuario está en la pantalla "Crear nuevo OVA"
    And existen modelos LLM habilitados por SP-001
    When ingresa un prompt válido
    And selecciona un modelo LLM
    And presiona "Generar"
    Then el sistema inicia la generación del OVA
    And muestra barra de progreso con porcentaje exacto y etapa actual
    And deshabilita el botón "Generar" durante el proceso
    And al finalizar muestra progreso en 100% y resultado exitoso

  Scenario: Validación de prompt obligatorio
    Given que el usuario está en la pantalla "Crear nuevo OVA"
    When intenta generar sin ingresar prompt
    Then el sistema muestra "El prompt es obligatorio"
    And no inicia la generación

  Scenario: Validación de longitud mínima
    Given que el usuario está en la pantalla "Crear nuevo OVA"
    And la longitud mínima está configurada
    When ingresa un prompt por debajo del mínimo
    Then el sistema muestra el mensaje de longitud mínima requerida
    And no inicia la generación

  Scenario: Sin modelos LLM habilitados
    Given que no existen modelos habilitados por SP-001
    When el usuario abre la pantalla "Crear nuevo OVA"
    Then el selector LLM aparece deshabilitado o vacío con mensaje informativo
    And el botón "Generar" no permite iniciar el proceso
```

## Mockup ASCII (actualizado)

```text
+--------------------------------------------------------------+
|                Crear nuevo OVA desde Prompt                  |
+--------------------------------------------------------------+
| Tema / Prompt de ML                                          |
| +----------------------------------------------------------+ |
| | Ej: Árboles de decisión para clasificación supervisada...| |
| +----------------------------------------------------------+ |
| Caracteres: 128   (máximo: N/D)                             |
| * Mínimo: 10 caracteres                                     |
|                                                              |
| Modelo LLM                                                   |
| [ OpenAI ] (v)                                               |
|   - OpenAI                                                   |
|   - Gemini                                                   |
|   - Otros habilitados por SP-001                             |
|                                                              |
| [ Generar OVA ]                                              |
|                                                              |
| Progreso de generación                                       |
| [██████████░░░░░░░░░░░░░░░░░░░░] 35%                         |
| Etapa actual: "Generando contenido base..."                  |
+--------------------------------------------------------------+
```
