# Pruebas Unitarias, BDD y End-to-End — GenOVA

GenOVA aplica **Behavior-Driven Development (BDD)** con **Cucumber /
Gherkin**: cada Historia de Usuario (HU), Épica (EN) o Bug (BU) tiene un archivo
`.feature` con escenarios en lenguaje natural (español), cubriendo tanto la
**ruta feliz** como los **caminos de error** (p. ej. login fallido, sesión
expirada, acceso denegado por rol). Los mismos escenarios se ejecutan como
pruebas **unitarias** (sin navegador ni backend) y como pruebas **End-to-End
(E2E)** sobre la interfaz real con **Playwright**.

## 1. Inventario de pruebas

- **60** archivos `.feature`, **247** escenarios en total, bajo
  [`tests/features/`](https://github.com/GenOVA-UPAO/GenOVA/tree/develop/tests/features).
- Frontend unitario adicional: **14** archivos de test, **71** casos
  (componentes Angular, con `@testing-library/angular`).

### 1.1 Distribución por área

| Área | Carpeta | Contenido |
|---|---|---|
| Autenticación | `features/auth/` | Registro, login, perfil, cambio de contraseña, sesión expirada, cambio de rol |
| OVA | `features/ova/` | Crear, visualizar 5E, exportar SCORM, historial, editar, eliminar, duplicar, versionado, workspace, edición granular |
| Roles y usuarios | `features/roles/` | Crear/editar/eliminar rol, gestión de usuarios |
| Administración | `features/admin/` | Configuración de modelos y nodos LLM |
| Layout | `features/layout/` | Navegación y shell de la aplicación |
| Setup / plataforma | `features/setup/` | Base de datos, monorepo, FastAPI/Docker, jobs, logging, editor |
| E2E (browser) | `features/e2e/` | Flujos completos ejecutables en Playwright |

## 2. Pruebas Unitarias y BDD (Cucumber)

Las pruebas unitarias/BDD no requieren navegador. Los step definitions viven en
[`tests/steps/unit`](https://github.com/GenOVA-UPAO/GenOVA/tree/develop/tests/steps/unit)
(frontend) y en
[`backend/tests/step_defs`](https://github.com/GenOVA-UPAO/GenOVA/tree/develop/backend/tests)
(backend, con `pytest-bdd`).

Comandos:

```bash
# Frontend — BDD/unit (sin navegador, sin backend)
pnpm test:unit

# Backend — BDD (pytest-bdd; requiere backend disponible)
pytest tests/step_defs/ -v --tb=short
```

### 2.1 Ejemplo — ruta feliz y camino de error (login, HU-008)

Archivo:
[`tests/features/auth/HU-008_login.feature`](https://github.com/GenOVA-UPAO/GenOVA/blob/develop/tests/features/auth/HU-008_login.feature).

```gherkin
Feature: HU-008 — Inicio de sesión

  Scenario: Login exitoso con credenciales válidas
    Given que estoy en la página de login
    When ingreso un correo registrado y contraseña válida
    And envío el formulario
    Then debo recibir un JWT con expiración de 24 horas
    And debo ser redirigido al dashboard

  Scenario: Login con credenciales inválidas
    Given que estoy en la página de login
    When ingreso credenciales incorrectas
    And envío el formulario
    Then debo ver el mensaje de error "Credenciales inválidas."
```

Otros caminos de error cubiertos por `.feature`:

- **Sesión expirada** — `features/auth/BU-001_sesion-expirada.feature`.
- **Cambio de cuenta/rol y navegación** — `features/auth/BU-002_cuenta-rol-cambia-navegacion.feature`.
- **Validaciones de registro** — `features/auth/HU-001_validaciones-unit.feature` (7 escenarios).
- **Acceso denegado por rol** — panel admin inaccesible para rol "usuario".

## 3. Pruebas End-to-End (Playwright)

Las pruebas E2E ejecutan los escenarios contra la interfaz real (Chromium) con
**playwright-bdd**, que compila los `.feature` de
[`tests/features/e2e/`](https://github.com/GenOVA-UPAO/GenOVA/tree/develop/tests/features/e2e)
a specs de Playwright. Requieren frontend + backend levantados (el backend con
`LLM_FAKE=1` para la generación determinista).

Configuración:
[`tests/playwright.config.js`](https://github.com/GenOVA-UPAO/GenOVA/blob/develop/tests/playwright.config.js).
Step definitions:
[`tests/steps/e2e/`](https://github.com/GenOVA-UPAO/GenOVA/tree/develop/tests/steps/e2e).

Comando:

```bash
pnpm test:e2e     # requiere frontend + backend
```

### 3.1 Flujos E2E cubiertos

| Feature E2E | Flujo |
|---|---|
| `HU-001_registro` | Registro completo desde el formulario (4 escenarios) |
| `HU-002_crear-ova` | Botón deshabilitado sin datos + generación completa hasta el workspace |
| `HU-004_exportar-scorm` | Descarga del `.zip` SCORM desde la card |
| `HU-006_historial` | Aparición del OVA en Mis OVAs |
| `HU-012_eliminar-ova` | Mover a papelera, restaurar, borrar definitivamente |
| `HU-013_duplicar-ova` | Duplicado con sufijo "(copia)" |
| `HU-015_perfil` | Edición de perfil |
| `HU-019/020` | Editar y eliminar rol |
| `HU-021_gestion-usuarios` | Búsqueda y gestión de usuarios |
| `HU-025_workspace` | Visualización de recursos por fase 5E |
| `BU-001_sesion-expirada` | Expiración de sesión y redirección |
| `BU-002_cambio-cuenta` | Cambio de cuenta/rol y navegación |

### 3.2 Ejemplo — generación completa (E2E, HU-002)

Archivo:
[`tests/features/e2e/HU-002_crear-ova.feature`](https://github.com/GenOVA-UPAO/GenOVA/blob/develop/tests/features/e2e/HU-002_crear-ova.feature).

```gherkin
  Scenario: Generación completa desde el formulario hasta el workspace
    Given que estoy autenticado como usuario con rol "usuario"
    When navego a "/crear"
    And escribo un prompt válido sobre "Redes neuronales para principiantes"
    And configuro recursos en al menos dos fases
    And inicio la generación del OVA
    Then la generación redirige al workspace del OVA
    And el workspace muestra el botón de descarga SCORM
```

## 4. Accesibilidad (axe-core) y humo (smoke)

- **Accesibilidad**: suite dedicada
  [`tests/a11y/a11y.spec.js`](https://github.com/GenOVA-UPAO/GenOVA/blob/develop/tests/a11y/a11y.spec.js)
  con `@axe-core/playwright` contra WCAG 2.1 AA (config
  [`tests/playwright.a11y.config.js`](https://github.com/GenOVA-UPAO/GenOVA/blob/develop/tests/playwright.a11y.config.js)).
- **Smoke**: escenarios etiquetados `@smoke` (verificaciones rápidas sin backend
  completo).

## 5. Integración continua (CI)

Cada push/PR a `develop`/`main` dispara en paralelo: `lint` + `backend-bdd`
(pytest-bdd) + `frontend-unit` (Cucumber) → `e2e` (Playwright). Secretos
requeridos: `TEST_DATABASE_URL`, `TEST_JWT_SECRET`.
