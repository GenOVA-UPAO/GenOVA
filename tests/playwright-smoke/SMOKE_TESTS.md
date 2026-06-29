# GenOVA — Playwright Smoke Tests

Tests manuales ejecutados con `playwright-cli` contra producción o develop.
Última exploración: 2026-06-26 (producción — `https://gen-ova-frontend.vercel.app`).

## Entornos

| Env | Frontend | Backend |
|-----|----------|---------|
| **develop** | `https://gen-ova-frontend-git-develop-gen-ova-s-projects.vercel.app` | `https://genova-backend-develop.up.railway.app` |
| **prod** | `https://gen-ova-frontend.vercel.app` | `https://genova-backend-production.up.railway.app` |

> **Nota:** Las URLs de preview de Vercel están protegidas con Deployment Protection.
> Para testear `develop` con playwright-cli, el usuario debe desactivar temporalmente la
> protección en el Vercel dashboard, o configurar `VERCEL_AUTOMATION_BYPASS_SECRET`.

## Cuentas seed

| Email | Password | Rol esperado |
|-------|----------|-------------|
| `admin@genova.ai` | `admin1234password` | administrador |
| `user@genova.ai` | `user1234password` | usuario |

## Bug rol admin en direct URL reload — CORREGIDO (2026-06-26)

**Síntoma:** Al hacer reload completo de página (direct URL) logueado como admin, el sidebar
mostraba brevemente "U / Usuario GenOVA / Usuario" y ocultaba la sección Administracion hasta
que `/api/auth/me` resolvía; intermitentemente se quedaba pegado en rol "Usuario" (promesa
compartida envenenada por fallo transitorio) y AdminRoute podía redirigir a un admin a /dashboard.

**Fix (commit cdb0bc9):** cache SWR persistente en `me.js` (sessionStorage). `getCachedUser()`
siembra el estado inicial sincrónicamente (sin flash, rol correcto) y `getCurrentUser()`
revalida en background con fallback al user cacheado en fallo transitorio. SidebarMenu/Navbar/
AdminRoute siembran desde cache y nunca sobrescriben con null. El bloque V verifica la regresión.

---

## Bloque A — Auth: Login admin

**Objetivo:** verificar login correcto y reconocimiento inmediato del rol admin.

```
A-1   playwright-cli open https://gen-ova-frontend.vercel.app
      → URL redirige a /login automáticamente
      → snapshot: heading "Iniciar sesión", textbox Correo, textbox Contraseña

A-2   playwright-cli fill <correo> "admin@genova.ai"
      playwright-cli fill <contraseña> "admin1234password"
      playwright-cli click <Entrar>
      → URL /dashboard, heading "Bienvenido, Administrador"

A-3   playwright-cli cookie-list
      → genova_token presente (httpOnly, dominio correcto)

A-4   playwright-cli requests → buscar GET /api/auth/me → status 200
      playwright-cli response-body <N> → body.role === "administrador"

A-5   Sidebar: sección "Administracion" visible con links Roles / Usuarios
      Sidebar: profile card muestra "AG", "Administrador GenOVA", "Admin", "admin@genova.ai"

A-6   Dashboard: stats "OVAs Creadas: 26", "En Progreso: 0", "Listas: 6"
      Actividad reciente: al menos 4 OVAs listados con link "Editar"
      Panel de administración: tarjetas Roles / Usuarios visibles
```

**PASS si:** A-2 llega a /dashboard, A-3 cookie presente, A-4 role=administrador, A-5 sidebar admin.

---

## Bloque B — Auth: Login usuario regular

**Objetivo:** login con cuenta no-admin muestra solo sección Principal.

```
B-1   playwright-cli fill <correo> "user@genova.ai"
      playwright-cli fill <contraseña> "user1234password"
      playwright-cli click <Entrar>
      → URL /dashboard, heading "Bienvenido, Usuario"

B-2   Sidebar: "U", "Usuario GenOVA", "usuario" en card perfil
      Sidebar: sin sección "Administracion" (ni Roles ni Usuarios)

B-3   playwright-cli goto /admin/users → redirige a /dashboard (403/redirect)
      playwright-cli goto /admin/roles → redirige a /dashboard
```

**PASS si:** B-2 sin sección admin, B-3 todos redirigen.

---

## Bloque C — Auth: Logout y limpieza de sesión

