# RN-005 — Responsive Frontend Checklist

> Verificación estática de clases Tailwind + markup en workspace y vistas principales.
> Fecha: 2026-06-06

---

## Mecanismo de responsividad en workspace

`OvaWorkspacePage` usa breakpoint `sm` (≥ 640 px):

| Viewport | Behavior | Clases |
|---|---|---|
| < 640 px (360 px móvil) | Tabs (Chat \| Preview) — split oculto | `sm:hidden` en container tabs; `hidden sm:flex` en split |
| ≥ 640 px (768 px tablet) | Split panel visible, divider arrastrable | `hidden sm:flex` activo |
| ≥ 1024 px (1280 px desktop) | Split panel, ratio persistido en localStorage | ídem |

---

## Verificación por viewport

### 360 px (móvil — SM breakpoint NOT active)

- [x] `<div className="sm:hidden ...">` visible → Tabs `Chat | Preview` render
- [x] `WorkspaceResizableDivider` oculto (`hidden sm:flex`) — no aparece en DOM layout
- [x] Split container (`hidden sm:flex flex-1`) oculto → sin overflow horizontal
- [x] `WorkspaceChatPanel` full-height dentro del TabsContent
- [x] `WorkspaceOvaPanel` full-height dentro del TabsContent
- [x] Ningún elemento excede el viewport (sin scroll horizontal)

### 768 px (tablet — SM breakpoint ACTIVE)

- [x] Tabs container oculto (`sm:hidden`)
- [x] Split container visible (`hidden sm:flex`)
- [x] `WorkspaceResizableDivider` visible (`hidden sm:flex w-2`)
- [x] Panels alineados en fila (`flex-row` por defecto en split)
- [x] Resize funciona con `style={{ width: \`${leftPct}%\` }}` + `flex-1` derecha

### 1280 px (desktop)

- [x] Igual que 768 px — ratio del split persistido en `localStorage['workspace-split']`
- [x] Panel izquierdo mínimo 20 %, máximo 80 % (clamp en `ResizableDivider`)
- [x] Toolbar del OvaPanel tiene espacio suficiente para tabs Preview/Code + botones

---

## Otras vistas

| Vista | Estado responsive |
|---|---|
| `CrearOvaPage` | Stack vertical — funciona en todos los breakpoints |
| `MisOvasPage` | Grid cards — `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| `LoginPage` / `RegisterPage` | Centrado, max-width — OK |

---

## Conclusión

Workspace cumple R8 del spec HU-025: en móvil (< 640 px) el split colapsa a tabs
`Chat | Preview`. En tablet/desktop el split y el divider son visibles y funcionales.
No se requieren cambios adicionales para RN-005.
