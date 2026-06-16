# HU-036: Vinculacion de usuarios con permisos granulares

> Metadata (propuesta desde plan de rediseño basado en wireframes):

| Campo | Valor |
|---|---|
| ID | HU-036 |
| Tipo | Historia de Usuario |
| Epica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 2 |
| Status | spec_ready |
| Prioridad | Alta |
| Estimacion | 13 SP |
| Dependencia | HU-021, HU-035 |
| Responsable | - |
| Fase | SDD - Specify |
| Fecha creacion | 2026-06-16 |
| Fecha actualizacion | 2026-06-16 |
| Fecha Fin (info) | - |

## Historia de Usuario

Como **usuario con permiso para vincular estudiantes**, quiero invitar y gestionar
usuarios vinculados a mi cuenta, para que ciertos usuarios puedan heredar mi
configuracion IA cuando no tengan claves propias.

## Contexto

El wireframe `WireframeVinculacionPage.jsx` propone una pantalla para gestionar
estudiantes vinculados, invitaciones por email, codigos de vinculacion y una
vista admin de todos los vinculos. El usuario aclaro que esta capacidad no debe
depender solo del nombre del rol "docente": debe activarse mediante permisos
granulares para que cualquier rol futuro pueda recibirla.

## Alcance

### Incluye
- Nueva ruta real `/vinculacion`.
- Permisos granulares:
  - `users:link`
  - `users:link:admin`
  - `ai:models:self`
  - `ai:fallback:self`
  - `ai:models:platform`
- Nueva persistencia para vinculos entre usuarios.
- Endpoints para listar, invitar, generar codigo, aceptar codigo y desvincular.
- Vista usuario: estudiantes/usuarios vinculados propios.
- Vista admin: todos los vinculos de la plataforma.
- Herencia de configuracion IA cuando el usuario vinculado no tiene API key
  propia.

### No incluye
- Envio real de email transaccional si no existe proveedor configurado; se permite
  dejar invitacion/codigo como flujo interno sin exponer secretos.
- Chat entre usuarios, clases, cursos o grupos.
- Cambios a la generacion OVA que no sean resolucion de configuracion efectiva.

## Dependencias

- HU-021: gestion de usuarios y roles.
- HU-035: configuracion dedicada de modelos y fallback.
- Backend: `Role.permissions`, `User.user_api_keys`, `llm_settings`,
  `enabled_models`, `platform_config`, resolucion de keys.

## Reglas de negocio

1. **R1** - La capacidad de vincular usuarios depende de permisos, no del nombre
   exacto del rol.
2. **R2** - Un usuario con `users:link` puede listar sus vinculados, generar un
   codigo de vinculacion, invitar por email y desvincular.
3. **R3** - Un admin con `users:link:admin` puede listar todos los vinculos y
   desvincular cualquier relacion.
4. **R4** - Un codigo de vinculacion expira y solo puede usarse una vez.
5. **R5** - Un usuario vinculado sin API key propia puede heredar configuracion IA
   del vinculador; si tiene API key propia, prevalece su configuracion personal.
6. **R6** - La resolucion efectiva mantiene el fallback actual: user key ->
   inherited key/config -> platform key -> env var.
7. **R7** - Las APIs nuevas nunca devuelven API keys completas, tokens ni codigos
   ya consumidos.
8. **R8** - Los endpoints con input externo usan rate limiting y errores
   sanitizados.
9. **R9** - La UI de `/vinculacion` sigue la estetica de `WireframeVinculacionPage`
   y se muestra solo si el usuario tiene permisos relevantes.

## Criterios de aceptacion

- El catalogo de permisos permite asignar `users:link`, `users:link:admin`,
  `ai:models:self`, `ai:fallback:self` y `ai:models:platform`. **(R1)**
- Un usuario con `users:link` puede generar codigo, invitar y desvincular usuarios
  desde `/vinculacion`. **(R2)**
- Un admin con `users:link:admin` ve todos los vinculos y puede desvincular.
  **(R3)**
- Los codigos expiran y no se reutilizan. **(R4)**
- Un usuario vinculado sin API key propia hereda configuracion IA del vinculador;
  con key propia usa su configuracion personal. **(R5, R6)**
- Las respuestas no exponen secretos. **(R7)**
- `./verify.ps1`, backend tests y frontend unit pasan. **(R8, R9)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Vinculacion de usuarios con permisos granulares (HU-036)

  Scenario: Usuario con permiso genera codigo de vinculacion
    Given un usuario autenticado con permiso "users:link"
    When genera un codigo de vinculacion
    Then recibe un codigo vigente
    And el codigo no expone claves ni tokens

  Scenario: Usuario acepta un codigo de vinculacion
    Given un codigo vigente generado por un usuario autorizado
    When otro usuario acepta el codigo
    Then queda vinculado al usuario que genero el codigo
    And el codigo queda consumido

  Scenario: Usuario vinculado hereda configuracion IA
    Given un usuario vinculado sin API key propia
    When genera un OVA
    Then el sistema usa la configuracion heredada antes de caer a plataforma

  Scenario: Usuario con clave propia no hereda
    Given un usuario vinculado con API key propia
    When genera un OVA
    Then el sistema usa su configuracion personal

  Scenario: Admin lista vinculos
    Given un administrador con permiso "users:link:admin"
    When abre "/vinculacion"
    Then ve todos los vinculos de la plataforma
```
