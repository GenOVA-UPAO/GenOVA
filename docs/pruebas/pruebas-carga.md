# Pruebas de Carga — GenOVA

> **Fuente canónica:** el reporte formal con resultados Locust + JMeter,
> comparativa P90 y evidencia PNG está en
> **[`reporte-pruebas-carga.md`](reporte-pruebas-carga.md)**.
>
> Este archivo se conserva como acceso rápido / borrador histórico; no actualizar
> métricas aquí.

Resumen del escenario (detalle en el reporte formal):

- 25 usuarios · ramp-up 5/s · 2 min · think time 0.5–2 s
- Mix: `/health`, `/api/ovas`, login, register (generación LLM opcional)
- Umbral RN-001: P90 ≤ 278 ms en endpoints no-LLM
- Herramientas: [`tests/load/locustfile.py`](../../tests/load/locustfile.py) ·
  [`tests/load/genova-loadtest.jmx`](../../tests/load/genova-loadtest.jmx)
