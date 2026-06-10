# EN-006: Habilitar entornos Cloud y orquestación

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | EN-006 |
| Tipo | Habilitador |
| Épica/Tema | EP7: Despliegue e Infraestructura Cloud |
| Sprint | Sprint 2 |
| Status | done |
| Prioridad | Alta |
| Estimación | 8 SP |
| Dependencia | SP-004 |
| Responsable | — |
| Fase | Prometheus - Architectural Design |
| Fecha creación | 2026-06-15 |
| Fecha actualización | 2026-06-10 |
| Fecha Fin (info) | 2026-06-19 |

## Objetivo

Desplegar el sistema completo en producción (backend en Render, frontend en Vercel, BD en Supabase), accesible públicamente con HTTPS, CI/CD automatizado y mecanismos de keep-alive para los tiers gratuitos.

## Contexto

Implementado en Sprint 2 (TA-006, TA-007). El backend corre en Render (Free Tier) desde un `Dockerfile` en la raíz del repositorio. El frontend está desplegado en Vercel con `vercel.json`. El CI/CD está en `.github/workflows/ci.yml`. Los tiers gratuitos de Render (duerme a los 15 min) y Supabase (pausa a los 7 días sin peticiones) requieren estrategias de keep-alive explícitas.

## Alcance

### Incluye
- **Backend (Render)**: `Dockerfile` (Python 3.12-slim, uvicorn puerto 8000), variables de entorno en Render dashboard, `DATABASE_URL` → Supabase Transaction pooler (puerto 6543).
- **Frontend (Vercel)**: `vercel.json` con build Vite, rewrite SPA (`/*` → `/index.html`), headers de seguridad (`X-Frame-Options`, `X-Content-Type-Options`), cache de assets estáticos.
- **CI/CD**: `.github/workflows/ci.yml` — jobs paralelos `lint`, `backend-bdd`, `frontend-unit` → job `e2e`. Push/PR a `develop`/`main`.
- **Keep-alive Render**: cron externo (n8n o cron-job.org) cada 10 min hace GET a `/api/db/health`.
- **Keep-alive Supabase**: `.github/workflows/keep-supabase-alive.yml` — cron diario vía REST API.
- Separación de ambientes: variables distintas para dev/prod; secrets en Render (backend) y en GitHub/Vercel (CI/CD).

### No incluye
- Kubernetes, multi-región ni auto-scaling.
- Dominio personalizado (se usa subdominio Render/Vercel por defecto).
- Gestión de secretos con AWS Secrets Manager o Azure Key Vault (se usan env vars de plataforma).

## Dependencias

- **EN-008** — Supabase PostgreSQL operativo.
- **EN-003** — Backend de agentes debe estar funcional antes del despliegue.
- Requerido por **EN-009** (FE llama al backend en la URL de producción).
- Requerido por **RN-003** (seguridad se verifica sobre el entorno desplegado).
- Requerido por **RN-004** (smoke test se ejecuta contra producción).

## Reglas de negocio

1. **R1** — Backend: imagen Docker Python 3.12-slim, comando `uvicorn main:app --host 0.0.0.0 --port 8000`.
2. **R2** — `DATABASE_URL` apunta al Transaction pooler de Supabase (puerto 6543, `pgbouncer=true`).
3. **R3** — `ENV=production` habilita validación estricta de `CORS_ORIGINS` (orígenes de Vercel).
4. **R4** — Frontend: `vercel.json` reescribe todas las rutas al `index.html` (SPA).
5. **R5** — CI/CD: los jobs `lint`, `backend-bdd` y `frontend-unit` corren en paralelo; `e2e` solo corre si los tres pasan.
6. **R6** — Keep-alive Supabase: ping diario a `<SUPABASE_URL>/rest/v1/roles?select=id&limit=1`; falla si status HTTP ≥ 500.
7. **R7** — Keep-alive Render: GET externo a `/api/db/health` cada 10 minutos.
8. **R8** — Secrets `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` solo existen en Render env vars / GitHub Secrets; nunca en el repo.

## Criterios de aceptación

- Render despliega el backend desde `Dockerfile` y uvicorn responde en `/health`. **(R1)**
- `DATABASE_URL` usa Transaction pooler (puerto 6543). **(R2)**
- `CORS_ORIGINS` bloquea orígenes no listados en producción. **(R3)**
- Vercel sirve el frontend y las rutas SPA no retornan 404. **(R4)**
- CI pasa en PR: lint + backend-bdd + frontend-unit en paralelo, e2e al final. **(R5)**
- El workflow `keep-supabase-alive.yml` se ejecuta diariamente sin fallo. **(R6)**
- Cron externo pingea `/api/db/health` cada 10 min, Render no duerme. **(R7)**
- Ningún secret aparece en el historial de git ni en logs de CI. **(R8)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Entornos Cloud y orquestación (EN-006)

  Scenario: Backend accesible en producción
    Given el Dockerfile desplegado en Render
    When se hace GET a la URL pública de Render en /health
    Then la respuesta tiene status 200
    And el backend responde en menos de 5 segundos

  Scenario: Frontend SPA sin 404 en rutas internas
    Given el frontend desplegado en Vercel con vercel.json
    When el usuario navega directamente a /workspace/123
    Then Vercel devuelve index.html con status 200
    And el frontend carga sin errores

  Scenario: CI bloquea merge si tests fallan
    Given un PR con un test backend-bdd roto
    When se ejecuta el pipeline en GitHub Actions
    Then el job "e2e" no se ejecuta
    And el PR queda bloqueado para merge

  Scenario: Keep-alive Supabase evita pausa
    Given el workflow keep-supabase-alive.yml programado diariamente
    When el cron se dispara
    Then se hace ping REST a ambas instancias Supabase
    And el workflow completa sin errores si Supabase responde < 500
```
