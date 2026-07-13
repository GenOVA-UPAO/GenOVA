# Review — HU-035 Models UI redesign (amend 2026-07-11) — re-review post-fix

**Veredicto:** APPROVED

## Trazabilidad criterios ↔ tests (amend UI)

| Criterio amend | Estado | Test |
|---|---|---|
| 1. Header limpio (sin badge / Guardar plataforma) | [x] | `models-page.component.spec.ts` — `renders clean header…` |
| 2. Status strip (3 chips) | [x] | idem |
| 3. 3 secciones Modelos / Credenciales / Plataforma (admin) | [x] | idem |
| 4. Master-detail + Abrir catálogo (no tab peer) | [x] | `models-master-detail.component.spec.ts` |
| 5. Credenciales: "Tus claves" + admin "Claves de la plataforma" | [x] | `shows credential subsections for admin` |
| 6. Plataforma = nodes + capabilities (no metrics chart) | [x] | `mounts platform nodes card…` (nodes + caps; no sparkline/chart) |
| 7. Sticky save dirty-only | [x] | `shows sticky save bar only when dirty` |
| 8. Brand tokens (Fraunces / primary) | [x] | Via clases `font-display` / `text-primary` |
| Extra: `editingChain` cableado | [x] | `reveals llm-task-row only after Editar cadena` |

Criterios originales R1–R8 de HU-035 (rutas, API, permisos) no regresados (FE-only).

## Lint + ruff
- eslint scoped `src/features/llm-settings/**/*.{ts,html}`: [x] OK (exit 0)
- ruff check: [x] OK
- pnpm lint global / `verify.ps1 -Quick`: [ ] FALLA — **ova-workspace CRLF fuera de scope** (confirmado; no tocado en este amend)

## Tests
- `pnpm --filter frontend test -- --watch=false`: [x] OK — **9 files / 39 tests PASS**
- Auto-fix: no aplicado

## Arquitectura / calidad
- Líneas `.ts` (no test): page 227, master-detail 95, store 219 → [x] &lt;250
- `editingChain`: [x] gatea compacta vs `gn-llm-task-row` (HTML L82–105; reset en `selectTask`; toggle en `toggleEditChain`) — ya no dead code
- Signals + OnPush + store → pages: [x]
- Sin cambios API/backend: [x]
- `gn-model-assignment-panel` huérfano: documentado; cleanup post-merge OK

## Checkpoints
- C1: [x] unit FE verde (scoped)
- C2: [ ] lint global rojo por ova-workspace (out of scope; no bloquea este amend)
- C3: [x] límites líneas OK
- C4: [x] N/A (sin endpoints nuevos)
- C5: [x] amend §5–§7 + editingChain cubiertos
- C6: [ ] `verify.ps1 -Quick` global sigue rojo por CRLF ova-workspace (otra feature)
- C7: [x] capas FE OK
- C9–C11: [x] razonable; dead panel documentado
- C13: [x] master-detail responsive

## Checks adicionales
- G (Docs al día): [x] OK — UI-only; wireframe en `docs/wireframes/`
- H (Migración BD): [x] N/A

## Cambios requeridos previos — resueltos
1. Sticky save test → [x]
2. Credenciales test → [x]
3. Plataforma nodes (no chart) test → [x]
4. `editingChain` cableado + test → [x]

## Evidencia fresca (re-review)
```
pnpm --filter frontend exec eslint "src/features/llm-settings/**/*.{ts,html}" → exit 0
pnpm --filter frontend test -- --watch=false → 9 files / 39 tests PASS
python -m ruff check . → All checks passed
```
