# Deuda Técnica — Arquitectura Frontend (Screaming Architecture)

> Creado: 2026-06-27 — Sesión de auditoría SA Sprint 3
> Estado: **SOLO DOCUMENTACIÓN** — No se mueven archivos en esta fase.

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

## Plan de migración (futura — fuera de scope Sprint 3)

1. Crear `features/llm/` con la estructura objetivo.
2. Mover cada archivo (renombrando el directorio import).
3. Actualizar todos los imports en los consumidores:
   - `features/admin/pages/AdminLlmPage.tsx`
   - `features/admin/hooks/useAdminLlmConfig.ts`
   - `features/ova_workspace/pages/ModelsPage.tsx`
   - `src/App.tsx` (si hay lazy imports directos)
4. Verificar con `pnpm build` y `pnpm lint`.
5. Eliminar los archivos de `core/`.

> **Riesgo**: Medio. Afecta ~8-12 archivos con imports cruzados. Requiere sesión
> dedicada (TA nuevo o SP-010).

---

## Restricción de Sprint 3

La decisión del usuario en Sprint 3 fue **solo marcar deuda técnica, no mover
archivos**. Este documento cumple esa restricción.

La migración queda propuesta como tarea futura con ID sugerido: `TA-008`.
