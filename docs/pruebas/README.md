# Documentación de Pruebas — GenOVA

Entregables de pruebas del proyecto, agrupados por tipo.

| Tipo de prueba | Documento | Formato |
|---|---|---|
| Caja Negra / Funcionales (8 escenarios con capturas reales) | [`pruebas-caja-negra.md`](pruebas-caja-negra.md) · [`pruebas-caja-negra.docx`](pruebas-caja-negra.docx) | Markdown + Word |
| Pruebas Funcionales por feature (Matriz + Caso de Prueba por HU) | [`GenOVA-casos-prueba-funcionales.xlsx`](GenOVA-casos-prueba-funcionales.xlsx) | Excel |
| Pruebas de Carga (Locust real + plan JMeter) | [`pruebas-carga.md`](pruebas-carga.md) | Markdown |
| Pruebas Unitarias, BDD (Cucumber) y E2E (Playwright) | [`pruebas-unitarias-bdd-e2e.md`](pruebas-unitarias-bdd-e2e.md) | Markdown |

## Artefactos asociados

- Capturas de caja negra: [`../assets/caja-negra/`](../assets/caja-negra) (26 PNG).
- Script de captura (Playwright): [`../../tests/capture-caja-negra.mjs`](../../tests/capture-caja-negra.mjs).
- Prueba de carga Locust: [`../../tests/load/locustfile.py`](../../tests/load/locustfile.py).
- Plan de carga JMeter: [`../../tests/load/genova-loadtest.jmx`](../../tests/load/genova-loadtest.jmx).
- Features BDD/E2E: [`../../tests/features/`](../../tests/features).

## Cómo regenerar las capturas de caja negra

```bash
# 1) Backend inline con generación determinista (sin Redis, sin límite de tasa)
cd backend
REDIS_URL="" LLM_FAKE=1 RATE_LIMIT_ENABLED=0 .venv/Scripts/uvicorn main:app --port 8001

# 2) Frontend apuntando al backend :8001 (proxy)
cd frontend && npx ng serve --port 4300 --proxy-config <proxy-8001.json>

# 3) Capturas (los PNG se guardan en docs/assets/caja-negra/)
cd tests && BASE_URL=http://localhost:4300 node capture-caja-negra.mjs
# Solo algunos escenarios: ONLY=esc3,esc4 node capture-caja-negra.mjs
```
