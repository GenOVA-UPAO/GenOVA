# Extraído de sdd/specs/HU-004_exportar-ova-como-paquete-scorm.md § Escenarios BDD (Gherkin)
# INC-002: Endpoint corregido. El spec definía POST /api/scorm/export que no existe.
# El endpoint real es GET /api/ovas/{id}/scorm (302 redirect a Supabase Storage o bytes locales).
# El botón de descarga aparece en /mis-ovas (card listo) y en el editor, no en /crear-ova estático.
Feature: Exportación de OVA a SCORM
  Como estudiante UPAO
  Quiero exportar un OVA en SCORM
  Para importarlo en Canvas LMS

  # INC-002: Botón visible en mis-ovas (OVA con status listo), no en /crear-ova estático.
  Scenario: Botón de descarga SCORM visible para OVA en estado listo
    Given el usuario autenticado tiene un OVA con status "listo"
    When navega a "/mis-ovas"
    Then debe ver el botón "Descargar" habilitado en la card de ese OVA

  # INC-002: Endpoint real es GET /api/ovas/{id}/scorm, no POST /api/scorm/export.
  Scenario: Descarga de zip SCORM
    Given el usuario autenticado tiene un OVA con status "listo" e id conocido
    When hace clic en "Descargar" del OVA
    Then el backend responde con un redirect 302 o bytes de zip con content-type application/zip
    And el navegador inicia la descarga del archivo SCORM

  Scenario: Estructura válida mínima del paquete
    Given el archivo SCORM descargado correctamente
    When inspecciono su contenido
    Then debe incluir imsmanifest.xml, index.html y carpeta resources con html/css/js

  Scenario: Registro básico de progreso en LMS
    Given el paquete abierto desde un LMS compatible SCORM 1.2
    When el usuario marca completado desde la interfaz de prueba
    Then el paquete debe enviar lesson_status y commit a la API LMS
