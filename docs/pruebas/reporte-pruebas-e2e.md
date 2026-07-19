# Reporte de Pruebas End-to-End (E2E) — GenOVA

> Pruebas automatizadas que ejercitan **flujos completos sobre las rutas
> funcionales de la interfaz gráfica** en un navegador real (extremo a extremo:
> navegador → frontend Angular → backend FastAPI → base de datos), tal como lo
> haría un usuario. Escritas en **Gherkin** (BDD) y ejecutadas con **Playwright**.

| Campo | Valor |
|---|---|
| **Proyecto** | GenOVA — generación asistida por IA de OVAs (SCORM 1.2 / 5E) |
| **Tipo de prueba** | End-to-End (E2E) funcional de la interfaz gráfica |
| **Herramienta** | Playwright (Chromium) + Playwright-BDD (Cucumber/Gherkin) |
| **Fecha de ejecución** | 18/07/2026 |
| **Ejecutado por** | Jeffry A. Romero Uriol *(editar si aplica)* |
| **Suite** | 16 features · **36 escenarios** |
| **Resultado** | **36 / 36 PASA** ✔ |

---

## 1. Introducción y objetivo

Las pruebas **End-to-End (E2E)** validan que la aplicación funciona correctamente
**de extremo a extremo**: se automatiza un navegador real que recorre las rutas
de la interfaz (login, registro, creación de OVA, workspace, biblioteca, perfil,
administración), interactúa con los componentes reales (formularios, modales,
botones) y verifica las respuestas de la aplicación contra el backend y la base
de datos vivos. A diferencia de las pruebas unitarias (que aíslan piezas), las
E2E prueban el **sistema integrado** desde la perspectiva del usuario.

Se siguió la recomendación de usar herramientas de grabación/automatización de
rutas (Selenium/Playwright); se adoptó **Playwright** por su integración nativa
con **BDD (Gherkin)**, trazas, videos y reporte HTML.

## 2. Herramientas y enfoque

- **Playwright** (motor Chromium) automatiza el navegador.
- **playwright-bdd** traduce los archivos `.feature` (Gherkin: `Dado/Cuando/Entonces`)
  a pruebas ejecutables; los *steps* viven en `tests/steps/e2e/`.
- Cada escenario ejercita **selectores reales** de la UI (los mismos que la app).
- **Evidencia automática:** reporte HTML, más *screenshot*, *trace* y *video*
  retenidos automáticamente ante fallo (`screenshot: only-on-failure`,
  `trace/video: retain-on-failure`).
- **Tags `@smoke`:** escenarios seguros que **no crean datos** (solo validaciones
  y navegación) — aptos para correr incluso contra el entorno de despliegue.
- **Comando:** `pnpm --filter genova-tests test:e2e`
  (`bddgen` genera los specs y luego `playwright test` los ejecuta).

## 3. Entorno de ejecución

| Componente | Detalle |
|---|---|
| Frontend | Angular 22 servido en `http://localhost:4200` |
| Backend | FastAPI (`uvicorn`) en `http://localhost:8000`, con `LLM_FAKE=1` (generación 5E determinista sin proveedores) y `RATE_LIMIT_ENABLED=0` (igual que en CI) |
| Worker | `arq` (cola durable) con `LLM_FAKE=1` — procesa la generación en segundos |
| Base de datos | Supabase PostgreSQL + pgvector |
| Navegador | Chromium (Playwright), 1 worker, timeout 180 s/prueba |
| Reporte | HTML de Playwright en `tests/playwright-report/` |
| Sistema operativo | Windows 11 |
| Cuentas seed | `admin@genova.ai` (Administrador) · `user@genova.ai` (Usuario) |

> **Nota sobre `LLM_FAKE=1`:** la suite E2E prueba las **rutas y flujos** de la
> interfaz, no la calidad del contenido generado por los LLM; por eso la
> generación se ejecuta en modo determinista (como en CI), lo que hace las
> pruebas rápidas y repetibles.

## 4. Estrategia y cobertura

Cobertura por **rutas funcionales** de la interfaz gráfica:

| Ruta | Cubierta por |
|---|---|
| `/login` | HU-008, HU-010, BU-001 |
| `/register` | HU-001 |
| `/dashboard` | HU-010, BU-002, HU-018 |
| `/crear` | HU-002, HU-010 |
| `/workspace/:id` | HU-002, HU-025 |
| `/mis-ovas` | HU-004, HU-006, HU-012, HU-013, HU-025 |
| `/papelera` | HU-012 |
| `/profile` | HU-015 |
| `/admin` (usuarios) | HU-021, HU-018 |
| `/admin/roles` | HU-018, HU-019, HU-020 |

Cada feature traza a su **Historia de Usuario (HU)** o **Bug (BU)** del backlog.

