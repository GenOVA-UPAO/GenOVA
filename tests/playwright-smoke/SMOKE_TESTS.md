# GenOVA — Playwright Smoke Tests

Ejecutados por el agente `.claude/agents/qa-smoketest.md` via `playwright-cli`.

## Entornos

| Env | Frontend | Backend |
|-----|----------|---------|
| **develop** | `https://gen-ova-frontend-git-develop-gen-ova-s-projects.vercel.app` | `https://genova-backend-develop.up.railway.app` |
| **prod** | `https://gen-ova-frontend.vercel.app` | `https://genova-backend-production.up.railway.app` |

> **Nota:** Las URLs de preview de Vercel están protegidas con deployment protection.
> Para testear `develop` con playwright-cli, el usuario debe:
> (a) Deshabilitar temporalmente deployment protection en el dashboard de Vercel, o
> (b) Configurar `VERCEL_AUTOMATION_BYPASS_SECRET` en el proyecto y pasarlo como header
>     `x-vercel-protection-bypass: <secret>` via `playwright-cli route`.
> Si develop está protegido, el agente `qa-smoketest` corre los bloques A-E contra **prod** y avisa.

## Cuentas seed

| Email | Password | Rol esperado |
|-------|----------|-------------|
| `admin@genova.ai` | `admin1234password` | administrador |
| `user@genova.ai` | `user1234password` | usuario |

---

## Bloque A — Admin: autenticación base

**Objetivo:** verificar login correcto y que el rol admin es reconocido desde el primer momento.

```
A-1  Login admin@genova.ai → URL /dashboard, badge "ADMIN" visible en sidebar
A-2  cookie-list → genova_token presente, dominio correcto
A-3  requests → /api/auth/me → 200, body.role === "administrador"
A-4  Sidebar snapshot → sección ADMINISTRACION visible (Roles / Usuarios / Labs)
```

**PASS si:** sidebar muestra badge "ADMIN" y sección Administración visible.

---

## Bloque B — Admin: navegación completa (reproduce bug cambio de rol)

**Objetivo:** recorrer todas las páginas y confirmar que el rol no cambia en ningún punto.
Cada paso hace in-app navigation (click en sidebar) y verifica el badge ADMIN.

```
B-1  Navegar a /mis-ovas             → badge ADMIN persiste
B-2  Navegar a /crear-ova            → badge ADMIN persiste
B-3  Navegar a /modelos              → badge ADMIN persiste
B-4  Navegar a /admin/users          → página carga, fila propia dice "PROTEGIDO"
B-5  Navegar a /admin/roles          → página carga, badge ADMIN persiste
B-6  Navegar a /admin/labs           → página carga, badge ADMIN persiste
B-7  Navegar a /profile              → badge "Administrador" en cabecera perfil
B-8  Volver a /dashboard             → badge ADMIN persiste
```

**PASS si:** badge ADMIN visible en sidebar en todos los pasos B-1..B-8.

---

## Bloque C — Admin: interacciones mutantes

**Objetivo:** acciones que modifican datos del servidor no deben alterar el rol.

```
C-1  En /profile: editar nombre completo → guardar → badge ADMIN sin cambio
C-2  En /admin/users: escribir en campo buscar → badge ADMIN sin cambio
C-3  En /admin/users: cambiar rol de otro usuario (no el propio) → badge ADMIN sin cambio
```

**PASS si:** después de cada mutación, /api/auth/me sigue devolviendo role = "administrador".

---

## Bloque D — Logout / re-login

**Objetivo:** el ciclo logout→login restaura el estado admin correctamente.

```
D-1  Logout (click botón salir) → redirige a /login, genova_token eliminada del cookie
D-2  Re-login admin@genova.ai → badge ADMIN restaurado
D-3  Direct URL goto /admin/users → página carga sin blank (fix LazyMotion verificado)
```

**PASS si:** después de D-2, sidebar admin section visible; D-3 no muestra pantalla en blanco.

---

## Bloque E — Nueva cuenta (registro)

**Objetivo:** cuenta nueva obtiene rol no-admin y no puede acceder a rutas admin.

```
E-1  Ir a /register (sin sesión) → formulario visible
E-2  Registrar test-{timestamp}@playwright.test con password "Playwright2026!" → OK
E-3  /api/auth/me → role !== "administrador" (debe ser "usuarios_prueba" u otro)
E-4  Intentar /admin/users → redirige a /dashboard (bloqueado)
E-5  /crear-ova → formulario accesible
E-6  Sidebar → sin sección ADMINISTRACION
```

**PASS si:** E-3 role no es admin, E-4 redirige, E-6 sin sección admin.

---

## Bloque F — Producción: conexión frontend ↔ backend (post-merge)

**Objetivo:** smoke mínimo tras merge a main, confirmar que frontend prod habla con backend prod.

```
F-1  curl /health en backend prod → {"status":"ok"}
F-2  Login admin en frontend prod → POST /auth/login → 200
F-3  Dashboard → GET /api/ovas?page=1&limit=6 → 200
F-4  Logout → genova_token eliminada
```

**PASS si:** F-1 health OK, F-2 login 200, F-3 ovas 200.

---

## Screenshots de evidencia

El agente guarda screenshots en `tests/playwright-smoke/screenshots/`:

| Archivo | Momento |
|---------|---------|
| `A-login.png` | Dashboard post-login admin |
| `B-admin-users.png` | /admin/users con fila PROTEGIDO |
| `B-profile.png` | /profile badge Administrador |
| `C-post-save.png` | Después de guardar perfil |
| `D-relogin.png` | Dashboard tras re-login |
| `E-register.png` | Registro nueva cuenta |
| `E-blocked.png` | Redirect bloqueado de /admin/users |
| `F-prod-dashboard.png` | Dashboard producción |
