# Quality gates — frontend

Source of truth: `CHECKPOINTS.md` (C2, C3, C9-C13) + `frontend/eslint.config.mjs`.

## Line limit (C3)

- `.ts` files under `frontend/src/`: **≤250 lines** (skipBlankLines,
  counts comments). Enforced by ESLint (`max-lines`).
- **Exempt**: `.html` templates, and everything under `*.spec.ts` / tests.
- If a file is about to exceed the limit: split into sub-components, extract
  logic into a `lib/` or `service`, or split into several files by responsibility
  — don't disable the rule or skip the split.

## ESLint (C2)

Real config in `frontend/eslint.config.mjs` — `typescript-eslint` in
`strictTypeChecked` + `stylisticTypeChecked` mode, `angular-eslint` `tsRecommended`,
plus `prettier` as a lint rule (formatting = a lint error, not just style).

Rules **deliberately relaxed** (don't turn them on without a reason, but don't
assume they're wrong when you see them in the code either): `no-explicit-any`,
`no-non-null-assertion`, `no-unsafe-*` — off because the API/DOM/dynamic-form
boundaries need them. Don't use this as an excuse for
`any` in new business logic; reserve it for real boundaries.

Hard rules that always apply: `unused-imports/no-unused-imports`,
`simple-import-sort/imports` and `/exports`, `prettier/prettier`.

`libs/ui/**` is excluded from the app's lint (see `design-system.md`).

## Responsive (C13)

- Tailwind responsive classes (`sm:`/`md:`/`lg:`), mentally test at
  320/768/1280px.
- Tables: `overflow-x-auto` + `min-w` instead of fixed layout.
- Modals: bottom-sheet on mobile.
- Touch targets ≥44px.
- Images: `aspect-ratio`/`object-cover`/`srcset` instead of fixed px sizes.
- Scalable typography, no fixed sizes that break on small screens.

## Dead code (C11)

0 `no-unused-imports`/`no-unused-vars` from ESLint; no debug
`print`/`console.log`; no `TODO`/`FIXME` without owner/context; no commented-out
code; no unreachable branches; no unused barrel exports.

## Before closing any frontend task

Run `pnpm lint` and `pnpm typecheck` (uses `ngc`, not `tsc` — also validates
templates) — compiling isn't enough, `ngc` can fail on templates even when
`tsc` passes.