## 5. Matriz de casos E2E (resumen)

| Feature | HU/BU | Área / Rutas | Escenarios | Resultado |
|---|---|---|:--:|:--:|
| Inicio de sesión | HU-008 | Autenticación · `/login` | 5 | ✔ PASA |
| Registro de cuenta | HU-001 | Autenticación · `/register` | 4 | ✔ PASA |
| Sesión expirada redirige a login | BU-001 | Autenticación · rutas protegidas | 1 | ✔ PASA |
| Cambio de cuenta actualiza navegación | BU-002 | Navegación · `/dashboard` | 1 | ✔ PASA |
| Layout y navegación principal | HU-010 | Layout · `/login`, `/dashboard`, `/crear` | 2 | ✔ PASA |
| Crear OVA desde prompt | HU-002 | Generación · `/crear` → `/workspace` | 2 | ✔ PASA |
| Exportar OVA como SCORM | HU-004 | SCORM · `/mis-ovas` | 2 | ✔ PASA |
| Historial de OVAs (Mis OVAs) | HU-006 | Biblioteca · `/mis-ovas` | 2 | ✔ PASA |
| Eliminar OVA con papelera | HU-012 | Biblioteca · `/mis-ovas`, `/papelera` | 3 | ✔ PASA |
| Duplicar OVA existente | HU-013 | Biblioteca · `/mis-ovas` | 1 | ✔ PASA |
| Workspace de edición del OVA | HU-025 | Workspace · `/workspace/:id` | 2 | ✔ PASA |
| Ver perfil de usuario | HU-015 | Perfil · `/profile` | 1 | ✔ PASA |
| Gestión de Roles — Crear Rol | HU-018 | Admin · `/admin`, `/admin/roles` | 6 | ✔ PASA |
| Editar rol | HU-019 | Admin · `/admin/roles` | 2 | ✔ PASA |
| Eliminar rol | HU-020 | Admin · `/admin/roles` | 1 | ✔ PASA |
| Gestión de usuarios | HU-021 | Admin · `/admin` | 1 | ✔ PASA |
| **Total** | | | **36** | **36 / 36 ✔** |

---

## 6. Casos E2E detallados (Gherkin)

> Cada escenario se ejecutó en el navegador; todos los pasos `Entonces` se
> cumplieron (**PASA**). Formato: `Dado` (contexto) · `Cuando` (acción) ·
> `Entonces` (verificación).

### HU-008 — Inicio de sesión (`/login`) · 5/5 ✔

| Escenario | Gherkin (resumen) | Resultado |
|---|---|:--:|
| Login exitoso | Dado en /login · Cuando ingreso credenciales válidas y envío · Entonces recibo JWT (24 h) y me redirige al dashboard | ✔ |
| Credenciales inválidas | Cuando ingreso credenciales inválidas · Entonces error descriptivo y no accedo | ✔ |
| Bloqueo tras intentos | Dado 5 intentos fallidos · Cuando reintento · Entonces cuenta bloqueada 15 min + mensaje | ✔ |
| Token expirado | Dado token expirado · Cuando accedo a ruta protegida · Entonces redirige a login | ✔ |
| Cerrar sesión | Dado sesión activa · Cuando "Cerrar sesión" · Entonces token eliminado y redirige a login | ✔ |

### HU-001 — Registro de cuenta (`/register`) · 4/4 ✔

| Escenario | Gherkin (resumen) | Resultado |
|---|---|:--:|
| Registro exitoso | Cuando completo nombre + correo único + contraseña válida y envío · Entonces alta con aviso de verificación o sesión iniciada | ✔ |
| Nombre sin letras (@smoke) | Cuando nombre "..." · Entonces error "El nombre debe contener al menos una letra." | ✔ |
| Contraseña sin números (@smoke) | Cuando contraseña "solopalabras" · Entonces error "Mínimo 8 caracteres con letras y números." | ✔ |
| Correo ya registrado (@smoke) | Cuando correo "user@genova.ai" · Entonces error "El correo ya está registrado." | ✔ |

### BU-001 — Sesión expirada redirige a login · 1/1 ✔

| Escenario | Gherkin (resumen) | Resultado |
|---|---|:--:|
| Ruta protegida redirige (@smoke) | Dado sesión activa · Cuando expira y navego a "/mis-ovas" · Entonces me redirige al login | ✔ |

### BU-002 — Cambio de cuenta actualiza la navegación · 1/1 ✔

| Escenario | Gherkin (resumen) | Resultado |
|---|---|:--:|
| Admin → usuario retira panel admin (@smoke) | Dado admin en /dashboard (ve "Administración") · Cuando cambio a usuario · Entonces no veo el panel de administración | ✔ |

