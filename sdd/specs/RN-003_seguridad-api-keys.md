# RN-003: Seguridad y manejo de API Keys

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | RN-003 |
| Tipo | Req. No Funcional |
| Épica/Tema | EP7: Despliegue e Infraestructura Cloud |
| Sprint | Sprint 2 |
| Status | done |
| Prioridad | Media |
| Estimación | 5 SP |
| Dependencia | EN-006 |
| Responsable | — |
| Fase | Prometheus - Architectural Design |
| Fecha creación | 2026-06-19 |
| Fecha actualización | 2026-06-10 |
| Fecha Fin (info) | 2026-06-20 |

## Objetivo

Proteger todas las credenciales y claves API en el ciclo de vida del sistema desplegado, eliminando el riesgo financiero de filtración (Groq/OpenRouter/Gemini) y el riesgo de seguridad de exposición de tokens de sesión o datos de usuario.

## Contexto

Las claves de Groq, OpenRouter y Gemini son de alto riesgo financiero si se filtran. Las reglas de seguridad están establecidas en `CLAUDE.md` como restricciones duras. La autenticación usa httpOnly cookie `genova_token` (JWT HS256); el frontend nunca lee el token directamente. Rate limiting está implementado con SlowAPI (`@limiter.limit`). Los errores de base de datos se manejan con `commit_or_500()` que nunca expone `str(e)` al cliente.

## Alcance

### Incluye
- Lista canónica de variables server-only y la regla `VITE_*`.
- Mecanismo de autenticación: httpOnly cookie + JWT HS256 + bcrypt.
- Rate limiting en endpoints con entrada externa.
- Sanitización de errores: `commit_or_500()`, nunca `str(e)` al cliente.
- Regla de no-logging de secrets.
- Fallback `AUTH_ACCEPT_BEARER` para desactivar en producción.

### No incluye
- Auditoría externa ni pentesting.
- Gestión de secretos con vault externo (se usan env vars de plataforma; queda como mejora futura).
- Escaneo automático en CI con TruffleHog/Gitleaks (queda como mejora futura en Sprint 3).

## Dependencias

- **EN-006** — entorno de producción donde se aplican estas reglas.
- Transversal a todos los módulos del backend.

## Reglas de negocio

1. **R1 — Variables server-only**: `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `DATABASE_URL`, `SMTP_PASSWORD` solo existen como env vars de Render / GitHub Secrets. Nunca en el repo ni con prefijo `VITE_*`.
2. **R2 — `VITE_*` solo no-sensible**: el único `VITE_*` permitido es `VITE_API_URL` (URL del backend); no puede contener tokens.
3. **R3 — Autenticación**: JWT HS256 con `JWT_SECRET` de mínimo 16 caracteres. Cookie httpOnly `genova_token`; `Secure`, `SameSite=Strict`. `AUTH_ACCEPT_BEARER=0` en producción.
4. **R4 — Contraseñas**: bcrypt con cost factor ≥ 12; input truncado a 128 bytes antes de hashear.
5. **R5 — Rate limiting**: todos los endpoints que aceptan entrada externa llevan `@limiter.limit("N/minute")` + parámetro `request: Request`.
6. **R6 — Errores de DB**: usar `commit_or_500()`; nunca `str(e)` ni stack trace en respuesta HTTP.
7. **R7 — No-logging**: passwords, tokens y API keys nunca se loguean, ni siquiera en DEBUG.
8. **R8 — Reset/OTP**: tokens de reset y OTPs nunca se retornan en respuestas HTTP.

## Criterios de aceptación

- Ninguna de las vars de R1 aparece en el historial de git ni en código fuente. **(R1)**
- `VITE_API_URL` es la única variable con prefijo `VITE_*` que llega al frontend. **(R2)**
- El endpoint `/login` emite cookie httpOnly `genova_token`; el frontend no puede leerla con JS. **(R3)**
- Las contraseñas se almacenan como hash bcrypt; no existen como texto plano en ningún campo. **(R4)**
- Endpoints con input externo (`POST /api/ova/jobs`, `/login`, `/register`) tienen rate limit. **(R5)**
- Errores de base de datos retornan código 500 genérico sin mensaje interno. **(R6)**
- Los logs del backend no contienen valores de API keys ni tokens. **(R7)**
- `/forgot-password` no retorna el token de reset en el body HTTP. **(R8)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Seguridad y manejo de API Keys (RN-003)

  Scenario: API key no accesible desde el frontend
    Given la aplicación frontend cargada en el navegador
    When se inspeccionan las variables de entorno VITE_*
    Then ninguna variable contiene GROQ_API_KEY, OPENROUTER_API_KEY ni GEMINI_API_KEY

  Scenario: Cookie httpOnly no legible con JavaScript
    Given un usuario que hace login exitoso
    When el backend emite la cookie genova_token
    Then la cookie tiene atributos HttpOnly, Secure y SameSite=Strict
    And document.cookie en el frontend no contiene genova_token

  Scenario: Rate limit en creación de job
    Given un usuario que envía más de 10 POST /api/ova/jobs por minuto
    When se supera el límite
    Then el backend retorna 429 Too Many Requests
    And no se crea un nuevo job

  Scenario: Error de DB no expone stack trace
    Given un fallo inesperado de la base de datos
    When el backend lo maneja con commit_or_500()
    Then la respuesta HTTP tiene status 500
    And el body no contiene mensajes internos ni nombres de tablas
```
