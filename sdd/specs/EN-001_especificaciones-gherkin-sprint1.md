# EN-001: Habilitar especificaciones Gherkin Sprint 1

> Metadata:

| Campo | Valor |
|---|---|
| ID | EN-001 |
| Tipo | Habilitador |
| Épica/Tema | EP1: Especificación del Sistema |
| Sprint | Sprint 1 |
| Status | spec_ready |
| Prioridad | Alta |
| Estimación | 8 SP |
| Dependencia | SP-005 |
| Responsable | — |
| Fase | SDD - Specify |
| Fecha creación | 2026-06-16 |
| Fecha actualización | — |
| Fecha Fin (info) | — |

## Objetivo

Redactar en formato BDD (Dado-Cuando-Entonces / Given-When-Then) todas las
features del Sprint 1, alineadas al estándar de SP-005, listas para conectarse
a step definitions en EN-002.

## Contexto

SP-005 (done) investigó Spec-Driven Development y BDD. El proyecto ya tiene
infraestructura BDD: `backend/tests/` con pytest-bdd y archivos `.feature`.
El frontend usa Vitest para unit tests. EN-001 formaliza los escenarios Gherkin
para las HU del Sprint 1 que ya están implementadas (`done`), consolidándolos
en archivos `.feature` organizados por épica.

## Alcance

### Incluye
- Archivos `.feature` en `tests/features/sprint1/` cubriendo las HU del
  Sprint 1: HU-001, HU-002, HU-003, HU-004, HU-006, HU-007, HU-008,
  HU-010 a HU-016, HU-018 a HU-033.
- Mínimo 10 features Gherkin con escenarios positivos, negativos y de borde.
- Tags por épica (`@EP2`, `@EP3`, `@EP4`) y por feature (`@HU-001`, etc.).
- Vocabulario consistente: español, verbos en tercera persona para Then.
- Cada feature incluye Background cuando hay precondiciones comunes.

### No incluye
- Step definitions (→ EN-002).
- Ejecución automatizada en CI (→ EN-002).
- Features de Sprint 2 o 3.

## Dependencias

- **SP-005** (done): estándar de especificación Gherkin.

## Reglas de negocio

1. **R1** — Cada archivo `.feature` corresponde a una HU o grupo de HU
   relacionadas.
2. **R2** — Mínimo 10 features Gherkin con al menos 3 escenarios cada una
   (positivo, negativo, borde).
3. **R3** — Tags normalizados: `@EP<N>`, `@HU-<NNN>`, `@sprint1`.
4. **R4** — Vocabulario en español, excepto keywords Gherkin (`Feature`,
   `Scenario`, `Given`, `When`, `Then`, `And`).
5. **R5** — Las features cubren al menos las HU core: HU-001, HU-002, HU-003,
   HU-004, HU-006, HU-007, HU-008.

## Criterios de aceptación

- Existen ≥10 archivos `.feature` en `tests/features/sprint1/`. **(R2)**
- Cada feature tiene tags `@sprint1` y `@HU-NNN`. **(R3)**
- Las features cubren escenarios positivos, negativos y de borde. **(R2)**
- Vocabulario consistente en español. **(R4)**
- Las HU core del Sprint 1 están cubiertas. **(R5)**
- Los archivos `.feature` son parseable por cucumber/pytest-bdd sin errores
  de sintaxis.

## Estructura de archivos

```text
tests/features/sprint1/
├── HU-001_registro-cuenta.feature
├── HU-002_crear-ova.feature
├── HU-003_visualizar-5e.feature
├── HU-004_exportar-scorm.feature
├── HU-006_historial-ovas.feature
├── HU-007_subir-archivos.feature
├── HU-008_inicio-sesion.feature
├── HU-010_layout-principal.feature
├── HU-011_editar-ova.feature
├── HU-012-014_gestion-ovas.feature
├── HU-015-016_perfil.feature
└── HU-018-021_gestion-roles.feature
```

## Notas de implementación

- Los archivos `.feature` deben vivir en `tests/features/sprint1/` para
  separación clara por sprint.
- Reutilizar patrones de los `.feature` que ya existen en `backend/tests/`.
- Cada escenario debe ser autocontenido (no depender de estado de otro).
- Usar `Scenario Outline` + `Examples` cuando haya variaciones paramétricas.