### HU-010 — Layout y navegación principal · 2/2 ✔

| Escenario | Gherkin (resumen) | Resultado |
|---|---|:--:|
| Login renderiza (@smoke) | Dado en /login · Entonces visualizo la pantalla de inicio de sesión | ✔ |
| Rutas protegidas comparten Navbar/Sidebar (@smoke) | Cuando navego a /dashboard y /crear · Entonces veo la navegación principal completa | ✔ |

### HU-002 — Crear OVA desde prompt (`/crear` → `/workspace`) · 2/2 ✔

| Escenario | Gherkin (resumen) | Resultado |
|---|---|:--:|
| Botón Generar deshabilitado sin prompt (@smoke) | Cuando navego a /crear · Entonces botón "Generar OVA" deshabilitado | ✔ |
| Generación completa hasta el workspace | Cuando escribo prompt, configuro recursos en ≥2 fases e inicio la generación · Entonces redirige al workspace y muestra el botón SCORM | ✔ |

### HU-004 — Exportar OVA como SCORM (`/mis-ovas`) · 2/2 ✔

| Escenario | Gherkin (resumen) | Resultado |
|---|---|:--:|
| Botón Descargar habilitado | Dado un OVA listo · Cuando lo localizo en Mis OVAs · Entonces "Descargar" habilitado | ✔ |
| Descarga entrega un zip | Cuando descargo desde su card · Entonces se descarga un archivo `.zip` | ✔ |

### HU-006 — Historial de OVAs (`/mis-ovas`) · 2/2 ✔

| Escenario | Gherkin (resumen) | Resultado |
|---|---|:--:|
| Búsqueda por título | Dado un OVA propio · Cuando busco su título · Entonces aparece en el listado | ✔ |
| Cuenta nueva ve estado vacío | Dado cuenta recién creada · Cuando navego a /mis-ovas · Entonces veo el estado vacío | ✔ |

### HU-012 — Eliminar OVA con papelera (`/mis-ovas`, `/papelera`) · 3/3 ✔

| Escenario | Gherkin (resumen) | Resultado |
|---|---|:--:|
| Mover a papelera y restaurar | Cuando muevo a papelera · Entonces sale de Mis OVAs y aparece en papelera · Cuando restauro · Entonces vuelve a Mis OVAs | ✔ |
| Borrar definitivamente | Cuando muevo a papelera y borro definitivamente · Entonces ya no aparece | ✔ |
| Cuenta nueva ve papelera vacía | Dado cuenta nueva · Cuando navego a /papelera · Entonces estado vacío | ✔ |

### HU-013 — Duplicar OVA existente (`/mis-ovas`) · 1/1 ✔

| Escenario | Gherkin (resumen) | Resultado |
|---|---|:--:|
| Duplicar crea una copia | Dado un OVA propio · Cuando lo duplico desde su card · Entonces aparece la copia en la lista | ✔ |

### HU-025 — Workspace de edición del OVA (`/workspace/:id`) · 2/2 ✔

| Escenario | Gherkin (resumen) | Resultado |
|---|---|:--:|
| Editar abre el workspace | Cuando abro el workspace desde la card · Entonces muestra el título y el botón SCORM | ✔ |
| Lista los recursos de las fases | Entonces el workspace muestra los recursos generados de las fases seleccionadas | ✔ |

### HU-015 — Ver perfil de usuario (`/profile`) · 1/1 ✔

| Escenario | Gherkin (resumen) | Resultado |
|---|---|:--:|
| Perfil muestra datos (@smoke) | Cuando navego a /profile · Entonces muestra "user@genova.ai" | ✔ |

### HU-018 — Gestión de Roles — Crear Rol (`/admin`, `/admin/roles`) · 6/6 ✔

| Escenario | Gherkin (resumen) | Resultado |
|---|---|:--:|
| Acceso al panel de administración | Dado navego a /admin · Entonces veo el panel con su layout y "Gestión de Roles" | ✔ |
| Acceso denegado a no-admin | Dado usuario no-admin · Cuando navego a /admin · Entonces redirige al dashboard | ✔ |
| Ver lista de roles | Dado en /admin/roles · Entonces veo los roles ("administrador", "usuario") | ✔ |
| Crear rol exitosamente | Cuando "Nuevo rol", nombre "docente", permisos create/view y envío · Entonces 201 y aparece en la lista | ✔ |
| Nombre duplicado | Cuando repito "docente" · Entonces 409 "Ya existe un rol con ese nombre" y no se duplica | ✔ |
| Nombre vacío | Cuando dejo el nombre vacío · Entonces error de obligatorio y no se envía | ✔ |

### HU-019 — Editar rol (`/admin/roles`) · 2/2 ✔

