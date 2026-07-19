# Documentación de Pruebas — GenOVA

Entregables de pruebas del proyecto. Los **reportes formales** (IEEE 829
simplificado, con evidencia PNG) son la fuente canónica.

## Reportes formales (canónicos)

| Tipo de prueba | Markdown | Word (formato UPAO) | Evidencia |
|---|---|---|---|
| Caja negra | [`Documento de Prueba de Caja Negra.md`](Documento%20de%20Prueba%20de%20Caja%20Negra.md) | [`Documento de Prueba de Caja Negra.docx`](Documento%20de%20Prueba%20de%20Caja%20Negra.docx) | [`../assets/caja-negra-completa/`](../assets/caja-negra-completa/) |
| End-to-End (Playwright + BDD) | [`reporte-pruebas-e2e.md`](reporte-pruebas-e2e.md) | [`Documento de prueba End-to-End.docx`](Documento%20de%20prueba%20End-to-End.docx) | [`../assets/e2e/`](../assets/e2e/) · HTML: `tests/playwright-report/` |
| Carga (Locust + JMeter) | [`reporte-pruebas-carga.md`](reporte-pruebas-carga.md) | [`Documento de prueba de Carga.docx`](Documento%20de%20prueba%20de%20Carga.docx) | [`../assets/carga/`](../assets/carga/) · HTML: `tests/load/report.html`, `tests/load/jmeter-report/` |
| Unitarias + BDD | [`reporte-pruebas-unitarias-bdd.md`](reporte-pruebas-unitarias-bdd.md) | [`Documento de prueba Unitarias y BDD.docx`](Documento%20de%20prueba%20Unitarias%20y%20BDD.docx) | [`../assets/unit-bdd/`](../assets/unit-bdd/) · HTML: `*-resumen.html` |
| Usabilidad técnica | [`reporte-pruebas-usabilidad.md`](reporte-pruebas-usabilidad.md) | — | [`../assets/usabilidad/`](../assets/usabilidad/) |

Los Word incluyen portada UPAO, figuras numeradas (índice al final) y enlaces al repositorio
[`GenOVA-UPAO/GenOVA`](https://github.com/GenOVA-UPAO/GenOVA) hacia HTML/PNG/scripts (activos tras la PR de pruebas).

## Otros entregables

| Tipo | Documento | Formato |
|---|---|---|
| Caja negra (anexos / versión corta) | [`pruebas-caja-negra.md`](pruebas-caja-negra.md) · [`pruebas-caja-negra-completa.md`](pruebas-caja-negra-completa.md) · [`pruebas-caja-negra.docx`](pruebas-caja-negra.docx) | Markdown + Word legacy |
| Matriz / casos por HU | [`GenOVA-casos-prueba-funcionales.xlsx`](GenOVA-casos-prueba-funcionales.xlsx) · [`plan-pruebas-funcionales.md`](plan-pruebas-funcionales.md) | Excel / Markdown (plan → Excel UPAO pendiente) |

## Borradores (redirigen al reporte formal)

| Borrador | Ver en su lugar |
|---|---|
| [`pruebas-carga.md`](pruebas-carga.md) | [`reporte-pruebas-carga.md`](reporte-pruebas-carga.md) |
| [`pruebas-unitarias-bdd-e2e.md`](pruebas-unitarias-bdd-e2e.md) | [`reporte-pruebas-unitarias-bdd.md`](reporte-pruebas-unitarias-bdd.md) + [`reporte-pruebas-e2e.md`](reporte-pruebas-e2e.md) |

## Artefactos de código asociados

- Capturas caja negra: [`../assets/caja-negra/`](../assets/caja-negra/) · [`../assets/caja-negra-completa/`](../assets/caja-negra-completa/)
- Locust: [`../../tests/load/locustfile.py`](../../tests/load/locustfile.py)
- JMeter: [`../../tests/load/genova-loadtest.jmx`](../../tests/load/genova-loadtest.jmx)
- axe-core: [`../../tests/a11y/`](../../tests/a11y/)
- Features BDD/E2E: [`../../tests/features/`](../../tests/features/)
- Lighthouse helper: [`../../tests/run-lighthouse.mjs`](../../tests/run-lighthouse.mjs)

## Cómo regenerar capturas de caja negra

```bash
# 1) Backend inline con generación determinista (sin Redis, sin límite de tasa)
cd backend
REDIS_URL="" LLM_FAKE=1 RATE_LIMIT_ENABLED=0 .venv/Scripts/uvicorn main:app --port 8001

# 2) Frontend apuntando al backend :8001 (proxy)
cd frontend && npx ng serve --port 4300 --proxy-config <proxy-8001.json>

# 3) Capturas (los PNG se guardan en docs/assets/caja-negra/)
cd tests && BASE_URL=http://localhost:4300 node capture-caja-negra.mjs
```
