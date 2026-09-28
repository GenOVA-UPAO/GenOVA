# Frontend — GenOVA

Frontend de la plataforma GenOVA desarrollado con React 19 y Vite 8.

## Stack tecnológico

- **Framework**: React 19.3 + React Compiler (`babel-plugin-react-compiler`)
- **Herramienta de compilación**: Vite 8 + `@tailwindcss/vite`
- **Enrutamiento**: React Router 8 (data router con loaders, lazy loading y guards)
- **Gestión de estado del servidor**: TanStack Query 5
- **Estilos**: Tailwind CSS 4 + `tw-animate-css`
- **Componentes UI e iconos**: primitivas Radix UI (`radix-ui`), Phosphor Icons vía `<Icon />`, toasts con Sonner
- **Validación**: Zod
- **Testing**: Vitest + JSDOM + Testing Library (`@testing-library/react`)
- **Linting y formateo**: ESLint 9 (flat config) + Prettier 3

## Scripts disponibles

Desde `frontend/` (`pnpm <comando>`) o desde la raíz del monorepo
(`pnpm --filter frontend <comando>`). La raíz también expone alias:
`pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test:vitest`.

| Comando             | Descripción                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pnpm dev`          | Vite en `http://localhost:4200` con proxy `/api` y `/auth` a FastAPI (`http://127.0.0.1:8000` por defecto) |
| `pnpm build`        | Compila la aplicación para producción en `dist/`                                                           |
| `pnpm preview`      | Previsualiza el build en el puerto 4200                                                                    |
| `pnpm test`         | Tests de componente con Vitest (`src/**/*.spec.{ts,tsx}`)                                                  |
| `pnpm test:watch`   | Modo observador interactivo de Vitest                                                                      |
| `pnpm typecheck`    | Chequeo estático de tipos (`tsc -b --noEmit`)                                                              |
| `pnpm lint`         | ESLint                                                                                                     |
| `pnpm lint:fix`     | Correcciones automáticas de ESLint                                                                         |
| `pnpm format`       | Formatea con Prettier                                                                                      |
| `pnpm format:check` | Verifica el formato sin modificar archivos                                                                 |

## Estructura de carpetas (`src/`)

```
src/
├── main.tsx             # Punto de entrada (QueryClient + RouterProvider)
├── styles.css           # Entrada de Tailwind
├── test-setup.ts        # Entorno Vitest + JSDOM
├── app/                 # Composición de la aplicación
│   ├── router.tsx       # Rutas, lazy loading y loaders/guards
│   ├── pages.ts         # Registro de imports dinámicos por página
│   ├── root-layout.tsx  # Layout raíz (providers, navegación, toasts)
│   ├── route-error.tsx  # Límite de errores de ruta
│   └── layout/          # Shell autenticado (sidebar, navbar)
├── core/                # Capa transversal (una feature no importa de otra)
│   ├── auth/            # Guards (requireAuth, requireAdmin, requireGuest) y store
│   ├── components/      # Primitivas UI (Radix) y registro de iconos (<Icon />)
│   ├── lib/             # apiFetch / apiJson (cookies httpOnly) y utilidades
│   ├── hooks/           # Hooks compartidos
│   ├── services/        # Clientes HTTP transversales
│   └── theme/           # Tema claro/oscuro
└── features/            # Dominios de negocio
    ├── auth/            # Login, registro, recuperación, verificación
    ├── ova-library/     # Dashboard, Mis OVAs, papelera
    ├── ova-workspace/   # Crear/editar OVA, explore, engage
    ├── admin/           # Usuarios y roles
    ├── profile/         # Perfil
    ├── analytics/       # Analítica
    └── llm-settings/    # Modelos de IA y claves
```

Cada feature suele organizar `api/`, `hooks/`, `components/`, `lib/` y `pages/`.

## Convenciones de código y ESLint

- **Fronteras arquitectónicas** (`eslint-plugin-boundaries`):
  - Una feature solo puede importar de sí misma y de `@/core/*`.
  - Prohibido importar código de otra feature.
  - La capa `core/` no puede depender de ninguna feature ni de `app/`.
- **Sin barrel files** (`eslint-plugin-no-barrel-files`): importar siempre del archivo fuente.
- **Un componente por archivo** (`react/no-multi-comp`): cada `.tsx` exporta un único componente (excepto variantes en `core/components/ui/`).
- **Nombres en kebab-case**: archivos y carpetas dentro de `src/`.
- **Fuentes únicas de UI e iconos**: en `features/` y `app/` no se importan `radix-ui` ni `@phosphor-icons/react`; se usan `@/core/components/ui/*` y `<Icon name="..." />`.
- **Límites**: funciones ≤ 80 líneas, archivos ≤ 250 líneas, complejidad ≤ 10, profundidad ≤ 3, máximo 4 parámetros.
- **Accesibilidad**: botones solo-icono con `aria-label`, inputs con `<label>`, selects controlados.

## Variables de entorno

Se inyectan en build/serve desde `vite.config.ts` (`process.env` y `frontend/.env*`):

- `GENOVA_API_BASE_PROD`: URL del backend en producción.
- `GENOVA_API_BASE_DEVELOP`: URL del backend en desarrollo/staging.
- `GENOVA_API_BASE_URL`: (opcional) sobrescribe `prod` y `develop`.
- `GENOVA_DEV_BACKEND`: destino del proxy de Vite en `pnpm dev`. Por defecto
  `http://127.0.0.1:8000`. En Docker Compose se fija a `http://backend:8000`.
  Para un backend determinista (`LLM_FAKE=1` en `:8100`):

  ```bash
  GENOVA_DEV_BACKEND=http://127.0.0.1:8100 pnpm dev --port 4300
  ```

En desarrollo local en `:4200` no hace falta definir las bases de API: Vite
redirige `/api` y `/auth` al backend del proxy.

## Pruebas

Las pruebas de componente corren con Vitest y Testing Library sobre `jsdom`:

```bash
pnpm test
# desde la raíz del repo:
pnpm test:vitest
```

Los archivos de prueba viven junto al código (`*.spec.ts` / `*.spec.tsx`).
La suite e2e (playwright-bdd) y el detalle de `LLM_FAKE=1` están en
[`tests/README.md`](../tests/README.md).
