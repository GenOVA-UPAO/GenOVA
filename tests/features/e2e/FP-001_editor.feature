# Flujos principales del editor del OVA (workspace). Con LLM_FAKE=1 las ediciones
# y regeneraciones son deterministas (ver backend/prometheus/engine/fake_invoke.py).
# «[lento-e2e]» en una instrucción hace que la edición tarde unos segundos para poder
# cancelarla en curso. Requiere backend con LLM_FAKE=1.
Feature: FP-001 e2e — Editor del OVA

  Background:
    Given que estoy autenticado como usuario con rol "usuario"
    And tengo un OVA listo generado vía API con título único
    And abro el workspace del OVA sembrado

  Scenario: Abrir un OVA generado muestra sus recursos en el editor
    Then el editor muestra el título del OVA sembrado en la versión 1
    And la vista previa lista los recursos "Cómic interactivo" y "Lectura interactiva"
    When abro la pestaña «Editar» del editor
    Then el editor tiene una sección por fase con sus recursos

  Scenario: Aplicar una instrucción a un solo recurso solo cambia ese recurso
    When marco solo el recurso "Cómic interactivo" en «Aplicar a»
    And aplico la instrucción "Añade un resumen al final del recurso"
    Then el OVA pasa a la versión 2
    And solo el recurso "Cómic Interactivo" contiene el cambio pedido
    And el chat indica que se aplicó a "Cómic interactivo"

  Scenario: Regenerar un recurso crea una versión nueva y lo marca como regenerado
    When regenero el recurso "Lectura interactiva" desde la pestaña «Editar»
    Then el OVA pasa a la versión 2
    And solo el recurso "Lectura Interactiva" figura como regenerado

  Scenario: Añadir un recurso a una fase lo genera con las instrucciones dadas
    When añado a la fase "Exploración" un recurso con la instrucción "Un repaso breve con ejemplos"
    Then la fase "Exploración" muestra 2 recursos
    And el recurso añadido se genera y ya no es un marcador pendiente

  Scenario: Cancelar una regeneración en curso conserva el OVA como estaba
    When marco solo el recurso "Cómic interactivo" en «Aplicar a»
    And aplico la instrucción "[lento-e2e] Añade un glosario"
    And cancelo la regeneración en curso
    Then el chat avisa que la regeneración se canceló sin aplicar cambios
    And el OVA sigue en la versión 1 sin el cambio pedido