**Objetivo:** logout elimina cookie y bloquea rutas protegidas.

```
C-1   playwright-cli click <Menu de usuario> (avatar AG en top-right)
      → menú: botones "Apariencia" y "Cerrar sesión"

C-2   playwright-cli click <Cerrar sesión>
      → URL /login

C-3   playwright-cli cookie-list
      → sin cookies (genova_token eliminada)

C-4   playwright-cli localstorage-list
      → genova_session eliminada (solo puede quedar genova_rc con prefs)

C-5   playwright-cli goto /dashboard
      → redirige a /login (no se accede sin sesión)

C-6   playwright-cli goto /mis-ovas   → /login
      playwright-cli goto /crear-ova  → /login
      playwright-cli goto /profile    → /login
      playwright-cli goto /papelera   → /login
      playwright-cli goto /admin/users → /login
```

**PASS si:** C-2 en /login, C-3 sin cookie, C-5 y C-6 todos redirigen a /login.

---

## Bloque D — Auth: Credenciales incorrectas y seguridad

**Objetivo:** verificar mensajes de error y que no se expone información sensible.

```
D-1   Login con password incorrecto ("wrongpassword123") para admin@genova.ai
      → body contiene "Credenciales inválidas." (no "usuario no existe")
      → URL permanece en /login

D-2   Login con email inexistente ("noexiste@genova.ai") + cualquier password
      → mismo mensaje "Credenciales inválidas." (sin enumeration por timing)
      → URL permanece en /login

D-3   playwright-cli requests → POST /auth/login → status 401
      body NO contiene detalles de BD ni stack trace

D-4   Campo contraseña: botón "Mostrar contraseña" alterna visibility
      → input type cambia de password a text y viceversa
```

**PASS si:** D-1 y D-2 mismo mensaje genérico, D-3 no filtra internos.

---

## Bloque E — Auth: Registro de nueva cuenta

**Objetivo:** el registro crea cuenta con rol no-admin y valida email.

```
E-1   playwright-cli goto /register (sin sesión)
      → formulario: Nombre completo, Correo, Contraseña
      → link "Iniciar sesión" presente

E-2   Intentar registrar con TLD inválido: "test@playwright.test"
      → POST /auth/register → 422
      → UI muestra "No se pudo completar el registro."

E-3   Registrar con email real: "testsmoke-{timestamp}@mailinator.com"
      Nombre: "Test Smoke User", Password: "Playwright2026!"
      → POST /auth/register → 200 → redirige a /dashboard

E-4   Sidebar: "TS", "Test Smoke User", "usuarios_prueba" (rol auto-asignado)
      Sidebar: sin sección "Administracion"

E-5   playwright-cli goto /admin/users → redirige a /dashboard
      playwright-cli goto /admin/roles → redirige a /dashboard

E-6   playwright-cli goto /crear-ova → accesible (status 200, formulario visible)
      playwright-cli goto /mis-ovas   → accesible (Biblioteca de OVAs)
      playwright-cli goto /papelera   → accesible
      playwright-cli goto /profile    → accesible
```

**PASS si:** E-3 registro OK, E-4 rol usuarios_prueba, E-5 admin bloqueado, E-6 rutas normales OK.

---

## Bloque F — Auth: Recuperación de contraseña

**Objetivo:** flujo de reset-password no filtra tokens ni usuarios.

```
F-1   playwright-cli goto /recuperar-contrasena (sin sesión)
      → heading "Restablecer contraseña"
      → textbox Correo, button "Enviar enlace"

F-2   Desde /login → click "¿Olvidaste tu contraseña?"
      → redirige a /recuperar-contrasena

F-3   Enviar con email registrado (admin@genova.ai)
      → POST /auth/reset-password → 200
      → UI: "Si el correo electrónico está registrado en GenOVA, recibirás un enlace"
      → NO se revela si el email existe o no (anti-enumeration)

F-4   Enviar con email NO registrado (noexiste@genova.ai)
      → mismo mensaje genérico (no indica si existe o no)

F-5   playwright-cli requests → response body NO contiene el reset token
```

**PASS si:** F-3 y F-4 mismo mensaje, F-5 token no expuesto.

---

## Bloque G — Dashboard: contenido y navegación

**Objetivo:** dashboard admin muestra stats correctos y permite navegar.

