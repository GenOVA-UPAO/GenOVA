# Extraído verbatim de sdd/specs/HU-010_maquetacion-layout-principal-enrutamiento-modular.md § Escenarios BDD (Gherkin)
# INC-005: El escenario "Modularidad de componentes de layout" es una verificación de lint
#          estático, no testeable via E2E/browser. Marcado con @lint.
#          Ver docs/tasks/TA-BDD-incompatibilidades.md.
Feature: Navegación modular del frontend
  Como estudiante del curso ML
  Quiero navegar con un layout coherente
  Para moverme fácilmente entre pantallas

  Scenario: Acceso a rutas base
    Given la aplicación frontend ejecutándose
    When ingreso a /login
    Then debo visualizar la pantalla de inicio de sesión

  Scenario: Rutas de aplicación con layout compartido
    Given la aplicación frontend ejecutándose
    When ingreso a /dashboard o /crear-ova
    Then debo visualizar Navbar, Sidebar y contenedor principal

  @lint
  Scenario: Modularidad de componentes de layout
    Given el código fuente del layout
    When se revisan los archivos de componentes
    Then cada componente de layout debe mantenerse bajo el límite de líneas definido

  Scenario: Ejecución desde raíz del monorepo
    Given el package.json en la raíz del monorepo
    When ejecuto pnpm dev
    Then la aplicación frontend debe iniciar en entorno local
