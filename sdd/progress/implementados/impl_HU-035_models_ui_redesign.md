# impl_HU-035 — Models UI redesign (Angular)

**Fecha:** 2026-07-11  
**Feature:** HU-035 amend — rediseño UI `/models`  
**Estado:** impl_ready (pendiente reviewer — post CHANGES_REQUESTED)

## Qué se hizo

Reestructuración de la página Angular de modelos según wireframe OD aprobado
(`docs/wireframes/HU-035_models-settings-redesign.html`), sin cambios de backend
ni contratos API.

### IA implementada

1. **Header limpio** — título + subtítulo; sin badge CONFIGURACIÓN ni Guardar en hero.
2. **Status strip** — proveedores conectados · modelos activos · cambios sin guardar
   (derivados de `catalogStatus` / `enabledModels` + dirty admin/user).
3. **3 secciones** (`gn-tabs`): `modelos` | `credenciales` | `plataforma` (solo admin).
   Sync barato con hash `#modelos` / `#credenciales` / `#plataforma`.
4. **Master-detail** (`gn-models-master-detail`) — lista de tareas + detalle con
   primario/fallback (`gn-llm-task-row`), media cards, override de usuario.
   "Abrir catálogo" → `gn-manage-models-modal` (drawer/modal, no tab peer).
5. **Credenciales** — `gn-user-api-keys-card` (compact) + admin
   `gn-platform-api-keys-card` (adminZone + badge).
6. **Plataforma** — banner admin + `gn-platform-nodes-card` +
   `gn-platform-capabilities-card` (nodos Prometheus reales, no métricas inventadas).
7. **Sticky save bar** — solo si dirty; Guardar / Cancelar; quita Guardar del header.

## Fix post-review (CHANGES_REQUESTED)

1. **Sticky save test** — dirty → "Guardar cambios" visible; limpio → ausente.
2. **Credenciales test** — tab → "Tus claves" + admin "Claves de la plataforma".
3. **Plataforma test** — tab admin monta `gn-platform-nodes-card` (+ capabilities);
   sin chart/sparkline.
4. **`editingChain` cableado** — vista compacta (primario + chips) por defecto;
   "Editar cadena" revela `gn-llm-task-row`; "Listo" vuelve a compacta.
   Test: `reveals llm-task-row only after Editar cadena`.

## Archivos tocados

| Archivo | Acción |
|---|---|
| `pages/models-page.component.ts/html` | Reescrito (3 secciones + status + sticky) |
| `pages/models-page.component.spec.ts` | Tests amend §5–§7 (+ helper renderAdminPage) |
| `components/models-master-detail.component.ts/html` | Master-detail + editingChain real |
| `components/models-master-detail.component.spec.ts` | Lista/catálogo/media/edit chain |
| `components/user-api-keys-card.component.ts` | `compact` input |
| `components/platform-api-keys-card.component.ts` | `adminZone` input |
| `services/user-llm-settings.store.ts` | `dirty` signal-backed para sticky bar |

`gn-model-assignment-panel` queda sin uso (legado grid+panel flotante); no eliminado
para no ampliar scope — candidato a cleanup post-review.

## Decisiones

- Catálogo vía modal existente (`manage-models-modal`), no sheet nuevo.
- Dirty admin = snapshot JSON baseline vs draft; dirty user = flag en store.
- Status chips usan `statsTick` para reaccionar tras load (store aún usa campos planos).
- Mobile: lista/detalle progressive disclosure (`max-md:hidden` + “Volver a la lista”).
- `editingChain` gatea el editor completo (no solo el label del botón).

## Mapa criterios → tests

| Criterio UI | Test |
|---|---|
| Header limpio sin CONFIGURACIÓN / Guardar plataforma | `models-page.component.spec.ts` |
| Status strip visible | idem |
| Tabs Modelos / Credenciales / Plataforma (admin) | idem |
| Credenciales: Tus claves + Claves de la plataforma | `shows credential subsections for admin` |
| Plataforma = nodes card (no metrics chart) | `mounts platform nodes card…` |
| Sticky save dirty-only | `shows sticky save bar only when dirty` |
| Master-detail lista + Abrir catálogo | `models-master-detail.component.spec.ts` |
| Selección Imagen → media card | idem |
| Editar cadena revela llm-task-row | `reveals llm-task-row only after Editar cadena` |

## Verify

```
pnpm --filter frontend exec eslint "src/features/llm-settings/**/*.{ts,html}" → OK
pnpm --filter frontend test -- --watch=false → 9 files / 39 tests PASS
./verify.ps1 -Quick → lint global ova-workspace CRLF sigue fuera de scope (no tocado)
```

## No hecho (fuera de scope)

- Backend / APIs
- Commit git
- Eliminar `model-assignment-panel`
- Regenerar wireframe FASE 0
- Fix CRLF ova-workspace
