# EN-012 — Observabilidad de errores de generación en Supabase.
# Tests del service log_generation_error() a nivel de modelo/DB (SQLite in-memory),
# sin backend HTTP: el helper no expone endpoint (consulta vía dashboard Supabase).
Feature: Observabilidad de errores de generación en Supabase (EN-012)

  Scenario: Registrar un error con Error ID
    Given un recurso cuya generación falla tras agotar reintentos
    When el backend registra el error
    Then se crea una fila en "ova_error_logs" con un Error ID único
    And el registro incluye categoría, ova_id, recurso y timestamp
    And el Error ID guardado coincide con el expuesto al usuario

  Scenario: Categoría inválida cae a "other"
    Given un error con una categoría desconocida
    When el backend registra el error
    Then la categoría almacenada es "other"

  Scenario: El registro no filtra secretos
    Given un error cuyo mensaje interno contiene una API key
    When se registra el error
    Then el registro almacenado no contiene la API key ni tokens

  Scenario: Un fallo al registrar no interrumpe la generación
    Given una indisponibilidad temporal al escribir el log de error
    When el backend intenta registrar el error
    Then la generación del resto de recursos continúa
    And el helper devuelve igualmente un Error ID
