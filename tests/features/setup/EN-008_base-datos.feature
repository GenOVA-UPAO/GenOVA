# Generado desde sdd/specs/EN-008_habilitar-base-datos-gestion-usuarios.md § Criterios de aceptación
# INC-006: El spec no incluye sección "Escenarios BDD (Gherkin)". Escenarios escritos
#          verbatim de los 5 criterios de aceptación y el checklist de verificación.
#          Ver docs/tasks/TA-BDD-incompatibilidades.md.
Feature: Habilitar Base de Datos para Gestión de Usuarios
  Como equipo de desarrollo
  Necesitamos una base de datos PostgreSQL configurada y accesible desde el backend
  Para almacenar credenciales, perfiles, OVAs y roles

  Scenario: PostgreSQL desplegado y accesible desde el backend
    Given la instancia PostgreSQL desplegada en Supabase
    When el backend FastAPI inicia con DATABASE_URL configurado
    Then la conexión al servidor PostgreSQL es exitosa

  Scenario: Tablas mínimas creadas por la migración inicial
    Given la migración 001_init.sql aplicada en la base de datos
    Then existen las tablas users, ovas, sessions, roles, user_roles y password_reset_tokens en el esquema public

  Scenario: Conexión ORM funcional con operación CRUD
    Given el backend FastAPI conectado vía SQLAlchemy
    When se ejecuta una operación CRUD contra la base de datos
    Then la operación retorna resultado exitoso sin errores de conexión

  Scenario: Variables de entorno almacenadas en .env
    Given el archivo backend/.env
    Then contiene la variable DATABASE_URL con el Session Pooler de Supabase
    And la cadena de conexión no está escrita en el código fuente

  Scenario: Endpoint de salud de base de datos responde ok
    Given el backend FastAPI en ejecución
    When se realiza GET a /api/db/health
    Then la respuesta es 200 con estado "ok"
