# EN-008: Habilitar Base de Datos para Gestión de Usuarios

## Ruta de guardado
`specs/EN-008_habilitar-base-datos-gestion-usuarios.md`

## Enabler
Como equipo de desarrollo, necesitamos desplegar y configurar una base de datos relacional (PostgreSQL en Supabase) para almacenar credenciales, perfiles de usuarios, OVAs y roles, con conexión ORM desde el backend FastAPI, de modo que quede habilitada la base técnica para autenticación y gestión de OVAs/roles.

## Objetivo
Disponibilizar una base de datos PostgreSQL accesible desde el backend vía Docker, con esquema inicial, migración y verificación de conexión/CRUD.

## Alcance
Incluye:
- Despliegue de PostgreSQL en Supabase.
- Conexión ORM (SQLAlchemy) desde backend FastAPI usando `DATABASE_URL`.
- Script de migración inicial en `backend/migrations/`.
- Tablas mínimas: `users`, `ovas`, `sessions`, `roles`, `user_roles`, `password_reset_tokens`.
- Verificación de salud de DB desde API.

No incluye:
- UI de administración de usuarios.
- Flujos de autenticación completa (login, refresh tokens, etc.).
- Encriptación/rotación automática de credenciales.

## Criterios de aceptación
1. PostgreSQL desplegado en Supabase y accesible desde el backend FastAPI vía Docker.
2. Tablas creadas: `users`, `ovas`, `sessions`, `roles`, `user_roles`, `password_reset_tokens`.
3. Conexión ORM (SQLAlchemy) configurada y probada con al menos una operación CRUD exitosa.
4. Variables de entorno de conexión almacenadas en `.env`, nunca en el código fuente.
5. Script de migración disponible en el repositorio (`backend/migrations/`).

## Datos de entrada/salida
Entradas:
- `DATABASE_URL` con Session Pooler de Supabase.
- Script SQL de migración inicial.

Salidas:
- Tablas creadas en esquema `public`.
- Endpoint de verificación DB activo.

## Flujos alternativos
- Si la red no soporta IPv6, usar Session Pooler (IPv4) en lugar de conexión directa.
- Si falla la resolución DNS en Docker, configurar DNS explícito en el servicio backend.

## Mockup ASCII - Arquitectura
```
[Cliente]
    |
    v
[FastAPI + SQLAlchemy]  <-- Docker
    |
    v
[Supabase Postgres] (Session Pooler)
```

## Mockup ASCII - Modelo ER (simplificado)
```
users (1) ------ (N) sessions
  |
  | (N)
  v
user_roles (N) ------ (1) roles

users (1) ------ (N) password_reset_tokens
ovas (independiente)
```

## Escenarios BDD (Gherkin)

```gherkin
Feature: Habilitar Base de Datos para Gestión de Usuarios

  Scenario: PostgreSQL accesible desde backend
    Given el backend FastAPI configurado con DATABASE_URL válida de Supabase
    When el servicio arranca
    Then la conexión a PostgreSQL se establece sin errores
    And GET /api/db/health responde con status "ok"

  Scenario: Tablas del esquema inicial creadas
    Given el backend arranca por primera vez con migrations habilitadas
    When run_migrations() se ejecuta en el lifespan
    Then existen las tablas: users, ovas, sessions, roles, user_roles, password_reset_tokens
    And todas las tablas son accesibles vía ORM SQLAlchemy

  Scenario: Variables de entorno nunca en código fuente
    Given el repositorio clonado sin archivo .env
    When el backend intenta arrancar sin DATABASE_URL configurada
    Then el proceso falla con un error claro de configuración
    And ningún valor de credencial aparece hardcodeado en el código fuente

  Scenario: CRUD operacional sobre tabla users
    Given la base de datos inicializada y seed ejecutado
    When se realiza una operación de lectura sobre la tabla users
    Then retorna al menos los usuarios de seed: admin@genova.ai y user@genova.ai

  Scenario: Script de migración disponible en el repositorio
    Given el repositorio clonado
    When se busca el archivo de migración inicial
    Then existe backend/migrations/001_init.sql con la definición del esquema inicial
```

## Checklist de verificación
- `backend/.env` contiene `DATABASE_URL` (Session Pooler).
- `backend/migrations/001_init.sql` presente.
- `GET /api/db/health` responde `ok`.
- CRUD smoke test ejecutado con éxito.