```
G-1   Logueado como admin → /dashboard
      heading "Bienvenido, Administrador" visible
      Texto "UPAO - GenOVA ML" visible

G-2   Stats: "OVAs Creadas" muestra número > 0
      Stats: "En Progreso" muestra número (puede ser 0)
      Stats: "Listas" muestra número de OVAs con status done

G-3   Actividad reciente: lista ≥ 1 OVA con título, fecha, autor, badge estado
      Link "Ver todas" navega a /mis-ovas

G-4   Cada OVA en actividad reciente tiene link "Editar" → /ova/:id/workspace

G-5   Panel de administración (solo admin): tarjetas Roles, Usuarios
      Click en tarjeta "Usuarios" → navega a /admin/users

G-6   Botón "Crear OVA" en header → /crear-ova
      Botón "Crear OVA" en body → /crear-ova

G-7   Logo "GenOVAML" en header → /dashboard
```

**PASS si:** G-2 stats no vacíos, G-3 actividad visible, G-5 admin panel visible, G-6 Crear OVA funciona.

---

## Bloque H — Mis OVAs: listado y paginación

**Objetivo:** lista completa de OVAs con controles funcionales.

```
H-1   Navegar a /mis-ovas via sidebar (in-app nav)
      heading "Biblioteca de OVAs"
      "Total: 26 OVAs" visible (número puede variar)

H-2   Primera página: 9 OVAs listados, cada uno con:
      título, badge estado (Listo/Borrador/etc), versión (v1/v2), autor "Por: X", fecha

H-3   Cada OVA tiene botones: Editar, Metadatos, Duplicar, Descargar, Papelera

H-4   Paginación: "Página 1 de 3", botón "Anterior" disabled, botón "Siguiente" activo
      Click "Siguiente" → "Página 2 de 3", botón "Anterior" activo

H-5   Checkbox "Seleccionar todos en esta página" → selecciona todos los OVAs de la página

H-6   Search: escribir "Regresión" en textbox → lista filtra (no recarga página)
      Limpiar búsqueda → vuelve lista completa

H-7   Filtro estado: combobox "Todos los estados" → opciones: Borrador, Generando, Listo, Error
      Seleccionar "Listo" → "Total: 12 OVAs" (número puede variar)

H-8   Admin: ve OVAs de todos los usuarios (col "Por:" muestra distintos autores)
      Usuario regular: solo ve sus propios OVAs

H-9   Sidebar muestra badge con contador de papelera (ej: "Papelera 2")
```

**PASS si:** H-2 OVAs visibles con campos, H-3 todos los botones presentes, H-4 paginación funciona,
H-6 búsqueda filtra, H-7 filtro por estado funciona.

---

## Bloque I — Mis OVAs: acciones por OVA

**Objetivo:** cada acción por OVA funciona correctamente.

```
I-1   Botón "Metadatos" → modal "Editar metadatos"
      Modal: textbox Título (contador X/100), textbox Descripción
      Botones: Cancelar, Guardar
      Escape cierra modal

I-2   Modal Metadatos: editar título y guardar → PATCH /api/ovas/:id → 200
      Lista actualiza título sin recargar página completa

I-3   Botón "Editar" → navega a /ova/:id/workspace

I-4   Botón "Duplicar" → POST duplicar endpoint → OVA aparece en lista
      (puede requerir recargar lista)

I-5   Botón "Descargar" → GET /api/ovas/:id/export-scorm → 200
      → signed URL de Supabase Storage → descarga .zip

I-6   Botón "Papelera" → mueve OVA a papelera (soft delete)
      → OVA desaparece de lista, contador papelera incrementa

I-7   Checkbox individual: seleccionar varios OVAs → acción masiva visible
```

**PASS si:** I-1 modal abre, I-2 guardado funciona, I-5 zip descarga, I-6 soft delete OK.

---

## Bloque J — OVA Workspace: estructura y tabs

**Objetivo:** el editor de OVA carga y muestra todos los controles.

