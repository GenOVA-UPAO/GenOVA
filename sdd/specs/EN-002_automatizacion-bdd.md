# EN-002: Habilitar automatización BDD

> Metadata:

| Campo | Valor |
|---|---|
| ID | EN-002 |
| Tipo | Habilitador |
| Épica/Tema | EP1: Especificación del Sistema |
| Sprint | Sprint 1 |
| Status | spec_ready |
| Prioridad | Alta |
| Estimación | 8 SP |
| Dependencia | EN-001 |
| Responsable | — |
| Fase | SDD - Specify |
| Fecha creación | 2026-06-16 |
| Fecha actualización | — |
| Fecha Fin (info) | — |

## Objetivo

Implementar y ejecutar step definitions que conecten las features Gherkin
(EN-001) a pruebas reales contra el backend y frontend del Sprint 1,
validando respuestas del sistema en CI.

## Contexto

El proyecto ya tiene infraestructura de testing:
- Backend: pytest + pytest-bdd con step definitions en `backend/tests/step_defs/`.
- Frontend: Vitest con tests unitarios en `frontend/src/`.
- CI: `verify.ps1` ejecuta tests localmente.
EN-002 extiende esto conectando los `.feature` del Sprint 1 a step definitions
reales y configurando la ejecución en GitHub Actions.

## Alcance

### Incluye
- Step definitions en `backend/tests/step_defs/` para features de EN-001.
- Cobertura mínima del 80% de los escenarios definidos en EN-001.
- Workflow de GitHub Actions `.github/workflows/bdd.yml` que ejecuta la suite
  BDD completa.
- Reporte de resultados en formato JSON/HTML publicado como artefacto de CI.
- Integración con `verify.ps1` para ejecución local.

### No incluye
- Tests E2E con browser real (Playwright/Cypress) — solo API-level y unit.
- Features de Sprint 2 o 3.
- Bloqueo de merge a main por suite BDD (se configura pero como advisory
  inicialmente).

## Dependencias

- **EN-001**: archivos `.feature` con escenarios Gherkin.

## Reglas de negocio

1. **R1** — Cada step definition mapea exactamente a un step de los `.feature`
   de EN-001.
2. **R2** — Cobertura ≥80% de los escenarios definidos (medida como
   escenarios con step definitions completas / escenarios totales).
3. **R3** — El workflow de CI ejecuta `pytest --bdd` para backend y
   `pnpm test:unit` para frontend.
4. **R4** — Los resultados se publican como artefacto GitHub Actions.
5. **R5** — La suite BDD se ejecuta también con `verify.ps1` localmente.
6. **R6** — Failures en la suite BDD son advisory (no bloquean merge)
   inicialmente; el equipo decide cuándo activar bloqueo.

## Criterios de aceptación

- Step definitions implementadas para ≥80% de los escenarios de EN-001.
  **(R2)**
- `pytest --bdd` ejecuta las features y genera reporte. **(R1, R3)**
- Workflow `.github/workflows/bdd.yml` ejecuta la suite y publica artefactos.
  **(R3, R4)**
- `verify.ps1` incluye ejecución de la suite BDD. **(R5)**
- La suite pasa en local con backend activo. **(R3)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Automatización BDD (EN-002)

  Scenario: Suite BDD ejecuta features del Sprint 1
    Given los archivos .feature de EN-001 existen en tests/features/sprint1/
    And step definitions implementadas para al menos el 80% de escenarios
    When se ejecuta pytest --bdd
    Then todos los escenarios con step definitions pasan
    And se genera reporte de resultados

  Scenario: CI ejecuta suite BDD
    Given un push a la rama develop
    When se activa el workflow bdd.yml
    Then la suite BDD se ejecuta
    And el reporte se publica como artefacto

  Scenario: verify.ps1 incluye BDD
    Given el entorno local configurado
    When se ejecuta verify.ps1
    Then la suite BDD se ejecuta como parte de la verificación
```

## Estructura de archivos

```text
backend/tests/step_defs/
├── test_hu001_registro.py
├── test_hu002_crear_ova.py
├── test_hu008_login.py
├── ...
.github/workflows/
└── bdd.yml
```

## Notas de implementación

- Reutilizar los step definitions que ya existen en `backend/tests/step_defs/`
  como patrón.
- Cada archivo de step defs importa los escenarios con `scenarios()` de
  pytest-bdd.
- Fixtures compartidas en `conftest.py` (client HTTP, DB session, etc.).
- El workflow de CI debe instalar dependencias Python, levantar el backend
  en modo test y ejecutar pytest.
