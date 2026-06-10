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

  # HU-022/B1 — el plan crea una fila por recurso elegido (no 1 genérico por fase).
  Scenario: El plan de recursos crea una fila por recurso elegido
    Given el cliente elige varios recursos con su fase y tipo
    When se construye el plan de recursos
    Then hay una fila por cada recurso elegido con su resource_type
    And cada recurso conserva su fase y su orden dentro de la fase

  # HU-022/B2 — al terminar con ≥1 recurso done se materializa el OVA parcial (R1/R2).
  Scenario: Un job con recursos generados materializa un OVA parcial
    Given un job donde un recurso se genera y otro falla siempre
    When el runner ejecuta el job
    Then el job queda ligado a un OVA con sus fases generadas
    And solo los recursos done se vuelven fases del OVA

  # HU-022/B2/R8 — fallo total no crea un OVA vacío.
  Scenario: Un fallo total no materializa ningún OVA
    Given un job donde todos los recursos fallan siempre
    When el runner ejecuta el job
    Then el job termina en error sin OVA asociado

  # HU-022/B3 — el contenido de un recurso done se lee por su propio endpoint.
  Scenario: El contenido de un recurso done se obtiene aparte del estado
    Given un job con un recurso done con contenido
    When el dueño solicita el contenido de ese recurso
    Then recibe el HTML del recurso
    But el estado del job sigue sin exponer el contenido

  # HU-022/B4 — resume acepta un subconjunto de recursos del job.
  Scenario: Reintentar un subconjunto de recursos del job
    Given un job interrupted con varios recursos pending
    When se resuelven los recursos a reanudar para un subconjunto válido
    Then solo se reanudan los recursos solicitados

  # HU-022/B4 — un id ajeno al job se rechaza sin filtrar detalle.
  Scenario: Reintentar con un recurso ajeno al job se rechaza
    Given un job interrupted con varios recursos pending
    When se resuelven los recursos a reanudar incluyendo un id ajeno
    Then la resolución se rechaza como no encontrada

  # HU-022/B4/R6/R7 — un recurso done en el subset de resume es inocuo: no se
  # relanza ni se sobrescribe; solo se regenera el error del subset.
  Scenario: Reintentar un subconjunto con un recurso done no lo regenera
    Given un job interrupted con un recurso done y otro en error
    When el usuario reanuda el subconjunto que incluye el recurso done
    Then solo se regenera el recurso en error
    And el recurso done conserva su contenido original sin relanzarse