```
J-1   playwright-cli goto /ova/:id/workspace (usando ID conocido)
      URL carga sin pantalla en blanco (fix LazyMotion verificado)
      heading con título del OVA visible

J-2   Barra de herramientas: botones presentes:
      "Regenerar OVA completo", "Seleccionar recursos", "Adjuntar archivo de apoyo",
      "Aplicar" (disabled si sin cambios), "Preview", "Code",
      "⏱ Historial", "Configuración de IA", "⤓ SCORM"

J-3   Tabs de recursos (sección ENGAGE/EXPLORE): ej. "Cómic Interactivo", "Micro-Podcast",
      "Video con Pausa Activa", "Quiz Interactivo"
      Click en cada tab → muestra contenido distinto

J-4   Tab "Preview": muestra el recurso HTML renderizado en iframe
      Recurso tiene navegación interna (← Anterior / Siguiente →, ✅ Completar actividad)

J-5   Tab "Code": muestra HTML raw del recurso
      Botones junto al código: ✏ (editar inline), ↺ (regenerar), 🗑 (eliminar), ⏱ (historial)
      Botón "+ Añadir" visible para agregar recursos al HTML

J-6   Admin: sidebar sigue mostrando "AG / Admin" durante toda la sesión en workspace
```

**PASS si:** J-1 sin blank, J-2 todos los botones, J-3 tabs switch, J-4 preview funciona, J-5 Code tab.

---

## Bloque K — OVA Workspace: acciones de herramienta

**Objetivo:** cada botón de la barra de herramientas abre el modal/acción correcto.

```
K-1   Botón "⏱ Historial" → dialog "Historial de versiones"
      Lista versiones con fecha y badge "actual"
      Escape o click fuera cierra dialog

K-2   Botón "Configuración de IA" → dialog "Configuración de IA"
      Muestra: Texto (modelo primario), Código/HTML, Orquestador, Razonamiento
      Cada sección: combobox de modelo + botón "Restaurar"
      Escape cierra dialog

K-3   Botón "⤓ SCORM" → GET /api/ovas/:id/export-scorm → 200
      → redirect a signed URL de Supabase Storage
      → descarga .zip (nombre: "{título}_v{N}.zip")

K-4   Botón "Seleccionar recursos" → abre modal de selección de fases/recursos
      Tabs: ENGAGE, EXPLORE, EXPLAIN, ELABORATE, EVALUATE
      Click "Confirmar (0)" disabled sin selección, activo con selección

K-5   Botón "Adjuntar archivo de apoyo" → abre selector de archivo (upload RAG)

K-6   Botón "Regenerar OVA completo" → dialog de confirmación antes de regenerar
```

**PASS si:** K-1, K-2 modals abren, K-3 descarga ZIP, K-4 selector fases funciona.

---

## Bloque L — Crear OVA: formulario y configuración

**Objetivo:** el formulario de creación acepta input y habilita recursos correctamente.

```
L-1   playwright-cli goto /crear-ova
      heading "Crear nuevo OVA"
      textbox placeholder "Describe el tema, objetivos de aprendizaje y nivel educativo..."
      botón "Color: UPAO · Diseño: UPAO" (tema visual)
      botones: "Configurar recursos 5E", "Archivos de referencia (0/5)", "Tema visual del OVA"
      botón "Generar OVA" disabled

L-2   Escribir prompt ≥ 10 caracteres → botón "Generar OVA" permanece disabled
      (requiere al menos 1 recurso configurado para habilitarse)

L-3   Click "Configurar recursos 5E" → modal de selección
      Tabs: ENGAGE (activo), EXPLORE, EXPLAIN, ELABORATE, EVALUATE
      Tab ENGAGE: 10 tipos de recurso con badge de calidad (Alta/Media/Baja)

L-4   Recursos ENGAGE disponibles:
      Cómic Interactivo (Alta), Storyboard de Video (Baja, ⚠ Modo prompt),
      Micro-Podcast (Baja), Juego de Gamificación (Alta), Dilema Ético (Media),
      Noticia de Impacto (Baja), Juego de Roles (Media), Timeline Interactivo (Media),
      Escape Room Virtual (Alta), Simulador Intuitivo (Alta)

L-5   Tab EXPLORE: 10 recursos distintos:
      Simulador Virtual Lab (Alta), Agente Socrático (Alta), Juego Drag & Drop (Media),
      Video con Pausa Activa (Media), Lectura Interactiva (Media),
      Simulador de Slider (Alta), Experimento Guiado (Media), Juego de Roles (Media),
      Mapa Mental (Alta), Lab de Hipótesis (Alta)

L-6   Click en un recurso → lo marca seleccionado (visual change)
      Botón "Configurar recurso" → abre sub-config del recurso
      Botón "Confirmar (1) ✓" se habilita

L-7   Confirmar selección → panel de recursos actualiza (muestra recursos seleccionados)
      Con ≥1 recurso y ≥10 chars en prompt → "Generar OVA" habilitado

L-8   Click "Archivos de referencia (0/5)" → permite subir archivos (PDF, imagen, audio)
      Contador actualiza al subir: "(1/5)"

L-9   Click "Tema visual del OVA" → modal de selección de paleta/diseño
      Opciones: Paleta UPAO, Diseño UPAO
```

