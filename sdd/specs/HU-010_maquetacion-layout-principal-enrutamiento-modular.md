# HU-010: Maquetación del Layout Principal y Enrutamiento Modular

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | HU-010 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 8 SP |
| Dependencia | EN-010, SP-008 |
| Responsable | — |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-04-30 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-02 |

## Ruta de guardado
`specs/HU-010_maquetacion-layout-principal-enrutamiento-modular.md`

## Historia de usuario
Como estudiante del curso ML, quiero tener una estructura de navegación coherente (Layout) en todas las pantallas, para moverme fácilmente por la plataforma.

## Objetivo
Implementar una base de navegación modular y responsiva en frontend que estandarice la experiencia entre pantallas clave del producto.

## Alcance
Incluye:
- Enrutamiento de rutas base: `/login`, `/dashboard`, `/crear-ova`.
- Layout principal reutilizable con `Navbar`, `Sidebar` y contenedor principal.
- Separación de componentes para modularidad estricta.
- Compatibilidad de ejecución local desde scripts del `package.json` en raíz.

No incluye:
- Lógica de autenticación real.
- Integración con backend para datos reales.
- Guardas avanzados de permisos por rol.

## Criterios de aceptación (detallados)
1. React Router está implementado y resuelve las rutas `/login`, `/dashboard` y `/crear-ova`.
2. Existe layout base responsivo con `Navbar`, `Sidebar` y `MainContainer`.
3. Ningún componente de layout supera 150-200 líneas; la implementación se mantiene modular con subcomponentes.
4. La aplicación puede levantarse localmente usando comandos definidos en el `package.json` de la raíz del monorepo.

## Arquitectura funcional esperada
- `/login`: vista de acceso independiente.
- Layout compartido para `/dashboard` y `/crear-ova`.
- Navegación activa mediante links del menú.
- Componente de fallback para rutas inexistentes.

## Escenarios BDD (Gherkin)
```gherkin
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

  Scenario: Modularidad de componentes de layout
    Given el código fuente del layout
    When se revisan los archivos de componentes
    Then cada componente de layout debe mantenerse bajo el límite de líneas definido

  Scenario: Ejecución desde raíz del monorepo
    Given el package.json en la raíz del monorepo
    When ejecuto pnpm dev
    Then la aplicación frontend debe iniciar en entorno local
```

## Mockup ASCII (Layout base)
```text
+--------------------------------------------------------------------------------+
| Navbar: GENOVA ML                                      [Dashboard] [Crear OVA] |
+-------------------------------+-----------------------------------------------+
| Sidebar                       | Main Container                                |
| - Dashboard                   |  /dashboard o /crear-ova                      |
| - Crear OVA                   |  Contenido de página activa                   |
+-------------------------------+-----------------------------------------------+
```

## Definición de terminado (DoD)
- Router funcional con rutas base requeridas.
- Layout responsivo visible en rutas de aplicación.
- Componentes divididos en módulos pequeños y mantenibles.
- Comandos de ejecución local documentados en `readme.md` principal.
