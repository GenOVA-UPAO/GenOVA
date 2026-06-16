# HU-035: Configuracion dedicada de modelos y fallback

> Metadata (propuesta desde plan de rediseño basado en wireframes):

| Campo | Valor |
|---|---|
| ID | HU-035 |
| Tipo | Historia de Usuario |
| Epica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 2 |
| Status | spec_ready |
| Prioridad | Alta |
| Estimacion | 8 SP |
| Dependencia | HU-034, RN-006 |
| Responsable | - |
| Fase | SDD - Specify |
| Fecha creacion | 2026-06-16 |
| Fecha actualizacion | 2026-06-16 |
| Fecha Fin (info) | - |

## Historia de Usuario

Como **usuario de GenOVA con permisos de configuracion IA**, quiero gestionar
modelos y cadenas de fallback desde pantallas dedicadas, para entender que modelo
usa cada tarea y personalizarlo sin entrar a paneles mezclados de perfil o
plataforma.

## Contexto

Los wireframes `WireframeModelsPage.jsx` y `WireframeFallbackChainPage.jsx`
muestran pantallas dedicadas para asignacion por tarea, catalogo de modelos y
cadena de fallback. El proyecto ya cuenta con soporte real para `llm_settings`,
`enabled_models`, `user_api_keys`, `platform_config`, `useLlmSettings`,
`useAdminLlmConfig`, `ModelCatalogBrowser`, `LlmSettingsForm`,
`PlatformLlmConfigCard` y `llmConfigDraft`. HU-035 convierte ese soporte en
flujos de producto visibles y coherentes con el rediseño.

## Alcance

### Incluye
- Rutas reales `/modelos` y `/fallback`.
- Navegacion en sidebar bajo la seccion Configuracion.
- Pantalla `/modelos`: asignacion por tarea y catalogo de modelos.
- Pantalla `/fallback`: cadenas de fallback por caso de uso.
- Modo usuario: edicion solo si tiene API key propia y permiso correspondiente.
- Modo admin/plataforma: configuracion global con permisos administrativos.
- Reuso de servicios, hooks y helpers existentes de LLM.

### No incluye
- Vinculacion de usuarios o herencia de configuracion IA entre usuarios (HU-036).
- Nuevos proveedores LLM o cambios al catalogo externo.
- Cambios al motor de generacion mas alla de consumir la configuracion existente.

## Dependencias

- HU-034: catalogo unificado de modelos y APIs.
- RN-006: shell y navegacion visual unificada.
- Backend actual: `/api/users/me/llm-settings`, `/api/users/me/enabled-models`,
  `/api/admin/llm-config`, `llm_config_store`.

## Reglas de negocio

1. **R1** - `/modelos` muestra dos areas: asignacion por tarea y catalogo de
   modelos habilitables.
2. **R2** - `/fallback` muestra la cadena de fallback por tarea/caso de uso con
   primario, fallback 1, fallback 2 y acciones de reordenar/agregar/quitar cuando
   el usuario puede editar.
3. **R3** - Un usuario sin API key propia ve configuracion heredada/de plataforma
   en modo lectura y un mensaje claro para agregar su API key.
4. **R4** - Un usuario con API key propia y permisos `ai:models:self` /
   `ai:fallback:self` puede editar su configuracion personal si el backend lo
   soporta; si no, se limita a los endpoints personales existentes.
5. **R5** - Un admin con `ai:models:platform` puede editar defaults/fallbacks de
   plataforma usando `/api/admin/llm-config`.
6. **R6** - La UI reutiliza `useLlmSettings`, `useAdminLlmConfig`,
   `ModelCatalogBrowser`, `LlmSettingsForm` y `llmConfigDraft`; no duplica logica
   de validacion en pages.
7. **R7** - La configuracion de Perfil deja de ser el punto principal de modelos;
   Perfil queda centrado en datos personales, contraseña, imagenes/API keys y
   enlaces hacia `/modelos`.
8. **R8** - No se muestran modelos inactivos o invalidos para seleccion, siguiendo
   la validacion existente del backend.

## Criterios de aceptacion

- Existe `/modelos` y aparece en sidebar para usuarios con permiso de modelos.
  **(R1)**
- Existe `/fallback` y aparece en sidebar para usuarios con permiso de fallback.
  **(R2)**
- Usuario sin API key propia ve configuracion de plataforma en lectura. **(R3)**
- Usuario con API key propia puede habilitar modelos y guardar asignaciones
  personales con los endpoints existentes. **(R4, R6)**
- Admin puede editar configuracion global usando `/api/admin/llm-config`. **(R5)**
- Perfil ya no presenta modelos como flujo principal duplicado. **(R7)**
- `pnpm lint`, `pnpm test:unit` y `./verify.ps1 -Quick` pasan. **(R6, R8)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Configuracion dedicada de modelos y fallback (HU-035)

  Scenario: Usuario ve modelos en modo lectura sin API key
    Given un usuario autenticado sin API key propia
    When abre "/modelos"
    Then ve la configuracion de plataforma en modo lectura
    And ve una indicacion para agregar su API key

  Scenario: Usuario con API key configura modelos personales
    Given un usuario autenticado con API key propia y permiso "ai:models:self"
    When habilita un modelo del catalogo y lo asigna a una tarea
    Then la configuracion se guarda para su usuario

  Scenario: Admin configura fallback global
    Given un administrador con permiso "ai:models:platform"
    When reordena la cadena de fallback de una tarea
    Then el backend guarda la configuracion global
    And la generacion usa esa cadena efectiva
```