**PASS si:** L-3 modal abre, L-4 10 recursos ENGAGE, L-5 10 recursos EXPLORE, L-6 selección funciona,
L-7 botón Generar habilitado.

---

## Bloque M — Papelera

**Objetivo:** soft-delete, restauración y eliminación definitiva funcionan.

```
M-1   playwright-cli goto /papelera (via sidebar)
      heading "Papelera"
      texto "OVAs movidos a la papelera. Restáuralos o elimínalos definitivamente."

M-2   Lista OVAs en papelera: cada uno con título, fecha de eliminación
      Cada OVA: botón "↩ Restaurar" y botón "🗑 Borrar definitivamente"

M-3   Botón "↩ Restaurar" en un OVA → PATCH restore endpoint → 200
      OVA desaparece de papelera, aparece en /mis-ovas
      Contador papelera en sidebar decrementa

M-4   Botón "🗑 Borrar definitivamente" → dialog de confirmación
      Confirmar → DELETE endpoint → 200 → OVA desaparece permanentemente

M-5   Desde /mis-ovas: botón "Papelera" en un OVA → lo mueve a papelera
      Sidebar counter papelera incrementa

M-6   Papelera vacía: muestra estado vacío (no error 500)
```

**PASS si:** M-2 lista OK, M-3 restaurar funciona, M-4 eliminar definitivo funciona.

---

## Bloque N — Perfil: información personal

**Objetivo:** el perfil muestra datos correctos y permite editarlos.

```
N-1   playwright-cli goto /profile
      heading con nombre del usuario
      card perfil: avatar iniciales, nombre completo, badge rol, email, "Miembro desde X"

N-2   Tabs: "Información" (activo), "Configuración", "Seguridad"

N-3   Tab Información: campos editables:
      Nombre Completo, Correo Electrónico, Código Universitario (UPAO),
      Sexo/Género (select: Otro/Masculino/Femenino), Teléfono de contacto

N-4   Botón "Restablecer" → devuelve campos a valores guardados
      Botón "Guardar Cambios" → PATCH /api/users/me → 200 → toast de éxito

N-5   Editar nombre → guardar → heading del perfil actualiza sin recargar

N-6   Bug conocido: en direct URL goto /profile (reload), sidebar puede mostrar rol "usuario"
      aunque /api/auth/me devuelva "administrador". Via in-app nav esto no ocurre.
```

**PASS si:** N-3 campos presentes, N-4 guardar → 200, N-5 nombre actualiza.

---

## Bloque O — Perfil: seguridad

**Objetivo:** cambio de contraseña y zona de peligro funcionan.

```
O-1   Tab "Seguridad" → sección "Seguridad de la Cuenta"
      Campos: Contraseña Actual, Nueva Contraseña, Confirmar Nueva Contraseña
      Cada campo tiene toggle "Mostrar contraseña"
      Botón "Actualizar Contraseña"

O-2   Intentar actualizar con contraseña actual incorrecta → error
      (no cambia contraseña)

O-3   Sección "Zona de peligro"
      Botón "Eliminar cuenta" → dialog de confirmación antes de ejecutar

O-4   Tab "Configuración" → sección "Mis API Keys"
      Botones "Configurar" para cada proveedor (Groq, OpenRouter, etc.)
      Click "Configurar" → modal para ingresar la API key
```

**PASS si:** O-1 campos presentes, O-3 zona de peligro tiene confirmación.

---

## Bloque P — Modelos de IA

**Objetivo:** la página de configuración de modelos carga y permite ajustes.

