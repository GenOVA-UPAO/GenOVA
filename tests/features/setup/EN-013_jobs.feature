# EN-013 — Persistencia del estado de generación (jobs).
# Tests del service/runner a nivel de modelo/DB (SQLite in-memory), con el agente
# LLM mockeado (monkeypatch a regen_agents.regenerate_phase_content). El runner se
# ejecuta en línea (sin hilo) para que el estado quede determinista y consultable.
Feature: Persistencia del estado de generación de OVA (EN-013)

  Scenario: La generación continúa aunque el cliente se desconecte
    Given un usuario autenticado inicia la generación de un OVA con 2 fases
    And el servidor crea un job con sus recursos "pending"
    When el runner ejecuta el job en background mientras el cliente está desconectado
    And el cliente vuelve a consultar el estado del job más tarde
    Then el job refleja las fases completadas durante la desconexión
    And el contenido de cada recurso quedó persistido en la base de datos

  Scenario: Un recurso falla sin abortar el resto
    Given un job de generación con 3 recursos donde el segundo falla siempre
    When el runner ejecuta el job
    Then el recurso que falla queda en estado "error" con un error_id
    And los otros recursos quedan "done"
    And el job termina "done" porque al menos un recurso quedó listo
    And el contenido de los recursos "done" quedó persistido

  Scenario: Reintenta el recurso hasta agotar los intentos
    Given un job con un recurso que falla siempre
    When el runner ejecuta el job
    Then el recurso registra el máximo de intentos
    And queda "error" con un error_id

  Scenario: Reanudar continúa solo las fases pendientes
    Given un job "interrupted" con un recurso "done" y dos "pending"
    When se solicitan los recursos reanudables del job
    Then solo se listan los recursos "pending"
    And el recurso "done" no se incluye

  Scenario: Un job running sin progreso reciente se marca interrupted
    Given un job "running" cuyo progreso quedó obsoleto
    When el dueño consulta el estado del job
    Then el job pasa a "interrupted"

  Scenario: El estado no filtra detalles sensibles
    Given un recurso que falló por un error interno del proveedor LLM
    When se serializa el estado del job para el cliente
    Then la respuesta incluye status y error_id por recurso
    But no incluye el contenido, el mensaje de excepción interno ni credenciales

  Scenario: Solo el dueño puede consultar su job
    Given un job creado por un usuario
    When otro usuario distinto intenta consultarlo
    Then el servicio no devuelve el job
