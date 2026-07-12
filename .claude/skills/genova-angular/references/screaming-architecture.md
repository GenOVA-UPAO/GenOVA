# Screaming architecture — frontend

See also `docs/arquitectura-frontend-deuda.md` (documented technical debt) and
`CHECKPOINTS.md` C7/C9.

## Rule

Folder structure must scream the **business domain**, not the tech stack.
The domain root is `frontend/src/features/`.

```
frontend/src/
  app/            # shell: app.config.ts, app.routes.ts, app.ts, layout/
  core/           # ONLY cross-cutting: auth, http, shared ui, directives
  features/
    admin/
    analytics/
    auth/
    llm-settings/
    ova-library/
    ova-workspace/
    profile/
```

Each `features/<domain-kebab>/` follows the same internal layout:
`{components, lib, pages, services}`.

## What belongs in `core/`

Only what's genuinely cross-cutting to all features: `core/auth/` (session),
`core/lib/http.ts` (fetch wrapper), `core/lib/cn.ts`, `core/lib/toast.ts`,
`core/components/ui/` (`gn-*` wrappers reused by ≥2 features), `core/directives/`.

Domain-specific logic (e.g. LLM logic, OVA logic, analytics logic) must **not**
live in `core/` — that goes to its `features/<domain>/`. If you find such code in
`core/`, it's documented technical debt — don't replicate it, and if the task
touches it, propose moving it to the right domain.

## Layers within a feature

`services/*.ts` (HTTP via `core/lib/http.ts`, expose signals) → layout
pages/components that consume those signals.

- **Pages never call `fetch`/`apiFetch` directly** — always through
  a service.
- `page/*` **never** imports another `page/*` — page composition goes through
  routing (`app.routes.ts`), not direct import.
- `services/*.ts` don't know about components or templates — only HTTP + state.

## Real examples

- `frontend/src/features/ova-workspace/` — a complete domain with its 4 subfolders.
- `frontend/src/core/lib/http.ts` — the single `fetch` entry point with `credentials: 'include'`.
- `frontend/src/core/auth/auth.service.ts` — legitimate cross-cutting (session
  is used by every feature).

## When creating a new feature

1. Folder name in kebab-case describing the **domain**, not the technology
   (`ova-library` yes, `views` or `http-stuff` no).
2. Create the 4 subfolders only if they'll actually be used (don't create an
   empty `lib/` out of convention).
3. If new code needs something from another feature, evaluate whether it's
   really cross-cutting (→ `core/`) or whether two domains are being coupled
   that shouldn't know about each other directly.
