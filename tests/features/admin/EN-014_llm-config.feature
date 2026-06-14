# Cubre la API admin de config de modelos LLM (EN-014): GET de la config efectiva,
# PUT con validación contra el catálogo, y acceso solo-admin. Test determinista
# (SQLite + TestClient), no requiere backend vivo.
Feature: Config admin de modelos LLM por tarea + fallback (EN-014)

  Scenario: Admin obtiene la configuración efectiva
    Given que estoy autenticado como administrador
    When solicito la configuración de modelos
    Then la respuesta es 200
    And la config incluye las tareas "texto", "codigo", "orquestador", "razonamiento"
    And cada tarea tiene un modelo primario por defecto

  Scenario: Admin guarda una configuración válida y se refleja
    Given que estoy autenticado como administrador
    When guardo el modelo de codigo como "openrouter/deepseek/deepseek-v4-flash"
    Then la respuesta es 200
    And al consultar la config el modelo de codigo es "openrouter/deepseek/deepseek-v4-flash"

  Scenario: Un modelo invalido se descarta y cae a la semilla
    Given que estoy autenticado como administrador
    When guardo el modelo de codigo como "openrouter/modelo-inexistente-xyz"
    Then la respuesta es 200
    And al consultar la config el modelo de codigo no es "openrouter/modelo-inexistente-xyz"

  Scenario: Un usuario no admin no puede leer la config
    Given que estoy autenticado como usuario normal
    When solicito la configuración de modelos
    Then la respuesta es 403

  Scenario: Un usuario no admin no puede guardar la config
    Given que estoy autenticado como usuario normal
    When intento guardar el modelo de codigo como "openrouter/deepseek/deepseek-v4-flash"
    Then la respuesta es 403
