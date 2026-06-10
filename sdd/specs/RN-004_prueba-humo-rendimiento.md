# RN-004: Prueba de humo de rendimiento post-despliegue

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | RN-004 |
| Tipo | Req. No Funcional |
| Épica/Tema | EP7: Despliegue e Infraestructura Cloud |
| Sprint | Sprint 2 |
| Status | spec_ready |
| Prioridad | Media |
| Estimación | 5 SP |
| Dependencia | EN-006 |
| Responsable | — |
| Fase | Prometheus - Architectural Design |
| Fecha creación | 2026-06-20 |
| Fecha actualización | 2026-06-10 |
| Fecha Fin (info) | 2026-06-21 |

## Objetivo

Ejecutar una prueba de humo de rendimiento tras el despliegue para detectar problemas de latencia antes de Sprint 3 y establecer el baseline de P50/P90 que usará la validación formal de RN-001.

## Contexto

Antes de presentar a los 60+ estudiantes de la evaluación SUS, el equipo debe verificar que el sistema en producción responde dentro de umbrales aceptables. La prueba cubre: disponibilidad de endpoints críticos, latencia de endpoints no-LLM (criterio RN-001: ≤278 ms), y MTTG del pipeline completo (criterio RN-002: ≤180 s). Existe `backend/tests/test_latency.py` que automatiza parte de la medición.

## Alcance

### Incluye
- Lista de endpoints a verificar (health, auth, generación).
- Criterios de éxito y umbrales por categoría.
- Procedimiento de ejecución: `test_latency.py` + verificación manual.
- Formato del reporte de resultados (P50/P90, tasa de error).

### No incluye
- Pruebas de carga con concurrencia alta (→ TA-003 en Sprint 3).
- Prueba con k6/JMeter (herramienta para Sprint 3 si P90 falla).
- Prueba de penetración o seguridad.

## Dependencias

- **EN-006** — sistema desplegado en producción (Render + Vercel).
- **RN-002** — criterio MTTG ≤ 180 s que esta prueba verifica.
- **RN-001** — criterio latencia ≤ 278 ms que esta prueba pre-valida para Sprint 3.

## Endpoints a verificar

| Endpoint | Método | Categoría | Umbral |
|---|---|---|---|
| `/health` | GET | Disponibilidad | < 278 ms, status 200 |
| `/api/db/health` | GET | Disponibilidad | < 278 ms, status 200 |
| `POST /login` | POST | Auth | < 278 ms, status 200 |
| `GET /api/ova/jobs` | GET | Lista | < 278 ms, status 200 |
| `POST /api/ova/jobs` | POST | Generación LLM | ≤ 180 s hasta done, status 200 |

## Reglas de negocio

1. **R1** — Prerrequisito: backend accesible en la URL de Render, DB conectada, al menos un usuario seed activo.
2. **R2** — Endpoints no-LLM (health, auth, lista): umbral < 278 ms (P50). Sin errores 5xx.
3. **R3** — Endpoint de generación LLM: MTTG P50 ≤ 180 s medido sobre ≥ 3 generaciones distintas.
4. **R4** — Ejecución con `test_latency.py`: `pytest backend/tests/test_latency.py -v --tb=short`.
5. **R5** — Reporte registra: fecha, URL de producción, P50/P90 por endpoint, tasa de error, observaciones de cuello de botella.
6. **R6** — Si un endpoint falla el umbral, se registra como hallazgo sin bloquear el cierre del sprint; se escala como deuda técnica.

## Procedimiento de ejecución

```bash
# 1. Verificar que el backend de producción responde
curl -s https://<render-url>/health

# 2. Ejecutar test de latencia automatizado
cd backend
pytest tests/test_latency.py -v --tb=short

# 3. Generación manual de OVA completo (cronometrado)
# Autenticarse → POST /api/ova/jobs → polling hasta "done" → registrar tiempo

# 4. Completar reporte (ver formato R5)
```

## Criterios de aceptación

- `test_latency.py` ejecutado contra producción sin errores de conexión. **(R1, R4)**
- `GET /health` y `GET /api/db/health` responden < 278 ms. **(R2)**
- `POST /login` responde < 278 ms. **(R2)**
- Al menos 3 generaciones de OVA completan con MTTG P50 ≤ 180 s. **(R3)**
- Reporte generado con P50/P90 por endpoint. **(R5)**
- Hallazgos fuera de umbral documentados como deuda técnica. **(R6)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Prueba de humo de rendimiento post-despliegue (RN-004)

  Scenario: Health checks responden dentro del umbral
    Given el backend desplegado en producción
    When se hace GET a /health y GET a /api/db/health
    Then ambos retornan status 200
    And el tiempo de respuesta es menor a 278 ms

  Scenario: Generación completa de OVA dentro del MTTG
    Given un usuario autenticado en producción
    When crea un OVA con topic "Árboles de decisión" y level "básico"
    Then el job completa con status "done"
    And el tiempo total desde POST hasta "done" es ≤ 180 segundos

  Scenario: Reporte documenta hallazgos fuera de umbral
    Given un endpoint que responde en > 278 ms
    When se registra el resultado en el reporte de RN-004
    Then el hallazgo aparece como deuda técnica
    And el sprint no se bloquea por ese hallazgo
```
