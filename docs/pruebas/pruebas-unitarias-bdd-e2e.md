# Pruebas Unitarias, BDD y End-to-End — GenOVA

> **Fuentes canónicas (separadas):**
>
> - Unitarias + BDD (cucumber-js / pytest-bdd):
>   **[`reporte-pruebas-unitarias-bdd.md`](reporte-pruebas-unitarias-bdd.md)**
> - End-to-End Playwright:
>   **[`reporte-pruebas-e2e.md`](reporte-pruebas-e2e.md)**
>
> Este archivo se conserva como acceso rápido / borrador histórico; no actualizar
> conteos aquí.

Comandos rápidos:

```bash
pnpm test:unit                                          # cucumber-js unit
cd backend && pytest tests/step_defs/ -v --tb=short     # pytest-bdd
pnpm --filter genova-tests test:e2e                     # Playwright E2E
```