```
P-1   playwright-cli goto /modelos
      heading "Modelos de IA"
      botón "Guardar plataforma"

P-2   Sección "Configurar modelos": 4 comboboxes de tipo:
      Texto, Código / HTML interactivo, Orquestador, Razonamiento
      Cada uno: combobox de modelo + botón "Editar cadena de fallback"

P-3   Cada combobox muestra los modelos disponibles habilitados en plataforma
      (Groq: Llama 3.3 70B, GPT-OSS 120B, Qwen3; OpenRouter: DeepSeek, etc.)

P-4   Botón "Editar cadena de fallback" → modal con lista ordenable de fallbacks

P-5   Cambiar modelo → botón "Guardar plataforma" activo
      Click guardar → PUT /api/models o similar → 200
```

**PASS si:** P-2 4 comboboxes presentes, P-3 modelos listados.

---

## Bloque Q — Vincular cuentas

**Objetivo:** la funcionalidad de vinculación genera códigos y gestiona invitaciones.

```
Q-1   playwright-cli goto /vinculacion
      heading "Vincular cuentas"
      Descripción: "Gestiona usuarios vinculados para heredar la configuración de modelos"

Q-2   Sección "Invitar por email":
      textbox "estudiante@upao.edu.pe"
      botón "Enviar invitacion" (disabled si textbox vacío)

Q-3   Sección "Codigo de vinculacion":
      botón "Generar codigo" → POST → genera código corto (ej: "1AM-J3D")
      Código mostrado en UI para compartir

Q-4   Sección "Todos los vínculos":
      Lista vínculos existentes con estado (Invitación pendiente / activo)
      Cada vínculo: email destino, estado, botón "Reenviar" o "Eliminar"

Q-5   Generar múltiples códigos → la lista de vínculos actualiza
```

**PASS si:** Q-2 form presente, Q-3 código generado, Q-4 lista visible.

---

## Bloque R — Admin: Gestión de Roles

**Objetivo:** CRUD de roles funciona con permisos correctos.

```
R-1   playwright-cli goto /admin/roles
      heading "Gestión de Roles"
      toggle "Modo tesis" (activa auto-asignación de rol "Usuarios Prueba")
      botón "+ Nuevo rol"

R-2   Roles existentes listados: estudiante, docente, usuarios_prueba, usuario (Sistema),
      administrador (Sistema), profesor (al menos estos 6)
      Cada rol: nombre, descripción corta, contador "N usuarios activos"

R-3   Roles del sistema (usuario, administrador): solo botón "Editar permisos" (sin Eliminar)
      Roles personalizados: botón "Editar permisos" + botón "Eliminar"

R-4   Botón "Editar permisos" → dialog "Editar rol: X"
      Campos: Nombre del rol, Descripción (opcional)
      Checkboxes de permisos:
        Gestionar Usuarios, Gestionar Roles,
        Crear OVAs, Editar OVAs, Eliminar OVAs, Ver OVAs,
        Configuración del Sistema, Configurar modelos propios,
        Configurar fallback propio, Configurar modelos de plataforma,
        Vincular usuarios, Administrar vínculos,
        Ver Analíticas, Exportar OVAs
      Botones: Cancelar, Guardar

R-5   Botón "+ Nuevo rol" → dialog vacío para crear rol
      Ingresar nombre + permisos → Guardar → nuevo rol en lista

R-6   Botón "Eliminar" → dialog de confirmación + opción de reasignar usuarios
      Confirmar → rol eliminado, usuarios reasignados al rol seleccionado
```

**PASS si:** R-2 roles listados, R-4 dialog permisos abre con checkboxes, R-5 nuevo rol funciona.

---

## Bloque S — Admin: Gestión de Usuarios

**Objetivo:** la tabla de usuarios muestra datos correctos y permite acciones.

```
S-1   playwright-cli goto /admin/users
      heading "Usuarios"
      "N usuarios registrados en la plataforma" (≥ 6 en prod)
      botón "+ Invitar usuario"

S-2   Tabla de usuarios: columnas Usuario (avatar+nombre+email), Código/Tel, Rol, Estado, Acciones
      Usuarios listados: al menos Jeffry, Estudiante de Prueba, Profesor de Prueba, Usuario de Prueba, Administrador GenOVA

S-3   Fila propia (admin@genova.ai): muestra "TÚ" y "Protegido" en acciones
      No tiene botón "Acción ▾" (self-protect)

S-4   Buscador "Buscar por nombre o email..." → filtra la tabla en tiempo real

S-5   Filtro de roles: combobox con todos los roles → filtra por rol

S-6   Botón "Acción ▾" en un usuario → menú:
      "✏️ Editar Perfil" → modal con campos de perfil
      "🚫 Desactivar Cuenta" → cambia estado a Inactivo
      "✉️ Restablecer por Correo" → envía email de reset
      "💬 Sin Teléfono" (disabled si sin teléfono registrado)

S-7   Botón "+ Invitar usuario" → modal de invitación con campo email

S-8   Cambiar rol de un usuario no-admin via tabla → PATCH → 200 → tabla actualiza
```

