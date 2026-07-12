# Design system — SpartanUI (helm)

GenOVA migrated from PrimeNG to **SpartanUI** as its design system (see memory
`genova-primeng-to-spartan-migration`). PrimeNG is removed from the project.

## Where primitives live

- `frontend/libs/ui/` — vendored "helm" primitives, one per folder:
  `alert, badge, button, card, checkbox, dialog, dropdown-menu, input, input-otp,
  label, popover, select, separator, skeleton, sonner, spinner, table, tabs,
  tooltip, utils`.
- Each primitive: `<name>/src/index.ts` + `src/lib/hlm-<name>.ts` — a
  `Directive`/component that wraps the equivalent `Brn*` from `@spartan-ng/brain`
  and applies styles via `cva()` (class-variance-authority).
- `frontend/components.json`: `componentsPath: "libs/ui"`,
  `importAlias: "@spartan-ng/helm"`, `style: "nova"`.
- **`libs/ui/**` is excluded from the app's ESLint** (`eslint.config.mjs`) — it's
  vendored code, not linted with `frontend/src/`'s strict rules.

## Application wrappers

Beyond `libs/ui/`, there are finer own wrappers in
`frontend/src/core/components/ui/*.component.ts` (button, dialog, badge, table,
tabs, etc.) with the `gn-` prefix. These do live under `core/` (they're
cross-cutting across features) and are linted with the normal rules.

**Before creating a new UI component**: check whether a primitive already
exists in `libs/ui/` or a `gn-*` wrapper in `core/components/ui/` that fits. Don't duplicate.

## Style utilities

- `cn()` (`core/lib/cn.ts`) for conditional class merging (wrapper over
  `clsx`/`tailwind-merge`).
- `cva()` (class-variance-authority) for component variants (see
  `libs/ui/button/src/lib/hlm-button.ts` as reference: variants
  default/outline/secondary/ghost/destructive/link, sizes xs–lg + icon).
- Tailwind CSS 4 — design tokens, not hardcoded values.

## Palettes: chrome vs. OVA content

Two distinct palettes, don't mix them (see memories `genova-chrome-design` and
`genova-ova-color-config`):

- **App chrome** (nav, layout, admin): "Editorial Académico UPAO" —
  warm paper, UPAO-blue primary, orange accent, serif display for titles.
  Tokens in `index.css`. Never use generic slate or hardcoded emoji in the chrome.
- **Generated OVA content**: UPAO blue/orange/white palette via
  `backend/llm/themes.py` (server-side, not a frontend token) — it's the
  branding of the *educational content*, separate from the chrome.
