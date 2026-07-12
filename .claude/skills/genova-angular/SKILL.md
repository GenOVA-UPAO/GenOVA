---
name: genova-angular
description: GenOVA-specific Angular frontend conventions — screaming architecture (features/<domain> vs core/), standalone+OnPush+zoneless+inject(), Signal Forms, SpartanUI (libs/ui + gn-* wrappers), and quality gates (250 lines, strict ESLint, responsive). Complements the official angular-developer skill (which covers the general Angular API); this skill covers the project's own convention layer. Use when creating or reviewing frontend components, services, pages, or features.
metadata:
  author: GenOVA local
  version: '1.0'
  source: local/genova
---

# GenOVA Angular Conventions

**Language:** Reason and write instructions in English. Produce all user-facing output
in Spanish — chat replies, specs (`sdd/specs/`), docs (`docs/`), progress notes, backlog,
commit messages. Never translate literal protocol tokens. See `AGENTS.md` §Language policy.

This skill documents how Angular is used **in GenOVA specifically** — not the general
Angular API (for that, the already-installed `angular-developer` skill has 37
references covering signals, forms, DI, routing, SSR, testing, etc.). Use that skill first
for "how does Angular do X?"; use this skill for "how do we do it in GenOVA?".

## Before writing code

1. Locate the right domain: is it cross-cutting (`core/`) or feature-owned
   (`features/<domain>/`)? Read [screaming-architecture.md](references/screaming-architecture.md).
2. Follow the real component/service patterns in use (standalone, OnPush,
   zoneless, `inject()`, signals). Read [components-and-state.md](references/components-and-state.md).
3. If the component has a form: use Signal Forms (`@angular/forms/signals`),
   not Reactive/Template forms. Read [signal-forms.md](references/signal-forms.md).
4. If you need a UI primitive: check `libs/ui/` (SpartanUI helm) before creating
   a new one. Read [design-system.md](references/design-system.md).
5. Before closing the task: verify the quality gates (lines, lint,
   responsive). Read [quality-gates.md](references/quality-gates.md).

## Quick rules (summary)

- Components: standalone, `changeDetection: ChangeDetectionStrategy.OnPush`,
  `inject()` (never constructor DI for dependencies), selector `gn-*`.
- State: `signal()`/`computed()`/`.asReadonly()`; server state via TanStack
  Query (`@tanstack/angular-query-experimental`); zoneless — don't assume zone.js.
- Forms: Signal Forms (`form()`, `FormField`, `[formField]`).
- Layers: `services/*.ts` (fetch via `core/lib/http.ts`, signals) → layout
  pages/components. Pages **never** call `fetch`/`apiFetch` directly.
- Screaming architecture: `features/<domain-kebab>/{pages,components,lib,services}`;
  `core/` only cross-cutting code (auth, http, shared ui); never domain-specific
  logic inside `core/`.
- 250-line limit per `.ts` file (`.html` exempt, tests exempt).
- Never NgModules, never React-style hooks.

## When something doesn't fit

If a convention here doesn't apply to the current task (e.g. legacy code that hasn't
migrated yet), flag the inconsistency instead of silently going along with it — don't
replicate the old pattern in new code.