**PASS si:** S-2 tabla con usuarios, S-3 self-protect OK, S-4 búsqueda filtra, S-6 menú funciona.

---

## Bloque U — Apariencia / Tema

**Objetivo:** el selector de apariencia funciona y persiste.

```
U-1   Click en "Menu de usuario" (avatar en top-right) → menú desplegable
      Opciones: "Apariencia", "Cerrar sesión"

U-2   Click "Apariencia" → panel/modal "Configuración de Diseño y Tema"
      Sección "Paleta de colores": opción "Paleta UPAO" (azul #0A3D91 + naranja #F47A20)
      Sección "Diseño / Plantilla": opción "Plantilla UPAO" (estructura académica 5E)

U-3   Cambiar paleta → colores del chrome actualizan inmediatamente
      Cambiar diseño → layout del OVA actualiza en /crear-ova y workspace

U-4   La configuración persiste entre recargas (guardada vía /api/auth/me o localstorage)
```

**PASS si:** U-2 modal abre con opciones, U-3 cambio visible.

---

## Bloque V — Regresión: Rol admin en reload directo (ya corregido, commit cdb0bc9)

**Objetivo:** anti-regresión del bug de rol en reloads duros. Debe PASAR tras el fix SWR.

```
V-1   Login como admin@genova.ai → /dashboard → sidebar: "AG / Admin / admin@genova.ai"
      → PASS (in-app initial load)

V-2   playwright-cli goto /mis-ovas (hard reload)
      → sidebar muestra "Administrador GenOVA / Admin" sin flash a "Usuario"
      → sección Administracion visible
      → requests → GET /api/auth/me → 200, role=administrador
      → PASS: cache SWR siembra el rol correcto al montar

V-3   Repetir goto /mis-ovas y /dashboard 6+ veces seguidas (forzar la race)
      → en TODAS, sidebar = "Admin", sección Administracion presente
      → nunca queda pegado en "Usuario"

V-4   playwright-cli goto /admin/users (hard reload como admin)
      → NO muestra spinner "Verificando acceso..." prolongado
      → NO redirige a /dashboard; la tabla de usuarios carga
      → sidebar "Admin"

V-5   playwright-cli goto /dashboard (hard reload)
      → sidebar "AG / Admin" correcto

V-6   Simular fallo transitorio: route /api/auth/me → status 500 una vez,
      luego goto /mis-ovas → sidebar mantiene "Admin" (fallback a cache), no regresa a "Usuario"
```

**PASS si:** V-2..V-5 siempre muestran rol "Admin" sin flash ni redirect; V-6 no regresa el rol.
Verificación rápida por consola tras cada reload:
`fetch('/api/auth/me',{credentials:'include'}).then(r=>r.json()).then(u=>u.role)` → "administrador",
y el sidebar debe coincidir (sección Administracion visible).

---

## Bloque W — Navegación completa (in-app, anti-regresión de rol)

**Objetivo:** recorrer todas las páginas via sidebar clicks y confirmar badge admin sin cambio.
Precondición: logueado como admin via /login (no hard reload).

```
W-1   /login → /dashboard → sidebar: "AG / Admin" → OK
W-2   Sidebar click "Mis OVAs"    → badge "AG / Admin" persiste
W-3   Sidebar click "Crear OVA"   → badge "AG / Admin" persiste
W-4   Sidebar click "Papelera"    → badge "AG / Admin" persiste
W-5   Sidebar click "Modelos"     → badge "AG / Admin" persiste
W-6   Sidebar click "Vincular"    → badge "AG / Admin" persiste
W-7   Sidebar click "Roles"       → badge "AG / Admin" persiste
W-8   Sidebar click "Usuarios"    → badge "AG / Admin" persiste
W-10  Sidebar click link perfil   → heading "Administrador GenOVA" visible
W-11  Sidebar click "Dashboard"   → badge "AG / Admin" persiste
W-12  En workspace /ova/:id/workspace (via Editar) → badge "AG / Admin" persiste
```

