# Deuda Técnica — Arquitectura Frontend (Screaming Architecture)

> Creado: 2026-06-27 — Sesión de auditoría SA Sprint 3
> Actualizado: 2026-06-29 — Refactor ejecutado (commit 878542b)
> Estado: **COMPLETADO** — Archivos movidos a `core/settings/` (ver abajo).

---

## Contexto

GenOVA usa **Screaming Architecture**: la estructura de directorios debe gritar
el dominio del negocio, no el stack técnico. La carpeta raíz es `features/`, y
cada subdirectorio nombra un dominio: `admin/`, `ova_workspace/`, `student/`, etc.

El principio se viola cuando archivos de infraestructura técnica (ej. librerías
LLM, configuración de modelos) viven en `core/` en vez de en el dominio al que
pertenecen funcionalmente.

---

## Inventario de deuda — LLM en `core/`

Los siguientes 6 archivos en `core/lib/llm/` y `core/hooks/` y `core/services/`
pertenecen funcionalmente al dominio LLM de **configuración de modelos** y
deberían vivir en `features/llm/` (dominio que aún no existe como directorio formal).

### `core/lib/llm/`

| Archivo | Responsabilidad | Destino propuesto |
|---------|----------------|-------------------|
| `llmCatalogUtils.ts` | Labels, badges, formateo de pricing/ctx para catálogo UI | `features/llm/lib/llmCatalogUtils.ts` |
| `llmConfigDraft.ts` | Draft editable admin (defaults + fallbacks por tarea) | `features/llm/lib/llmConfigDraft.ts` |
| `llmSettingsLabels.ts` | Labels de tareas LLM (nombres legibles por humanos) | `features/llm/lib/llmSettingsLabels.ts` |
| `llmSettingsMutations.ts` | Transformaciones puras del mapa de settings usuario | `features/llm/lib/llmSettingsMutations.ts` |
| `nodesConfigDraft.ts` | Draft del panel de nodos Prometheus | `features/llm/lib/nodesConfigDraft.ts` |
| `taskMeta.ts` | Metadatos de tareas (descripción, timeout default) | `features/llm/lib/taskMeta.ts` |
| `fallbackArray.ts` | Utilidades puras de array (swap, append, remove, set) | `core/lib/utils/fallbackArray.ts` (**puede quedarse en core** por ser genérico) |

### `core/hooks/`

| Archivo | Responsabilidad | Destino propuesto |
|---------|----------------|-------------------|
| `useLlmSettings.ts` | Hook principal de settings LLM del usuario | `features/llm/hooks/useLlmSettings.ts` |
| `useLlmSettingsEditor.ts` | Hook de edición de settings (draft state + handlers) | `features/llm/hooks/useLlmSettingsEditor.ts` |
| `useEnabledModels.ts` | Hook para modelos habilitados por el usuario | `features/llm/hooks/useEnabledModels.ts` |
| `useLlmSettings.types.ts` | Tipos compartidos de useLlmSettings | `features/llm/hooks/useLlmSettings.types.ts` |

### `core/services/`

| Archivo | Responsabilidad | Destino propuesto |
|---------|----------------|-------------------|
| `llmSettingsService.ts` | Fetch del catálogo de modelos LLM | `features/llm/services/llmSettingsService.ts` |

### `core/components/`

| Archivo | Responsabilidad | Destino propuesto |
|---------|----------------|-------------------|
| `LlmEnginesPanel.tsx` | Panel de resumen de motores activos | `features/llm/components/LlmEnginesPanel.tsx` |

---

## Por qué rompen Screaming Architecture

1. **`core/` debería contener solo infraestructura agnóstica de dominio**: cliente
   HTTP, layout shells, componentes genéricos (Button, Modal, Badge). Los archivos
   LLM son lógica de negocio específica del dominio de modelos de IA.

2. **Un nuevo desarrollador que lee `core/lib/llm/`** no sabe que está mirando
   lógica de configuración de modelos de negocio — parece infraestructura técnica.

3. **Los hooks `useLlmSettings*` en `core/hooks/`** crean una dependencia circular
   implícita: `core` consume `features/ova_workspace` (a través del service) y
   `features/admin` (a través de la config).

---

## Estructura objetivo propuesta

```
features/
  llm/                          ← dominio LLM (nuevo)
    components/
      LlmEnginesPanel.tsx
    hooks/
      useLlmSettings.ts
      useLlmSettingsEditor.ts
      useEnabledModels.ts
      useLlmSettings.types.ts
    lib/
      llmCatalogUtils.ts
      llmConfigDraft.ts
      llmSettingsLabels.ts
      llmSettingsMutations.ts
      nodesConfigDraft.ts
      taskMeta.ts
    services/
      llmSettingsService.ts
```

---

## Estado actual (post-refactor 878542b)

Los archivos fueron movidos de `core/lib/llm/`, `core/hooks/` y `core/services/` a
`core/settings/` como sub-dominio de configuración transversal (sirve tanto a admin
como al usuario). La estructura final:

```
core/settings/
  components/   LlmEnginesPanel, ModelAssignmentPanel, y panel de settings completo
  hooks/        useLlmSettings, useLlmSettingsEditor, useEnabledModels
  lib/          llmCatalogUtils, llmConfigDraft, llmSettingsLabels, llmSettingsMutations,
                nodesConfigDraft, taskMeta, fallbackArray
  services/     llmSettingsService
```

`core/settings/` agrupa toda la configuración UI (LLM, API keys, plataforma, OVA settings)
que es cross-feature. Cumple el principio de que `core/` contenga infra transversal, ya
que Settings no pertenece a un único dominio de negocio.
