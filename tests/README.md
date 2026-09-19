# GenOVA — Tests

| Suite | Comando | Qué cubre |
|-------|---------|-----------|
| Unit BDD (cucumber-js) | `pnpm test:unit` | Steps unit puros (validadores, view-models, libs) contra `tests/steps/unit/**`. |
| E2E (playwright-bdd) | `pnpm test:e2e` | `tests/features/e2e/*.feature`, `features/auth/HU-008_login.feature` y `features/roles/HU-018_crear-rol.feature`. |
| A11y (axe-core) | `pnpm test:a11y` | Auditoría WCAG 2.0 A/AA; requiere el mismo backend/frontend que e2e. |
| Carga (JMeter/Locust) | ver `tests/load/` | Pruebas de carga contra un entorno propio. |
| Smoke manual | `tests/playwright-smoke/SMOKE_TESTS.md` | Guion manual con playwright-cli contra develop/producción. |

## Suite E2E

`pnpm test:e2e` genera los specs con `bddgen` y corre Playwright. En local levanta
Vite (`webServer`, reutiliza uno ya activo en `http://localhost:4200`); en CI corre
contra el frontend y backend que el job `e2e` de `.github/workflows/ci.yml` levanta
(Postgres efímero + `uvicorn` en `:8000`, proxy de Vite `/api -> :8000`).

### LLM_FAKE=1 es obligatorio para la suite completa

Los escenarios de generación (HU-002 generación completa, HU-004, HU-006, HU-012,
HU-013 y HU-025) hacen `POST /api/jobs` y esperan un OVA terminado. La suite completa
**requiere un backend con `LLM_FAKE=1`** (`backend/prometheus/engine/graph.py` →
`fake_invoke.py`), que genera HTML determinista en segundos sin proveedores LLM:

- Un recurso por fase seleccionada, con `status: "done"` y HTML
  `<h1>{prompt}</h1><p>Recurso de prueba ({fase} / {recurso}) generado con LLM_FAKE=1.</p>`.
- El job termina `done` en <1s y materializa el OVA con los títulos de recurso de
  `RECURSOS_META` ("Cómic Interactivo", "Lectura Interactiva", …), así que los steps
  verifican esos títulos y el botón "Descargar SCORM", nunca contenido real.
- El job `e2e` de CI ya define `LLM_FAKE: '1'` (y `RATE_LIMIT_ENABLED: '0'`); no hay
  que tocar nada para CI.

`e2e-develop.yml` es la variante contra el deploy remoto de develop: solo corre
`@smoke` por defecto y **no** ejecuta escenarios de generación, por lo que no usa
LLM_FAKE. Si se lanza con otros tags contra un backend real, gastaría cuota LLM.

### Correr la suite completa en local sin gastar cuota

El backend local de `:8000` puede estar sin `LLM_FAKE` (proveedores reales). Para
probar los escenarios de generación sin coste:

1. Levanta una instancia aparte con `LLM_FAKE=1` en otro puerto (p. ej. `:8100`),
   apuntando a la misma BD de pruebas.
2. Exporta `E2E_API_ORIGIN=http://localhost:8100` antes de `pnpm test:e2e` (junto con
   `BASE_URL` del frontend). `tests/steps/e2e/fixtures.js` inyecta
   `window.__GENOVA_API_BASE__` para que el navegador llame a esa API, y
   `seedOvaViaApi`/el registro por API usan el mismo origen. Sin `E2E_API_ORIGIN` el
   comportamiento es el de siempre: same-origin vía proxy de Vite.

```bash
# Windows (desde tests/): bddgen debe correr con la variable puesta
set "E2E_API_ORIGIN=http://localhost:8100"
set "BASE_URL=http://localhost:4200"
pnpm test:e2e
```

> Ojo: en un `.cmd`/`.bat`, invoca `pnpm` con `call` (es otro `.cmd`) y evita pasar
> argumentos por `%*` si vienen de WSL; usa variables de entorno o un script por paso.

### Falla conocida del frontend (no arreglada aquí)

- **Escenario**: `tests/features/e2e/HU-002_crear-ova.feature` → "Generación completa
  desde el formulario hasta el workspace".
- **Paso que falla**: `Then la generación redirige al workspace del OVA`
  (`tests/steps/e2e/ova-e2e.steps.js:83`) → `TimeoutError: page.waitForURL:
  Timeout 120000ms exceeded`.
- **Causa**: el `POST /api/jobs` del formulario devuelve **422**. El frontend envía
  `resources[].resource_type` como número (`1`) y el backend lo exige string
  (`ResourceRequest.resource_type: str`). Payload observado:
  `"resources":[{"phase_type":"engage","resource_type":1},…]`; respuesta:
  `"Input should be a valid string"`. Origen:
  `frontend/src/features/ova-workspace/hooks/use-ova-creation.ts:57`
  (`resource_type: resource.id`, con `Resource.id: string | number`).
- **Efecto**: crear un OVA desde `/crear` está roto contra este backend; los seeds por
  API (que envían el nombre del recurso como string) sí funcionan. Reproducible
  también contra el backend de `:8000`.
