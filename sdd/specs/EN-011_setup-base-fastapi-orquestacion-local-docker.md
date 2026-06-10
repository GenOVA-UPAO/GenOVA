# EN-011: Setup Base de FastAPI y Orquestación Local (Docker)

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | EN-011 |
| Tipo | Habilitador |
| Épica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 1 |
| Status | To Do |
| Prioridad | Alta |
| Estimación | 5 SP |
| Dependencia | TA-001 |
| Responsable | — |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-04-28 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-04-29 |

## Ruta de guardado
`specs/EN-011_setup-base-fastapi-orquestacion-local-docker.md`

## Enabler
Como desarrollador, necesito configurar la base del backend (FastAPI) y la orquestación local con Docker Compose, para asegurar que el desarrollo del frontend (React) pueda comunicarse desde el día 1 con las APIs de los módulos del sistema (RAG, Agentes, SCORM) en un entorno replicable.

## Objetivo
Establecer una plataforma mínima de backend y contenedorización local/prod inicial para habilitar integración temprana frontend-backend y módulos funcionales del sistema.

## Alcance
Incluye:
- Inicialización backend FastAPI en `backend/`.
- Submódulos estructurados: `agents/`, `rag/`, `scorm/`.
- CORS habilitado para frontend local.
- `docker-compose.yml` para entorno local (frontend + backend).
- `docker-compose.prod.yml` en implementación avanzada inicial con reverse proxy Nginx.
- Configuración Nginx para enrutar `/api` a backend y `/` a frontend.

No incluye:
- Persistencia DB productiva.
- SSL/TLS de producción.
- Pipeline CI/CD de despliegue.

## Criterios de aceptación (detallados)
1. Existe proyecto FastAPI inicializado en `backend/` con subcarpetas `agents/`, `rag/`, `scorm/`.
2. Existe `docker-compose.yml` en raíz y levanta simultáneamente frontend y backend.
3. Existe `docker-compose.prod.yml` funcional con base productiva inicial y reverse proxy.
4. CORS en FastAPI permite peticiones desde frontend local.
5. Existen endpoints de salud para validar orquestación local y de módulos.

## Endpoints mínimos esperados
- `GET /health`
- `GET /api/health`
- `GET /api/agents/health`
- `GET /api/rag/health`
- `GET /api/scorm/health`

## Escenarios BDD (Gherkin)
```gherkin
Feature: Habilitación de backend FastAPI y orquestación Docker
  Como desarrollador
  Quiero un entorno backend+frontend replicable
  Para integrar módulos desde el inicio

  Scenario: Estructura backend inicial
    Given el repositorio GENOVA
    When se inicializa EN-011
    Then debe existir backend con subcarpetas agents, rag y scorm

  Scenario: Orquestación local
    Given docker-compose.yml en la raíz
    When ejecuto docker compose up --build
    Then frontend y backend deben iniciar en contenedores simultáneamente

  Scenario: CORS habilitado para frontend local
    Given el backend FastAPI iniciado
    When el frontend local realiza peticiones HTTP
    Then el backend debe aceptar los orígenes configurados de localhost

  Scenario: Base productiva con gateway
    Given docker-compose.prod.yml y configuración nginx
    When ejecuto docker compose -f docker-compose.prod.yml up --build
    Then el gateway debe enrutar /api al backend y / al frontend
```

## Mockup ASCII (arquitectura runtime)
```text
[Browser]
    |
    v
 [Nginx Gateway :80]  (prod)
    |            \
    |             \__ /api/* -> [FastAPI :8000]
    |
    \__ /* -> [Frontend build :80]

(local)
[Browser :5173] <-> [Frontend Vite container]
       |
       +---------> [FastAPI container :8000]
```

## Definición de terminado (DoD)
- Backend FastAPI modular creado.
- Compose local operativo con frontend/backend.
- Compose prod inicial operativo con Nginx reverse proxy.
- CORS configurado para desarrollo local.
- Documentación principal actualizada.