| Escenario | Gherkin (resumen) | Resultado |
|---|---|:--:|
| Roles de sistema no editables (@smoke) | Entonces los roles del sistema muestran la etiqueta "Sistema" | ✔ |
| Editar rol personalizado | Cuando creo un rol y lo renombro con sufijo "-edit" · Entonces aparece renombrado (y se elimina) | ✔ |

### HU-020 — Eliminar rol (`/admin/roles`) · 1/1 ✔

| Escenario | Gherkin (resumen) | Resultado |
|---|---|:--:|
| Eliminar rol personalizado | Dado creo un rol · Cuando lo elimino · Entonces desaparece de la lista | ✔ |

### HU-021 — Gestión de usuarios (`/admin`) · 1/1 ✔

| Escenario | Gherkin (resumen) | Resultado |
|---|---|:--:|
| Lista y busca por email (@smoke) | Cuando navego a /admin y busco "user@genova.ai" · Entonces la lista lo muestra | ✔ |

---

## 7. Resumen de ejecución

- **Tests ejecutados:** 36 (16 features).
- **Resultado:** **36 PASA · 0 FALLA.**
- **1 worker**, navegador Chromium, backend + worker con `LLM_FAKE=1`.
- **Reporte HTML** generado en `tests/playwright-report/` (`npx playwright show-report`).

**Corrección aplicada durante la ejecución.** En la primera corrida, el escenario
*HU-002 «Generación completa»* falló (35/36): el **tour de onboarding**
(driver.js «Describe tu tema») aparece en la primera visita a `/crear` y su
overlay **bloqueaba el clic** sobre las tarjetas del modal de recursos 5E (cada
contexto Playwright es «primera visita»). Se ajustó el *step*
`configuro recursos en al menos dos fases`
([`tests/steps/e2e/ova-e2e.steps.js`](../../tests/steps/e2e/ova-e2e.steps.js))
para **cerrar el tour** (como haría el usuario) antes de abrir el modal. Tras el
ajuste, el escenario pasa y la suite queda **36/36**.

**Evidencia principal — Reporte HTML de Playwright (todos en verde):**

![Reporte Playwright — resumen](../assets/e2e/reporte-playwright.png)

![Reporte Playwright — detalle de un escenario con sus pasos](../assets/e2e/reporte-playwright-detalle.png)

## 8. Evidencia visual por ruta

Las rutas ejercitadas por la suite E2E también están capturadas (app real) en el
documento de caja negra; se referencian aquí como evidencia visual de cada ruta:

| Ruta / flujo E2E | Captura de la ruta |
|---|---|
| Registro (HU-001) | [`esc1_*`](../assets/caja-negra-completa/esc1_01_campos_vacios.png) |
| Login (HU-008) | [`esc2_*`](../assets/caja-negra-completa/esc2_04_login_ok.png) |
| Crear OVA + workspace (HU-002) | [`esc4_05_resultado_workspace`](../assets/caja-negra-completa/esc4_05_resultado_workspace.png) |
| Workspace / recursos (HU-025) | [`esc5_01_workspace_recursos`](../assets/caja-negra-completa/esc5_01_workspace_recursos.png) |
| Exportar SCORM (HU-004) | [`esc7_02_descarga_scorm`](../assets/caja-negra-completa/esc7_02_descarga_scorm.png) |
| Biblioteca / papelera (HU-006/012/013) | [`esc8_*`](../assets/caja-negra-completa/esc8_01_buscar.png) |
| Perfil (HU-015) | [`esc9_01_perfil`](../assets/caja-negra-completa/esc9_01_perfil.png) |
| Admin usuarios/roles (HU-018/019/020/021) | [`esc13_*`](../assets/caja-negra-completa/esc13_02_roles.png) |

## 9. Cómo reproducir

```bash
# Requisitos: frontend en :4200 y backend en :8000 (con worker).
# Para resultados deterministas, arranca backend y worker con LLM_FAKE=1:
#   LLM_FAKE=1 RATE_LIMIT_ENABLED=0 uvicorn main:app --port 8000   (en backend/)
#   LLM_FAKE=1 arq worker.WorkerSettings                           (en backend/)

cd tests
pnpm test:e2e            # bddgen + playwright test (toda la suite)
BDD_TAGS="@smoke" pnpm test:e2e   # solo escenarios @smoke (seguros)
npx playwright show-report        # abre el reporte HTML

# Un solo escenario:
npx bddgen --config playwright.config.js
npx playwright test --config playwright.config.js --grep "Generación completa"
```

- **Features (Gherkin):** [`tests/features/e2e/`](../../tests/features/e2e)
- **Steps (Playwright):** [`tests/steps/e2e/`](../../tests/steps/e2e)
- **Config:** [`tests/playwright.config.js`](../../tests/playwright.config.js)
