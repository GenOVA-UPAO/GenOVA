# BU-003: Estado async con campos planos no re-renderiza (zoneless + OnPush)

> Metadata (de `sdd/backlog.md` + ciclo del bug):

| Campo | Valor |
|---|---|
| ID | BU-003 |
| Tipo | Bug |
| Épica/Tema | EP-2: Plataforma Web y Autenticación |
| Sprint | Sprint 2 |
| Status | in_progress |
| Prioridad | Media |
| Estimación | 3 SP |
| Dependencia | — |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-07-06 |
| Fecha actualización | 2026-07-06 |
| Fecha Fin (info) | — |

## Ruta de guardado
`sdd/bugs/BU-003_zoneless-onpush-estado-async-sin-signals.md`

## Resumen
La app es zoneless con `ChangeDetectionStrategy.OnPush` global, pero 7 componentes
gestionan estado async con **campos planos** (`loading`, `error`, `data`) mutados
tras `await` en `ngOnInit`. Sin Zone.js nada dispara change detection al resolver
la promesa → la vista queda congelada en el estado de carga aunque la API responda
200. Detectado en la auditoría 2026-07-06 (hallazgo #2).

## Pasos para reproducir
1. Login como admin en el deploy develop.
2. Ir a `/analytics` → queda "Cargando métricas…" para siempre
   (`GET /api/users/analytics` responde 200).
3. Ir a `/models` → tab "Keys Globales Admin" → skeleton infinito
   (`GET /api/admin/platform-config` responde 200).
4. Intermitente: en `/crear`, abrir el selector de recursos 5E; si los
   `GET /api/agents/{fase}/recursos` resuelven tras el primer render, la lista queda
   en "Cargando recursos…" hasta el siguiente click (cualquier evento la "despierta").

## Comportamiento esperado
Al resolver el fetch, la vista muestra datos (o el error) sin necesidad de
interacción extra.

## Causa raíz
`async ngOnInit` + mutación de campos planos + OnPush zoneless = ninguna
notificación al scheduler de CD. Los datos llegan; la vista no se invalida.

## Componentes afectados
1. `features/analytics/pages/analytics-page.component.ts` (reproducido)
2. `features/llm-settings/components/platform-api-keys-card.component.ts` (reproducido)
3. `features/llm-settings/components/platform-capabilities-card.component.ts`
4. `features/llm-settings/components/platform-nodes-card.component.ts`
5. `features/llm-settings/components/user-api-keys-card.component.ts`
6. `features/llm-settings/pages/models-page.component.ts`
7. `features/profile/pages/user-links-page.component.ts`
8. Selector de recursos 5E de `/crear` (estado de carga de recursos por fase — intermitente)

## Fix
Migrar el estado async de cada componente a `signal()` (leído en template →
invalidación automática). Detección de regresión: grep de guardia — ningún
`async ngOnInit` debe mutar campos planos leídos por el template.

## Invariante (backprop §V)
En este repo zoneless: **todo estado leído por un template y mutado tras un `await`
DEBE ser un signal**. Candidato a regla ESLint custom o check del reviewer.
