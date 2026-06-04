# HU-007: Subir archivos base para el OVA

## Historia de Usuario
Como estudiante del curso de ML de UPAO, quiero subir archivos adjuntos en la plataforma, para que la IA utilice mi propio material como contexto y mejore la pertinencia y profundidad del OVA generado.

## Objetivo funcional
Permitir que el estudiante adjunte material académico propio (documentos y audios) durante el flujo de generación del OVA, con validaciones claras y almacenamiento temporal hasta confirmar la generación.

## Alcance

### Incluye
- Carga múltiple de archivos (hasta 5 simultáneos).
- Validación por MIME-type y tamaño por archivo.
- Indicador visual de estado por archivo.
- Manejo de errores por archivo sin bloquear toda la operación.
- Almacenamiento temporal hasta confirmación de generación del OVA.

### No incluye
- Edición del contenido de archivos.
- Persistencia definitiva antes de confirmar la generación.
- Procesamiento semántico del archivo (corresponde al motor de IA posterior).

## Reglas de negocio
1. Formatos permitidos:
   - PDF: `application/pdf`
   - DOCX: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
   - PPTX: `application/vnd.openxmlformats-officedocument.presentationml.presentation`
   - Audio: `audio/mpeg`, `audio/wav`, `audio/x-wav`, `audio/mp4`, `audio/aac`.
2. Tamaño máximo por archivo: 20 MB.
3. Máximo de archivos por carga: 5.
4. Validación obligatoria por MIME-type (no solo por extensión).
5. El sistema debe mostrar estado visual por archivo: en cola, subiendo, exitoso o error.
6. Si un archivo falla, los demás válidos deben continuar.
7. Los archivos se almacenan de forma temporal hasta que el estudiante confirme generar el OVA.
8. Si el usuario cancela el flujo de generación, los archivos temporales deben eliminarse.
9. Debe permitirse quitar o reemplazar archivos antes de confirmar la generación.

## Criterios de aceptación
1. El usuario puede seleccionar y subir simultáneamente entre 1 y 5 archivos.
2. Si selecciona más de 5, el sistema rechaza el exceso y muestra mensaje claro.
3. Cada archivo mayor a 20 MB se rechaza individualmente con mensaje específico.
4. Archivos con MIME no permitido se rechazan individualmente con mensaje específico.
5. Al finalizar la carga, cada archivo válido muestra estado “Carga exitosa”.
6. Si hay mezcla de válidos e inválidos, los válidos se cargan y los inválidos muestran error sin cancelar los demás.
7. El usuario puede remover cualquier archivo cargado antes de confirmar la generación.
8. Los archivos permanecen disponibles en almacenamiento temporal durante la sesión de creación.
9. Al confirmar “Generar OVA”, los archivos temporales se asocian al proceso de generación.
10. Al cancelar o abandonar el flujo (según política de expiración), los temporales se eliminan automáticamente.

## Requisitos no funcionales asociados
- RN-SEG-01: Validación server-side obligatoria de MIME y tamaño.
- RN-UX-01: Feedback visual por archivo en menos de 1 segundo tras terminar su validación.
- RN-PERF-01: Soportar carga concurrente de hasta 5 archivos por usuario sin degradación crítica.
- RN-DAT-01: Limpieza automática de temporales al cancelar o expirar sesión.

## Escenarios BDD (Gherkin)

```gherkin
Feature: Carga de archivos base para OVA

  Scenario: Carga múltiple exitosa dentro de límites
    Given el estudiante está en el flujo de generación del OVA
    When selecciona 3 archivos válidos (PDF, DOCX, MP3) menores o iguales a 20MB
    Then el sistema valida MIME y tamaño por cada archivo
    And muestra estado "Carga exitosa" para cada archivo
    And los archivos quedan en almacenamiento temporal

  Scenario: Rechazo por exceder tamaño máximo por archivo
    Given el estudiante está en el flujo de generación del OVA
    When intenta subir un archivo PDF de 25MB
    Then el sistema rechaza ese archivo
    And muestra el mensaje "El archivo supera el tamaño máximo permitido de 20MB"

  Scenario: Rechazo por tipo MIME no permitido
    Given el estudiante está en el flujo de generación del OVA
    When intenta subir un archivo con MIME no permitido
    Then el sistema rechaza ese archivo
    And muestra el mensaje "Formato de archivo no soportado"

  Scenario: Rechazo por exceder límite de cantidad
    Given el estudiante está en el flujo de generación del OVA
    When intenta cargar 7 archivos simultáneamente
    Then el sistema solo permite hasta 5
    And informa que excedió el número máximo permitido

  Scenario: Carga parcial con errores
    Given el estudiante selecciona 5 archivos
    And 3 archivos son válidos y 2 son inválidos
    When inicia la carga
    Then los 3 archivos válidos se cargan correctamente
    And los 2 inválidos muestran error específico
    And la carga de válidos no se cancela por los inválidos

  Scenario: Confirmación de generación con archivos temporales
    Given el estudiante tiene archivos temporales cargados correctamente
    When confirma "Generar OVA"
    Then el sistema asocia los archivos al proceso de generación
    And conserva los archivos temporales hasta finalizar dicho proceso

  Scenario: Cancelación del flujo
    Given el estudiante tiene archivos temporales cargados
    When cancela o abandona el flujo de generación
    Then el sistema elimina los archivos temporales según política de expiración
```

## Mockup ASCII

```text
+--------------------------------------------------------------+
| Generar OVA - Material Base                                  |
+--------------------------------------------------------------+
| [ Arrastra archivos aquí ]   o   [Seleccionar archivos]      |
| Formatos: PDF, DOCX, PPTX, Audio | Máx: 5 archivos | 20MB c/u|
+--------------------------------------------------------------+
| Archivos seleccionados                                        |
|--------------------------------------------------------------|
| 1) apuntes_semana3.pdf      [Subiendo 72%.......]   [Quitar] |
| 2) clase_intro.pptx         [✓ Carga exitosa]      [Quitar]  |
| 3) resumen.docx             [✗ Tipo no permitido]  [Quitar]  |
| 4) audio_clase_01.mp3       [✓ Carga exitosa]      [Quitar]  |
+--------------------------------------------------------------+
| [Cancelar]                                      [Generar OVA]|
+--------------------------------------------------------------+
```