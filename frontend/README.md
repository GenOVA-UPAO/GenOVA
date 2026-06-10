# GenOVA — Frontend

React 19 SPA for AI-assisted generation of Virtual Learning Objects (OVA) with SCORM 1.2 export.

## Stack

| Layer | Technology |
|---|---|
| Framework | React 19 (JSX transform — no `import React` needed) |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 (CSS variables, oklch color space) |
| UI Components | shadcn/ui v4 — Nova/Radix/Geist preset |
| Typography | Geist variable font (via Nova preset) |
| Routing | React Router 7 |
| Toasts | Sonner |
| Testing | cucumber-js (unit) · Playwright-BDD (e2e) |

## Project structure

```
src/
├── pages/          Pages mapped to routes (max 200 lines each)
├── components/     Shared components
│   ├── ui/         shadcn/ui primitives — do NOT edit manually
│   ├── admin/      Admin-specific components
│   ├── crear/      OVA creation flow
│   ├── engage/     Engage-phase viewer
│   └── labs/       AI labs components
├── hooks/          State logic (no UI)
├── services/       fetch() wrappers for API calls
├── lib/            Utilities: cn(), auth, permissions, http
└── layouts/        App shell (AppLayout) + Admin shell (AdminLayout)
```

## shadcn/ui components installed

| Component | File | Used for |
|---|---|---|
| `Button` | `ui/button` | All interactive actions |
| `Badge` | `ui/badge` | Status labels, version numbers, permissions |
| `Checkbox` | `ui/checkbox` | Multi-select; uses `onCheckedChange(bool)` |
| `Input` | `ui/input` | Text inputs |
| `Textarea` | `ui/textarea` | Multi-line inputs |
| `Select` | `ui/select` | Dropdowns; uses `onValueChange(value)` |
| `Label` | `ui/label` | Form field labels |
| `Dialog` | `ui/dialog` | Modals (replaces fixed-overlay divs) |
| `Alert` | `ui/alert` | Error / warning messages |
| `AlertDialog` | `ui/alert-dialog` | Destructive confirmations |
| `Table` | `ui/table` | Data tables (roles, users) |
| `Separator` | `ui/separator` | Visual dividers |
| `Tabs` | `ui/tabs` | Workspace mobile view toggle, tab panels |

## Adding a shadcn component

```bash
cd frontend
pnpm dlx shadcn@latest add <name>
# Then remove the generated "import * as React from 'react'" (React 19 doesn't need it)
```

## Conventions

### Imports — always direct, never barrel

```js
// correct
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'

// never create ui/index.js barrel
import { Button, Input } from '@/components/ui'
```

### Color — CSS variables, not hard-coded Tailwind colors

```jsx
// correct — uses --primary (indigo-600)
<Button>Save</Button>
<div className="border-primary/30 bg-primary/5">...</div>

// avoid
<button className="bg-indigo-600 hover:bg-indigo-700">Save</button>
```

`--primary` is mapped to `oklch(0.51 0.24 264)` (≈ indigo-600) in `index.css`.
`variant="default"` on Button/Badge renders in primary color automatically.

### Checkbox API

```jsx
// Radix Checkbox fires onCheckedChange(bool), not onChange(event)
<Checkbox checked={selected} onCheckedChange={() => toggle(id)} />
```

### Select API (compound)

```jsx
<Select value={val} onValueChange={(v) => setVal(v)}>
  <SelectTrigger><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="a">Option A</SelectItem>
  </SelectContent>
</Select>
```

When a hook expects a legacy `onChange(event)`, use an adapter:
```jsx
onValueChange={(val) => handler({ target: { value: val } })}
```

### Modals — Dialog, not fixed overlays

```jsx
// correct
<Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
  <DialogContent className="max-w-sm">
    <DialogHeader><DialogTitle>Title</DialogTitle></DialogHeader>
    {/* body */}
    <DialogFooter>...</DialogFooter>
  </DialogContent>
</Dialog>

// avoid
<div className="fixed inset-0 z-50 bg-black/40">...</div>
```

### Conditional rendering — ternary, not &&

```jsx
// correct
{error ? <Alert variant="destructive">{error}</Alert> : null}

// avoid
{error && <Alert variant="destructive">{error}</Alert>}
```

### No inline component definitions

```jsx
// correct — extract to module level
function Field({ label, children }) { ... }
export function MyForm() { return <Field label="Name">...</Field> }

// avoid — defines inside another component (new ref each render)
export function MyForm() {
  const Field = ({ label }) => <div>...</div>
}
```

## Line limit

ESLint enforces **max 200 lines** per file (`skipBlankLines: true`, `skipComments: true`).
Exemptions: test files, `AdminUsersPage.jsx`, `useUsersAdmin.js`, `wireframes/**`.

If a migration would push a file over 200, extract a sub-component.

## Color system

```css
/* index.css — light theme */
--primary:            oklch(0.51 0.24 264);   /* indigo-600 */
--primary-foreground: oklch(1 0 0);           /* white */
--background:         oklch(1 0 0);
--foreground:         oklch(0.145 0 0);
--muted:              oklch(0.97 0 0);
--muted-foreground:   oklch(0.556 0 0);
--border:             oklch(0.922 0 0);
--destructive:        oklch(0.577 0.245 27.325); /* red-600 */
```

## Dev commands

```bash
pnpm install        # install dependencies
pnpm dev            # Vite dev server -> http://localhost:5173
pnpm build          # production build
pnpm lint           # ESLint (must be 0 errors)
pnpm format         # Prettier check
pnpm test:unit      # cucumber-js unit tests (no browser, no backend)
pnpm test:e2e       # Playwright BDD (requires frontend + backend running)
```

## Code-splitting

Heavy routes are already code-split via `React.lazy()` in `App.jsx`:
`CrearOvaPage`, `EditarOvaPage`, `MisOvasPage`, `PapeleraPage`,
`ProfilePage`, `EngagePage`, `ExplorePage`, `AdminRolesPage`,
`AdminUsersPage`, `LabsPage`.

Auth pages (`LoginPage`, `RegisterPage`) and `DashboardPage` are eagerly loaded
so first-paint on the login screen is fast.