**PASS si:** badge "AG / Admin" visible sin cambio en todos los pasos W-1..W-12.

---

## Bloque X — Producción: conexión frontend ↔ backend

**Objetivo:** smoke mínimo post-merge a main.

```
X-1   curl https://genova-backend-production.up.railway.app/health
      → {"status": "ok"}

X-2   curl https://genova-backend-production.up.railway.app/api/health
      → 200

X-3   Login admin en frontend prod → POST /auth/login → 200
      → /dashboard carga, stats OVAs visibles

X-4   GET /api/ovas?page=1&limit=6 → 200, array de OVAs no vacío

X-5   Descargar SCORM de OVA existente → signed URL de Supabase → zip 200

X-6   Logout → genova_token cookie eliminada

X-7   Acceso /dashboard sin sesión → redirige a /login
```

**PASS si:** X-1 health OK, X-3 login 200, X-4 OVAs 200, X-5 SCORM descarga.

---

## Resumen de bloques

| Bloque | Área | Tests | Prioridad |
|--------|------|-------|-----------|
| A | Login admin | 6 | P0 |
| B | Login usuario | 3 | P0 |
| C | Logout | 6 | P0 |
| D | Credenciales / seguridad | 4 | P1 |
| E | Registro nueva cuenta | 6 | P0 |
| F | Recuperación contraseña | 5 | P1 |
| G | Dashboard contenido | 7 | P0 |
| H | Mis OVAs listado | 9 | P0 |
| I | Mis OVAs acciones | 7 | P1 |
| J | Workspace estructura | 6 | P0 |
| K | Workspace herramientas | 6 | P1 |
| L | Crear OVA formulario | 9 | P0 |
| M | Papelera | 6 | P1 |
| N | Perfil información | 6 | P1 |
| O | Perfil seguridad | 4 | P2 |
| P | Modelos de IA | 5 | P2 |
| Q | Vincular cuentas | 5 | P2 |
| R | Admin Roles | 6 | P1 |
| S | Admin Usuarios | 8 | P1 |
| U | Apariencia | 4 | P2 |
| V | Bug rol en reload | 5 | P0 (regresión) |
| W | Navegación anti-regresión | 11 | P0 |
| X | Producción post-merge | 7 | P0 |

**Total: 148 tests documentados.**

---

## Comandos playwright-cli de referencia rápida

```bash
# Abrir sesión
playwright-cli open https://gen-ova-frontend.vercel.app

# Ver snapshot actual (refs para interactuar)
playwright-cli snapshot

# Navegar
playwright-cli goto https://gen-ova-frontend.vercel.app/dashboard

# Interactuar
playwright-cli fill <ref> "texto"
playwright-cli click <ref>
playwright-cli key Escape

# Verificar estado
playwright-cli eval "location.pathname"
playwright-cli cookie-list
playwright-cli localstorage-list
playwright-cli requests
playwright-cli response-body <N>

# Capturar evidencia
playwright-cli screenshot --filename=tests/playwright-smoke/screenshots/A-login.png

# Cerrar
playwright-cli close
```

## Screenshots de evidencia sugeridos

```
tests/playwright-smoke/screenshots/
├── A-login-dashboard.png      # Post-login admin, badge AG, sección Admin visible
├── B-user-sidebar.png         # Sidebar usuario regular, sin sección Admin
├── C-logout-cookies.png       # cookie-list vacío tras logout
├── E-register-success.png     # Dashboard nueva cuenta, badge TP
├── G-dashboard-admin.png      # Dashboard con stats y panel admin
├── H-mis-ovas-list.png        # Lista de OVAs con paginación
├── J-workspace-preview.png    # Workspace Preview tab con recurso interactivo
├── J-workspace-code.png       # Workspace Code tab con HTML
├── K-scorm-download.png       # Confirmación de descarga SCORM
├── L-recurso-selector.png     # Modal selección recursos con 10 opciones
├── R-roles-list.png           # Lista de roles admin
├── S-users-table.png          # Tabla usuarios con fila TÚ protegida
├── V-bug-rol-reload.png       # Bug: sidebar "U" tras goto directo como admin
└── X-prod-health.png          # Health check backend prod
```
