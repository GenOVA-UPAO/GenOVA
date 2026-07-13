# impl_HU-002_crear_ova_guia_a11y (follow-up 2026-07-10)

**Feature:** HU-002 (follow-up) — re-lanzar tutorial + recursos obligatorios en guía/UX  
**Fecha:** 2026-07-10  
**Estado:** implementación lista → pendiente reviewer  
**Verify:** `./verify.ps1 -Quick` → **PASA** (lint + ruff + deps + 7 files / 30 unit tests)

## Alcance follow-up (CA 24–27)

| Archivo | Cambio |
|---|---|
| `crear-ova-tour.service.ts` | `restart()` ignora `isDone()`; `buildSteps()` compartido; copy sin “opcional” en recursos |
| `crear-ova-tour.service.spec.ts` | CA-24 restart + CA-26 copy ≥2 fases |
| `ova-create-form-card.component.html` | Guía “2. Elige recursos”; botón `?`; mensaje fases faltantes |
| `ova-create-form-card.component.ts` | input `phasesWithResources`; output `replayTour`; `needsMorePhases` |
| `ova-create-form-card.component.spec.ts` | CA-24/25/27; guía sin “Configura (opcional)” |
| `ova-creation-view.component.ts` | pasa `phasesWithResources`; `(replayTour)="tour.restart()"` |
| `ova-creation-view.component.spec.ts` | stub + mock `restart` |

## Mapa criterios → tests

| CA | Test |
|---|---|
| 24 | form card — “CA-24 help button emits replayTour”; tour service — “CA-24 restart starts driver even when tour is already done” |
| 25 | form card — “CA-11 / CA-25 shows the three-step guide without optional resources” |
| 26 | tour service — “CA-26 tour config step requires resources in at least 2 phases” |
| 27 | form card — “CA-27 shows missing-phases message when prompt is valid but phases < 2” |

## Notas

- `canGenerate` / `phasesWithResources >= 2` **no** se modificó (regla ya existente).
- Archivos y Tema siguen opcionales en copy del tour; solo Recursos es obligatorio.
- HU-002 permanece `in_progress` (reviewer marca `done`).

## Comandos verify

```powershell
./verify.ps1 -Quick
```

Resultado: PASA (7 files / 30 unit tests).
