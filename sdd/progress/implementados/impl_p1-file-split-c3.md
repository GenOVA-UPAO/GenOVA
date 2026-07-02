# P1 — Split TS files >200 lines (CHECKPOINTS C3)

## Splits performed

| File | Before | After (.ts) | Extracted |
|------|--------|-------------|-----------|
| mis-ovas-page.ts | 375 | 155 | mis-ovas-page.html, mis-ovas-page.helpers.ts |
| totp-setup-card.component.ts | 293 | 120 | totp-setup-card.component.html, totp-setup-card.types.ts |
| papelera-page.ts | 279 | 131 | papelera-page.html |
| user-links-page.component.ts | 244 | 103 | user-links-page.component.html, user-links-page.helpers.ts |
| platform-nodes-card.component.ts | 240 | 96 | platform-nodes-card.component.html, platform-nodes-card.helpers.ts |
| workspace-chat-panel.component.ts | 241 | 66 | workspace-chat-panel.component.html, workspace-chat-panel.types.ts |
| ova-job.service.ts | 264 | 152 | ova-job-sync.ts |
| ova-edit-view.component.ts | 232 | 65 | ova-edit-view.component.html |
| llm-task-row.component.ts | 226 | 75 | llm-task-row.component.html, llm-task-row.helpers.ts |
| profile-page.component.ts | 226 | 99 | profile-page.component.html |
| admin-roles.service.ts | 233 | 187 | admin-roles-api.helpers.ts |
| admin-roles-page.component.ts | 226 | 63 | admin-roles-page.component.html, admin-roles-page.helpers.ts |

## Verification

- `pnpm build` (frontend/): **PASS** (exit 0)
- All listed `.ts` files ≤200 lines (grep verified)
- Refactor-only; no behavior changes intended

## Criterio → test

| Criterio | Evidencia |
|----------|-----------|
| C3: ningún .ts >200 líneas en scope | grep count post-split |
| Build pasa | `pnpm build` exit 0 |
