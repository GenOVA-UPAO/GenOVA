# GENOVA

Monorepo base del proyecto GENOVA.

## Estructura principal

```text
GENOVA/
├── frontend/
├── backend/
├── docs/
├── specs/
└── scorm-template/
```

## Workspace con pnpm

Se usa `pnpm-workspace.yaml` para gestionar paquetes del monorepo:
- `frontend`
- `backend`

## Frontend base

Stack actual del frontend:
- React + Vite
- Tailwind CSS (vía `@tailwindcss/vite`)
- ESLint + Prettier
- React Router

## HU-004 implementada

Se dejó configurada la base del monorepo y arquitectura de frontend:
- Carpetas `frontend/`, `backend/`, `docs/`
- Workspace de pnpm en raíz
- React + Tailwind operativo
- ESLint con regla estricta `max-lines` en error (`max: 200`)
- Prettier configurado

## HU-010 implementada

Se maquetó el layout principal y enrutamiento modular:

### Rutas base
- `/login`
- `/dashboard`
- `/crear-ova`

### Layout responsivo
- `Navbar`
- `Sidebar`
- `MainContainer`

### Modularidad
Los componentes del layout están separados en módulos pequeños dentro de:
- `frontend/src/layout/components/`
- `frontend/src/layout/navigation/`
- `frontend/src/layouts/`

Ningún componente de layout supera el umbral de líneas definido por ESLint.

## Scripts de ejecución desde la raíz

```bash
pnpm install
pnpm dev
```

Scripts disponibles en raíz:
- `pnpm dev` → levanta frontend
- `pnpm build` → build frontend
- `pnpm lint` → lint frontend
- `pnpm format` → verificación Prettier en frontend

## SCORM template

Se mantiene una plantilla base en `scorm-template/` con `imsmanifest.xml`, `index.html` y `resources/styles.css` para empaquetado SCORM posterior.
