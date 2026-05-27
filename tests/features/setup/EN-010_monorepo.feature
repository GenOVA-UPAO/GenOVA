# Extraído verbatim de specs/EN-010_configuracion-monorepo-arquitectura-base-react.md § Escenarios BDD (Gherkin)
Feature: Inicialización de monorepo y base React
  Como desarrollador
  Quiero una base técnica estandarizada
  Para desarrollar interfaces en forma modular y sin conflictos de dependencias

  Scenario: Estructura base del repositorio creada
    Given un repositorio GENOVA vacío o en preparación
    When se inicializa la arquitectura base
    Then deben existir las carpetas frontend, backend y docs en la raíz

  Scenario: Workspace de pnpm configurado
    Given la raíz del monorepo GENOVA
    When se crea el archivo pnpm-workspace.yaml
    Then frontend y backend deben estar declarados como paquetes del workspace

  Scenario: Frontend React con Tailwind operativo
    Given el paquete frontend inicializado con React
    When se integra Tailwind en Vite y CSS principal
    Then la app frontend debe poder ejecutarse y compilar con Tailwind disponible

  Scenario: Regla estricta de modularidad por líneas
    Given la configuración ESLint del frontend
    When un archivo supera las 200 líneas de código
    Then ESLint debe reportar error por incumplimiento de max-lines
