# Extraído verbatim de specs/EN-011_setup-base-fastapi-orquestacion-local-docker.md § Escenarios BDD (Gherkin)
Feature: Habilitación de backend FastAPI y orquestación Docker
  Como desarrollador
  Quiero un entorno backend+frontend replicable
  Para integrar módulos desde el inicio

  Scenario: Estructura backend inicial
    Given el repositorio GENOVA
    When se inicializa EN-011
    Then debe existir backend con subcarpetas agents, rag y scorm

  Scenario: Orquestación local
    Given docker-compose.yml en la raíz
    When ejecuto docker compose up --build
    Then frontend y backend deben iniciar en contenedores simultáneamente

  Scenario: CORS habilitado para frontend local
    Given el backend FastAPI iniciado
    When el frontend local realiza peticiones HTTP
    Then el backend debe aceptar los orígenes configurados de localhost

  Scenario: Base productiva con gateway
    Given docker-compose.prod.yml y configuración nginx
    When ejecuto docker compose -f docker-compose.prod.yml up --build
    Then el gateway debe enrutar /api al backend y / al frontend
