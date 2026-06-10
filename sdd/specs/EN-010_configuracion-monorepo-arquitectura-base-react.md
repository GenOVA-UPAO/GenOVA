# EN-010: Configuración del Monorepo y Arquitectura Base React

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | EN-010 |
| Tipo | Habilitador |
| Épica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 5 SP |
| Dependencia | TA-001 |
| Responsable | — |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-04-28 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-04-29 |

## Ruta de guardado
`specs/EN-010_configuracion-monorepo-arquitectura-base-react.md`

## Historia de usuario
Como desarrollador, necesito inicializar el monorepo con pnpm y configurar la arquitectura base del frontend en React con Tailwind, asegurando reglas estrictas de linteo para archivos cortos, para tener una base sólida y estandarizada antes de programar las interfaces de usuario.

## Objetivo
Establecer la base técnica del monorepo GENOVA con estructura de carpetas, gestión de dependencias por workspace, frontend React funcional, y estándares de calidad de código orientados a modularidad.

## Alcance
Incluye:
- Estructura base del repositorio: `frontend/`, `backend/`, `docs/`.
- Inicialización de `pnpm-workspace.yaml` en raíz.
- Configuración de proyecto frontend React (Vite) con Tailwind CSS.
- Configuración de ESLint y Prettier.
- Regla estricta de ESLint para máximo 200 líneas por archivo.

No incluye:
- Implementación de funcionalidades de negocio.
- Desarrollo de interfaces finales de producto.
- Pipeline CI/CD.

## Estructura esperada
```text
GENOVA/
├── frontend/
├── backend/
└── docs/
```

## Configuración funcional requerida
1. `pnpm-workspace.yaml` debe declarar al menos `frontend` y `backend` como paquetes del workspace.
2. El frontend debe compilar y ejecutar con scripts estándar (`dev`, `build`).
3. Tailwind debe estar integrado en el frontend y disponible desde el CSS principal.
4. ESLint debe fallar (error) cuando un archivo supere 200 líneas (`max-lines`).
5. Prettier debe estar configurado para formateo consistente del código.

## Criterios de aceptación (detallados)
1. Existe estructura en raíz con carpetas `frontend/`, `backend/`, `docs/`.
2. Existe `pnpm-workspace.yaml` en raíz y el workspace resuelve correctamente dependencias.
3. Existe app React inicializada dentro de `frontend/`.
4. Tailwind CSS está instalado e integrado en el flujo de Vite del frontend.
5. ESLint contiene regla `max-lines` con umbral 200 y severidad `error`.
6. Prettier está instalado y con archivo de configuración en el repositorio.
7. La ejecución de `pnpm lint` en frontend utiliza la configuración estricta definida.

## Escenarios BDD (Gherkin)
```gherkin
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
```

## Mockup ASCII (arquitectura de carpetas)
```text
+ GENOVA/
  + frontend/   (React + Tailwind + ESLint + Prettier)
  + backend/    (base preparada para servicios)
  + docs/       (documentación técnica/funcional)
```

## Definición de terminado (DoD)
- Estructura de carpetas validada.
- Workspace pnpm funcional.
- Frontend React + Tailwind configurado.
- ESLint + Prettier operativos.
- Regla de 200 líneas activa y documentada.
