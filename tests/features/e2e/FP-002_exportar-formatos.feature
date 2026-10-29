# Exportar el OVA en los 7 formatos del menú «Descargar» del editor. Cada descarga
# debe dar un archivo no vacío con la extensión correcta y firma ZIP (todos los
# formatos son contenedores zip). Endpoint: GET /api/ovas/{id}/export?format=.
# Requiere backend con LLM_FAKE=1.
Feature: FP-002 e2e — Exportar el OVA en todos los formatos

  Background:
    Given que estoy autenticado como usuario con rol "usuario"
    And tengo un OVA listo generado vía API con título único
    And abro el workspace del OVA sembrado

  Scenario Outline: Descargar el OVA como <formato>
    When descargo el OVA desde el editor como "<formato>"
    Then el archivo descargado termina en ".<extension>" y no está vacío
    And el archivo descargado es un contenedor zip válido

    Examples:
      | formato              | extension |
      | SCORM 1.2            | zip       |
      | SCORM 2004           | zip       |
      | IMS Content Package  | zip       |
      | Web (HTML)           | zip       |
      | EPUB 3               | epub      |
      | eXeLearning          | elpx      |
      | H5P                  | h5p       |
