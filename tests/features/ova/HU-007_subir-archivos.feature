# Extraído verbatim de specs/HU-007_subir_archivos_base_ova.md § Escenarios BDD (Gherkin)
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
