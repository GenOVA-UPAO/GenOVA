# Design system — SpartanUI (helm)

GenOVA migrated from PrimeNG to **SpartanUI** as its design system (see memory
`genova-primeng-to-spartan-migration`). PrimeNG is removed from the project.

Official Spartan model (spartan.ng):

- **`spartan/ui/brain`** (`@spartan-ng/brain`) — unstyled accessible primitives
  (ARIA, keyboard, focus). Installed via npm; do not fork lightly.
- **`spartan/ui/helm`** — styled, **copy-paste / vendored** Tailwind components
  you own. In GenOVA they live under `frontend/libs/ui/` and resolve as
  `@spartan-ng/helm/*`.

## Where primitives live

- `frontend/libs/ui/` — vendored helm primitives, one per folder:
  `alert, badge, button, card, checkbox, dialog, dropdown-menu, input, input-otp,
  label, popover, select, separator, skeleton, sonner, spinner, table, tabs,
  tooltip, typography, utils`.
- Each primitive: `<name>/src/index.ts` + `src/lib/hlm-*.ts`.
- Interactive primitives wrap `Brn*` from brain and style via `cva()`
  (class-variance-authority).
- **Typography** exports **string class tokens** (`hlmH1`, `hlmLead`, `hlmP`, …),
  not components — use in templates via `` class="${hlmH1}" `` (template literal
  in the `@Component` decorator) or `[class]="hlmH1"`.
- `frontend/components.json`: `componentsPath: "libs/ui"`,
  `importAlias: "@spartan-ng/helm"`, `style: "nova"`.
- Path mapping: root `frontend/tsconfig.json` lists each `@spartan-ng/helm/<name>`;
  `tsconfig.app.json` / `spec` use the wildcard `libs/ui/*/src/index.ts`.
  **When adding a new helm folder, add the explicit path in `tsconfig.json`.**
- **`libs/ui/**` is excluded from the app's ESLint** (`eslint.config.mjs`) — vendored
  code, not linted with `frontend/src/` strict rules.

### Adding a component

Prefer the Spartan CLI over hand-rolling:

```bash
ng g @spartan-ng/cli:ui
ng g @spartan-ng/cli:ui-theme   # theme / radius prompts
```

Then ensure `tsconfig.json` paths and `libs/ui/<name>` exist. Do not npm-install
a second copy of helm that bypasses `libs/ui`.

## Application wrappers

Beyond `libs/ui/`, thinner GenOVA wrappers live in
`frontend/src/core/components/ui/*.component.ts` (button, dialog, badge, table,
tabs, …) with the `gn-` prefix. They are cross-cutting → allowed under `core/`,
and **are** linted.

**Before creating a new UI component**: check `libs/ui/` then `gn-*`. Don't duplicate.

## Style utilities

- `cn()` (`core/lib/cn.ts`) — `clsx` + `tailwind-merge`.
- `cva()` — variants (see `libs/ui/button`).
- Tailwind CSS 4 — tokens, not hardcoded hex in feature templates.

## Tokens and themes

**Canonical file:** `frontend/src/styles.css` (not a separate `index.css`).

- Imports: Tailwind layers, `@spartan-ng/brain/hlm-tailwind-preset.css`, CDK overlay,
  driver.js, Phosphor icons.
- `@custom-variant dark (&:is(.dark *));`
- `:root` — light chrome tokens (oklch).
- `.dark` — dark chrome tokens (keep **warm navy** tint + UPAO blue→orange charts;
  do not regress to generic gray chart ramps).
- `@theme inline` maps CSS variables to Tailwind color/font tokens
  (`--color-primary`, `--font-display`, `--color-accent-brand`, sidebar_*, …).

### Typography tokens (helm)

| Export | Typical use |
|---|---|
| `hlmH1` | Page titles (includes `font-display` in GenOVA's vendored string) |
| `hlmH2` / `hlmH3` / `hlmH4` | Section headings |
| `hlmLead` | Intro / supporting sentence under a title |
| `hlmP` | Body paragraphs |
| `hlmMuted` / `hlmSmall` / `hlmLarge` | Secondary text / brand chrome |
| `hlmBlockquote` / `hlmUl` / `hlmCode` | Prose blocks |

Base CSS also forces `h1, .font-display` to Fraunces/Georgia stack — keep that
aligned with helm H1 (don't fight it with Inter/Roboto).

## Palettes: chrome vs. OVA content

Two distinct palettes — **do not mix**:

- **App chrome** (nav, layout, admin, auth): "Editorial Académico UPAO" —
  warm paper, UPAO-blue primary (`oklch` ~ `#0A3D91`), orange `--accent-brand`
  (`~#F47A20`), serif display for titles. Tokens in `styles.css`.
  Never generic slate-only chrome; never emoji decoration in chrome.
- **Generated OVA content**: UPAO blue/orange/white via `backend/llm/themes.py`
  (server-side). Branding of *educational content*, separate from chrome.

## Dark mode rules

- Toggle via `.dark` ancestor (variant already configured).
- Dark `--background` / `--sidebar` should keep a slight blue/warm hue
  (UPAO), not pure neutral `oklch(0.145 0 0)` slate.
- Charts in dark must preserve the blue→orange spectrum used in light
  (`--chart-1` … `--chart-5`), not a gray ladder.
- `--accent-brand` stays the orange accent for keylines / eyebrows.

## Composition guidelines (chrome)

1. Change look via **tokens**, not one-off utility colors on every page.
2. Prefer helm primitives + typography classes over custom CSS.
3. One job per section; brand/display type for H1; muted/lead for support.
4. Cards only when they wrap a real interaction (aligns with product design rules).
5. Respect `prefers-reduced-motion` (already in `styles.css`).

## Anti-patterns

- Reintroducing PrimeNG.
- Importing `@spartan-ng/helm/typography` without the `libs/ui/typography` path.
- Hardcoding `#0A3D91` in templates instead of `text-primary` / tokens.
- Using OVA content theme tokens for the app shell.
- Inventing a second design system folder outside `libs/ui` + `core/components/ui`.
