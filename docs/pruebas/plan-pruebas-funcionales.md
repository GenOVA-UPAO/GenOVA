# Plan de Pruebas Funcionales — GenOVA · Sprint 2

> Plantilla estilo **Release Preview Test Plan** (NetSuite): una **Matriz de
> Prueba** (resumen) + **Casos de Prueba** detallados con pasos. Se completó con
> las pruebas funcionales reales ejecutadas sobre GenOVA (stack local con
> proveedores LLM, base de datos y worker reales). La evidencia (capturas) vive
> en [`docs/assets/caja-negra-completa/`](../assets/caja-negra-completa) y el
> detalle de caja negra en
> [`pruebas-caja-negra-completa.md`](pruebas-caja-negra-completa.md).

| Campo | Valor |
|---|---|
| **Plan de pruebas** | Sprint 2 |
| **Fecha de creación** | 18/07/2026 |
| **Plan de prueba creado por** | Jeffry A. Romero Uriol *(editar si aplica)* |
| **Aplicación** | GenOVA — generación asistida por IA de OVAs (SCORM 1.2 / metodología 5E) |
| **Entorno** | Frontend Angular `:4200` · Backend FastAPI `:8000` · Worker `arq` · Supabase PostgreSQL + pgvector |
| **Cuentas usadas** | `admin@genova.ai` (Administrador) · `user@genova.ai` (Usuario) · cuentas desechables `*@test.genova.ai` |

**Leyenda de Estado:** `PASE` (cumple lo esperado) · `OBSERVADO` (funciona con
salvedad/observación) · `FALLA` (no cumple) · `PENDIENTE` (no ejecutado).

**Leyenda de Severidad:** `1` = Crítica · `2` = Alta · `3` = Media · `4` = Baja.

**Resumen de ejecución:** 27 casos en la matriz · **27 PASE** · 0 OBSERVADO · 0 FALLA
(19 casos detallados, 49 pasos ejecutados). Las 3 observaciones de la primera
corrida se **corrigieron** y re-verificaron (ver §3 Correcciones aplicadas).

---

## 1. Matriz de Prueba

### Grupo 1 — Autenticación y gestión de cuenta

| Caso de Prueba | Casos de Uso | Área/Módulo | Estado | Severidad | Comentarios |
|:--:|---|---|:--:|:--:|---|
| 1.0 | Registro de usuario con validación de campos (nombre, email, contraseña) | Autenticación / Registro | PASE | 2 | Valida vacíos, contraseña débil, formato de email y email duplicado |
| 1.1 | Inicio de sesión con credenciales | Autenticación / Login | PASE | 1 | Credenciales válidas → dashboard; inválidas → 401 |
| 1.2 | Bloqueo temporal por intentos fallidos | Autenticación / Login | PASE | 1 | A los 5 intentos: 403 "Cuenta bloqueada. Intenta de nuevo en N minuto(s)." |
| 1.3 | Recuperación de contraseña (anti-enumeración) | Autenticación / Reset | PASE | 2 | Mensaje genérico; no revela si el correo existe |
| 1.4 | Ver y editar perfil | Perfil | PASE | 3 | Edición de nombre persiste |
| 1.5 | Cambio de contraseña desde el perfil | Perfil / Seguridad | PASE | 3 | Corregido: el botón quedaba en "Actualizando…" (bug zoneless+OnPush con propiedad plana → convertida a signal). El cambio funciona (400 actual incorrecta / 200 éxito) y el botón vuelve a habilitarse |

### Grupo 2 — Generación de OVA (modelo 5E)

| Caso de Prueba | Casos de Uso | Área/Módulo | Estado | Severidad | Comentarios |
|:--:|---|---|:--:|:--:|---|
| 2.0 | Crear OVA — validación del formulario de prompt | Creación | PASE | 2 | Botón "Generar OVA" deshabilitado sin prompt; se habilita al escribir |
| 2.1 | Configuración de recursos por fase 5E | Creación | PASE | 2 | Modal con Engage, Explore, Explain, Elaborate, Evaluate |
| 2.2 | Generación 5E en vivo (worker + SSE) | Generación | PASE | 2 | Con un worker dedicado, la generación fresca **completa** correctamente y el OVA queda "listo" (la corrida anterior no completó por workers duplicados compitiendo en la cola) |
| 2.3 | Validación fase↔tipo de recurso (robustez) | Generación / API | PASE | 2 | Corregido: el endpoint valida que el `resource_type` pertenezca a la `phase_type` y devuelve **422**; ya no crashea el worker |
| 2.4 | Carga de archivos base para contexto (RAG) | RAG | PASE | 3 | Acepta PDF/DOCX/PPTX/MP3/WAV/M4A/JPG/PNG/WEBP; muestra chip |
| 2.5 | Visualización del OVA en el workspace (5E) | Workspace | PASE | 1 | Recursos renderizados por fase (p. ej. Cómic Interactivo con ilustración) |

### Grupo 3 — Edición, exportación y biblioteca

| Caso de Prueba | Casos de Uso | Área/Módulo | Estado | Severidad | Comentarios |
|:--:|---|---|:--:|:--:|---|
| 3.0 | Edición del OVA (panel de cambios estilo chat) | Workspace / Edición | PASE | 2 | Panel con "Regenerar", "Seleccionar recursos" y prompt de cambios |
| 3.1 | Exportar OVA como paquete SCORM | SCORM | PASE | 1 | `.zip` con `imsmanifest.xml` + `cmi5.xml` + `index.html` + recursos HTML (9 archivos) |
| 3.2 | Buscar OVA por título | Biblioteca | PASE | 3 | Filtra las cards |
| 3.3 | Duplicar OVA | Biblioteca | PASE | 3 | Total de la biblioteca pasa de 10 a 11 |
| 3.4 | Mover OVA a la papelera (borrado lógico) | Biblioteca / Papelera | PASE | 2 | Desaparece de Mis OVAs y aparece en Papelera |
| 3.5 | Restaurar / borrar definitivamente | Papelera | PASE | 3 | Restaura a Mis OVAs; borrado definitivo elimina |

### Grupo 4 — Administración y configuración

| Caso de Prueba | Casos de Uso | Área/Módulo | Estado | Severidad | Comentarios |
|:--:|---|---|:--:|:--:|---|
| 4.0 | Gestión de usuarios (listar/buscar) | Admin / Usuarios | PASE | 2 | Búsqueda por email; 419 usuarios; asignación de rol |
| 4.1 | Gestión de roles (listar) | Admin / Roles | PASE | 2 | Roles del sistema con permisos |
| 4.2 | Crear rol con permisos | Admin / Roles | PASE | 2 | Modal "Crear nuevo rol" (Crear/Ver/Exportar OVAs, etc.) |
| 4.3 | Control de acceso por rol (`adminGuard`) | Admin / Seguridad | PASE | 1 | Usuario no-admin en `/admin` es redirigido al Dashboard |
| 4.4 | Catálogo de modelos de IA | Modelos | PASE | 2 | 4/4 proveedores conectados; asignación por tarea |
| 4.5 | Cadena de fallback por tarea | Modelos | PASE | 2 | Modelo primario + fallbacks (editable) |

### Grupo 5 — Seguridad y no funcionales

| Caso de Prueba | Casos de Uso | Área/Módulo | Estado | Severidad | Comentarios |
|:--:|---|---|:--:|:--:|---|
| 5.0 | Sesión con cookie httpOnly (JWT) | Autenticación / Seguridad | PASE | 1 | `Set-Cookie: genova_token` httpOnly emitido en login/registro |
| 5.1 | Latencia de operaciones clave | No funcional | PASE | 3 | Login y cambio de contraseña: ~0.2–1.5 s medidos |
| 5.2 | Integridad del paquete exportado | SCORM / Integridad | PASE | 1 | Manifiesto y recursos presentes y consistentes en el `.zip` |

---

## 2. Casos de Prueba (detallados)

> Cada caso corresponde a un flujo de la matriz. Los "Pasos" agrupan las
> condiciones probadas (partición de equivalencia / tabla de decisiones). La
> columna "Resultado de la prueba" refleja lo **observado realmente**.

### Caso de Prueba 1.0 — Registro de nuevo usuario

| Campo | Valor |
|---|---|
| **Nro de Caso** | 1.0 |
| **Área de Prueba** | Autenticación / Registro (`/register`) |
| **Nombre** | Registro de usuario con validación de campos |
| **Rol Usado** | Invitado (sin sesión) |
| **Asignado A** | Jeffry A. Romero Uriol |
| **Login Email** | Cuenta nueva de prueba (`cn_*@test.genova.ai`) |

| Paso | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|---|
| Paso 1 | Enviar el formulario con nombre, email y contraseña **vacíos** | No permite el envío; muestra mensajes de campo requerido | **PASE** |
| Paso 2 | Contraseña `abc` (3 caracteres, sin números) | Rechaza; muestra "Mínimo 8 caracteres con letras y números" y deshabilita el botón | **PASE** |
| Paso 3 | Email `correo-sin-arroba` | Rechaza; error de formato de email | **PASE** |
| Paso 4 | Email ya registrado `user@genova.ai` + contraseña válida | El backend rechaza por email duplicado | **PASE** |
| Paso 5 | Nombre válido + email único + contraseña `Clave1234` | Crea la cuenta e inicia sesión / muestra aviso de verificación | **PASE** |
| **Problemas encontrados** | Ninguno. | | |
| **Otros comentarios** | Método: partición de equivalencia. Evidencia: `esc1_01`…`esc1_05`. | | |

### Caso de Prueba 1.1 — Inicio de sesión con credenciales

| Campo | Valor |
|---|---|
| **Nro de Caso** | 1.1 |
| **Área de Prueba** | Autenticación / Login (`/login`) |
| **Nombre** | Inicio de sesión con credenciales válidas e inválidas |
| **Rol Usado** | Usuario |
| **Asignado A** | Jeffry A. Romero Uriol |
| **Login Email** | `user@genova.ai` |

| Paso | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|---|
| Paso 1 | Formulario vacío | Botón "Entrar" deshabilitado | **PASE** |
| Paso 2 | `user@genova.ai` + contraseña incorrecta | No autentica; muestra "Credenciales inválidas." (HTTP 401) | **PASE** |
| Paso 3 | `user@genova.ai` / `user1234password` (válidas) | Autentica, emite cookie httpOnly y redirige al dashboard | **PASE** |
| **Problemas encontrados** | Ninguno. | | |
| **Otros comentarios** | Evidencia: `esc2_01`, `esc2_02`, `esc2_04`. | | |

### Caso de Prueba 1.2 — Bloqueo temporal por intentos fallidos

| Campo | Valor |
|---|---|
| **Nro de Caso** | 1.2 |
| **Área de Prueba** | Autenticación / Login |
| **Nombre** | Bloqueo de cuenta tras intentos fallidos |
| **Rol Usado** | Usuario |
| **Asignado A** | Jeffry A. Romero Uriol |
| **Login Email** | Cuenta desechable `cn_lock_*@test.genova.ai` |

| Paso | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|---|
| Paso 1 | Repetir login con contraseña incorrecta sobre la misma cuenta | Tras 5 intentos, la cuenta queda bloqueada | **PASE** |
| Paso 2 | Intento posterior al bloqueo | HTTP 403 + "Cuenta bloqueada. Intenta de nuevo en N minuto(s)." | **PASE** |
| **Problemas encontrados** | Ninguno (el bloqueo temporal opera correctamente). | | |
| **Otros comentarios** | Tabla de decisiones. Evidencia: `esc2_03`. | | |

### Caso de Prueba 1.3 — Recuperación de contraseña

| Campo | Valor |
|---|---|
| **Nro de Caso** | 1.3 |
| **Área de Prueba** | Autenticación / Reset (`/forgot-password`) |
| **Nombre** | Solicitud de restablecimiento (anti-enumeración) |
| **Rol Usado** | Invitado (sin sesión) |
| **Asignado A** | Jeffry A. Romero Uriol |
| **Login Email** | Email inexistente de prueba |

| Paso | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|---|
| Paso 1 | Acceder a la pantalla de recuperación | Muestra el formulario de recuperación | **PASE** |
| Paso 2 | Ingresar un email que no existe y solicitar el enlace | Responde con mensaje genérico ("Si el correo está registrado…"); no revela existencia ni devuelve token | **PASE** |
| **Problemas encontrados** | Ninguno. | | |
| **Otros comentarios** | Protección contra enumeración de cuentas. Evidencia: `esc3_01`, `esc3_02`. | | |

### Caso de Prueba 1.4 — Ver y editar perfil

| Campo | Valor |
|---|---|
| **Nro de Caso** | 1.4 |
| **Área de Prueba** | Perfil (`/profile`) |
| **Nombre** | Visualización y edición de datos de perfil |
| **Rol Usado** | Usuario |
| **Asignado A** | Jeffry A. Romero Uriol |
| **Login Email** | Cuenta de prueba `cn_perfil_*@test.genova.ai` |

| Paso | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|---|
| Paso 1 | Navegar a `/profile` autenticado | Muestra los datos de la cuenta (nombre, correo, código UPAO, sexo, teléfono) | **PASE** |
| Paso 2 | Editar el nombre a "Perfil CN Editado" y guardar | Acepta y persiste el nuevo nombre | **PASE** |
| **Problemas encontrados** | Ninguno. | | |
| **Otros comentarios** | Evidencia: `esc9_01`, `esc9_02`. | | |

### Caso de Prueba 1.5 — Cambio de contraseña desde el perfil

| Campo | Valor |
|---|---|
| **Nro de Caso** | 1.5 |
| **Área de Prueba** | Perfil / Seguridad (`/profile` → Seguridad) |
| **Nombre** | Cambio de contraseña con validaciones |
| **Rol Usado** | Usuario |
| **Asignado A** | Jeffry A. Romero Uriol |
| **Login Email** | Cuenta de prueba `cn_pass_*@test.genova.ai` |

| Paso | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|---|
| Paso 1 | Contraseña actual incorrecta + nueva válida | Rechaza (HTTP 400 "La contraseña actual ingresada es incorrecta.") | **PASE** |
| Paso 2 | Nueva contraseña `abc` (débil) | Error en línea "Debe tener al menos 8 caracteres." + botón deshabilitado | **PASE** |
| Paso 3 | Actual correcta + nueva válida coincidente | Cambia la contraseña (HTTP 200 "Contraseña actualizada con éxito.") y el botón vuelve a habilitarse | **PASE** |
| **Problemas encontrados** | **Resuelto.** El botón quedaba en "Actualizando…" indefinidamente: las banderas `isSaving/isChanging/isDeleting`/`deleteAccountError` eran propiedades planas y, con OnPush + zoneless, mutarlas tras un `await` no dispara detección de cambios. Se convirtieron a `signal()` (ver §3). Tras el fix, el botón se restablece correctamente y el cambio se aplica (400/200 verificados). | | |
| **Otros comentarios** | Evidencia: `esc10_01`, `esc10_02`, `esc10_03`. | | |

### Caso de Prueba 2.0 — Crear OVA (validación del formulario)

| Campo | Valor |
|---|---|
| **Nro de Caso** | 2.0 |
| **Área de Prueba** | Creación de OVA (`/crear`) |
| **Nombre** | Validación del prompt y configuración de recursos |
| **Rol Usado** | Usuario |
| **Asignado A** | Jeffry A. Romero Uriol |
| **Login Email** | `user@genova.ai` |

| Paso | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|---|
| Paso 1 | Entrar a `/crear` sin escribir prompt | Botón "Generar OVA" deshabilitado ("Faltan N caracteres para generar") | **PASE** |
| Paso 2 | Escribir un prompt válido (≥ 10 caracteres) | El botón "Generar OVA" se habilita | **PASE** |
| Paso 3 | Pulsar "Configurar recursos 5E" | Muestra el modal con las 5 fases y los tipos de recurso | **PASE** |
| **Problemas encontrados** | Ninguno. | | |
| **Otros comentarios** | Evidencia: `esc4_01`, `esc4_02`, `esc4_03`. | | |

### Caso de Prueba 2.1 — Generación 5E en vivo

| Campo | Valor |
|---|---|
| **Nro de Caso** | 2.1 |
| **Área de Prueba** | Generación (motor Prometheus + worker `arq` + SSE) |
| **Nombre** | Encolado y progreso de la generación del OVA |
| **Rol Usado** | Usuario |
| **Asignado A** | Jeffry A. Romero Uriol |
| **Login Email** | `user@genova.ai` |

| Paso | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|---|
| Paso 1 | Prompt válido + recursos en ≥ 2 fases (engage: Cómic Interactivo, explore: Lectura Interactiva) → "Generar OVA" | Encola el job (HTTP 202) | **PASE** |
| Paso 2 | Observar el workspace tras encolar | Estado "Generando…" con "Los recursos aparecerán aquí a medida que se generen" | **PASE** |
| Paso 3 | Esperar la finalización de la generación | El OVA queda "Listo" con recursos por fase | **PASE** |
| **Problemas encontrados** | **Resuelto.** La generación fresca no completaba porque había **workers duplicados/huérfanos** compitiendo por la misma cola (procesos de sesiones previas). Con un único worker `arq` dedicado, la generación completa correctamente (job `done`, OVA "listo", ~3 min). Evidencia fresca en `esc4_05_resultado_workspace` (OVA de fracciones generado de extremo a extremo). | | |
| **Otros comentarios** | Evidencia: `esc4_04` (en curso) y `esc4_05_resultado_workspace` (completado). Nota: los recursos con imágenes generadas dependen del crédito del proveedor de imágenes (fuera del alcance de la app). | | |

### Caso de Prueba 2.2 — Validación fase↔tipo de recurso (robustez)

| Campo | Valor |
|---|---|
| **Nro de Caso** | 2.2 |
| **Área de Prueba** | Generación / API (`POST /api/ova/jobs`) |
| **Nombre** | Encolado con combinación fase/tipo inválida |
| **Rol Usado** | Usuario |
| **Asignado A** | Jeffry A. Romero Uriol |
| **Login Email** | `user@genova.ai` |

| Paso | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|---|
| Paso 1 | Enviar un recurso con tipo que no pertenece a la fase (p. ej. "Lectura Interactiva" en la fase *Engage*) | El endpoint valida y devuelve un error controlado (422) | **PASE** — devuelve `HTTP 422` "Recurso no válido para la fase 'engage'." |
| Paso 2 | Observar el procesamiento del worker | No se encola nada inválido; el worker no se cae | **PASE** — el job no se crea; sin `ValueError` |
| Paso 3 | Enviar una combinación válida (engage=1, explore=2) | Encola el job (HTTP 202) | **PASE** |
| **Problemas encontrados** | **Resuelto.** El endpoint aceptaba (202) una combinación inválida y el worker crasheaba con `ValueError: int('<nombre>')`. Se añadió validación de pertenencia `resource_type ∈ phase_type` en `StartJobRequest` (helper `resource_exists`), que devuelve **422** antes de encolar (ver §3). | | |
| **Otros comentarios** | Hallazgo de robustez de caja negra, ya corregido. | | |

### Caso de Prueba 2.3 — Carga de archivos base (RAG)

| Campo | Valor |
|---|---|
| **Nro de Caso** | 2.3 |
| **Área de Prueba** | RAG (`/crear` → "Archivos de referencia") |
| **Nombre** | Adjuntar archivo de contexto |
| **Rol Usado** | Usuario |
| **Asignado A** | Jeffry A. Romero Uriol |
| **Login Email** | `user@genova.ai` |

| Paso | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|---|
| Paso 1 | Abrir "Archivos de referencia" | Muestra la zona de carga y los tipos admitidos (PDF/DOCX/PPTX/MP3/WAV/M4A/JPG/PNG/WEBP) | **PASE** |
| Paso 2 | Adjuntar un archivo de tipo permitido (`.png`) | Acepta y muestra el chip con nombre, tamaño y estado de subida | **PASE** |
| **Problemas encontrados** | Ninguno. | | |
| **Otros comentarios** | Evidencia: `esc11_01`, `esc11_02`. | | |

### Caso de Prueba 2.5 — Visualización del OVA en el workspace (5E)

| Campo | Valor |
|---|---|
| **Nro de Caso** | 2.5 |
| **Área de Prueba** | Workspace (`/workspace/:id`) |
| **Nombre** | Visualización de un OVA generado |
| **Rol Usado** | Administrador |
| **Asignado A** | Jeffry A. Romero Uriol |
| **Login Email** | `admin@genova.ai` |

| Paso | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|---|
| Paso 1 | Abrir un OVA "Listo" | Carga el workspace con título, versión y pestañas de recurso | **PASE** |
| Paso 2 | Revisar los recursos por fase | Renderiza el contenido real (título, narrativa, ilustraciones) | **PASE** |
| Paso 3 | Verificar exportación | Muestra el botón "SCORM" | **PASE** |
| **Problemas encontrados** | Ninguno. | | |
| **Otros comentarios** | Evidencia: `esc5_01`, `esc5_02`. | | |

### Caso de Prueba 3.0 — Edición del OVA

| Campo | Valor |
|---|---|
| **Nro de Caso** | 3.0 |
| **Área de Prueba** | Workspace / Edición |
| **Nombre** | Panel de edición (prompt de cambios) |
| **Rol Usado** | Administrador |
| **Asignado A** | Jeffry A. Romero Uriol |
| **Login Email** | `admin@genova.ai` |

| Paso | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|---|
| Paso 1 | Abrir un OVA "Listo" | Muestra el panel con "Regenerar OVA completo" y "Seleccionar recursos" | **PASE** |
| Paso 2 | Escribir una instrucción de cambio en el panel | Habilita "Aplicar" con el prompt escrito | **PASE** |
| **Problemas encontrados** | Ninguno. | | |
| **Otros comentarios** | Evidencia: `esc6_01`. | | |

### Caso de Prueba 3.1 — Exportar OVA como paquete SCORM

| Campo | Valor |
|---|---|
| **Nro de Caso** | 3.1 |
| **Área de Prueba** | SCORM (`/mis-ovas` → "Descargar") |
| **Nombre** | Exportación e integridad del paquete SCORM |
| **Rol Usado** | Administrador |
| **Asignado A** | Jeffry A. Romero Uriol |
| **Login Email** | `admin@genova.ai` |

| Paso | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|---|
| Paso 1 | Localizar un OVA "Listo" | La card muestra "Descargar" habilitado | **PASE** |
| Paso 2 | Pulsar "Descargar" | Descarga un `.zip` (paquete SCORM) | **PASE** |
| Paso 3 | Inspeccionar el `.zip` | Contiene `imsmanifest.xml`, `cmi5.xml`, `index.html` y recursos HTML por fase (9 archivos) | **PASE** |
| **Problemas encontrados** | Ninguno. | | |
| **Otros comentarios** | SCORM 1.2 + capa cmi5/xAPI. Evidencia: `esc7_01`, `esc7_02`. | | |

### Caso de Prueba 3.2 — Gestión de biblioteca (buscar/duplicar/papelera/restaurar)

| Campo | Valor |
|---|---|
| **Nro de Caso** | 3.2 (cubre 3.2–3.5 de la matriz) |
| **Área de Prueba** | Biblioteca (`/mis-ovas`) y Papelera (`/papelera`) |
| **Nombre** | Ciclo de vida del OVA en la biblioteca |
| **Rol Usado** | Administrador |
| **Asignado A** | Jeffry A. Romero Uriol |
| **Login Email** | `admin@genova.ai` |

| Paso | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|---|
| Paso 1 | Buscar un OVA por título | Filtra y muestra las cards | **PASE** |
| Paso 2 | Duplicar el OVA | Crea una copia con sufijo "(copia)"; el total pasa de 10 a 11 | **PASE** |
| Paso 3 | Mover la copia a la papelera y confirmar "Mover" | Desaparece de Mis OVAs y aparece en Papelera ("1 OVA en papelera") | **PASE** |
| Paso 4 | Restaurar la copia | Vuelve a Mis OVAs | **PASE** |
| Paso 5 | Borrar definitivamente la copia | Se elimina de la papelera | **PASE** |
| **Problemas encontrados** | Ninguno. El sufijo "(copia)" se conserva en el dato, aunque el título se trunca visualmente en la card. | | |
| **Otros comentarios** | Operado sobre una copia para no alterar los originales. Evidencia: `esc8_01`…`esc8_05`. | | |

### Caso de Prueba 4.0 — Gestión de usuarios

| Campo | Valor |
|---|---|
| **Nro de Caso** | 4.0 |
| **Área de Prueba** | Admin / Usuarios (`/admin`) |
| **Nombre** | Listado y búsqueda de usuarios |
| **Rol Usado** | Administrador |
| **Asignado A** | Jeffry A. Romero Uriol |
| **Login Email** | `admin@genova.ai` |

| Paso | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|---|
| Paso 1 | Acceder a la gestión de usuarios | Muestra la lista (419 usuarios) con rol, estado y acciones | **PASE** |
| Paso 2 | Buscar por email ("genova.ai") | Filtra la lista de usuarios | **PASE** |
| **Problemas encontrados** | Ninguno. | | |
| **Otros comentarios** | Evidencia: `esc13_01`. | | |

### Caso de Prueba 4.1 — Gestión de roles (listar y crear)

| Campo | Valor |
|---|---|
| **Nro de Caso** | 4.1 (cubre 4.1–4.2 de la matriz) |
| **Área de Prueba** | Admin / Roles (`/admin/roles`) |
| **Nombre** | Listado y creación de roles |
| **Rol Usado** | Administrador |
| **Asignado A** | Jeffry A. Romero Uriol |
| **Login Email** | `admin@genova.ai` |

| Paso | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|---|
| Paso 1 | Acceder a la gestión de roles | Muestra los roles del sistema con sus permisos | **PASE** |
| Paso 2 | Pulsar "Nuevo rol" | Muestra el modal "Crear nuevo rol" (nombre, descripción, permisos Crear/Ver/Exportar OVAs) | **PASE** |
| **Problemas encontrados** | Ninguno. | | |
| **Otros comentarios** | Evidencia: `esc13_02`, `esc13_03`. | | |

### Caso de Prueba 4.3 — Control de acceso por rol (`adminGuard`)

| Campo | Valor |
|---|---|
| **Nro de Caso** | 4.3 |
| **Área de Prueba** | Admin / Seguridad |
| **Nombre** | Restricción de acceso al panel de administración |
| **Rol Usado** | Usuario (no administrador) |
| **Asignado A** | Jeffry A. Romero Uriol |
| **Login Email** | `user@genova.ai` |

| Paso | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|---|
| Paso 1 | Autenticado como usuario no-admin, navegar a `/admin` | El `adminGuard` bloquea y redirige al Dashboard, sin exponer el panel ni la navegación de administración | **PASE** |
| **Problemas encontrados** | Ninguno. | | |
| **Otros comentarios** | Evidencia: `esc13_04`. | | |

### Caso de Prueba 4.4 — Configuración de modelos de IA

| Campo | Valor |
|---|---|
| **Nro de Caso** | 4.4 (cubre 4.4–4.5 de la matriz) |
| **Área de Prueba** | Modelos (`/models`) |
| **Nombre** | Catálogo de modelos y cadena de fallback |
| **Rol Usado** | Administrador |
| **Asignado A** | Jeffry A. Romero Uriol |
| **Login Email** | `admin@genova.ai` |

| Paso | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|---|
| Paso 1 | Acceder a `/models` | Muestra el catálogo ("Proveedores conectados 4/4", modelos favoritos) | **PASE** |
| Paso 2 | Revisar la asignación por tarea | Muestra modelo primario por tarea (Texto → DeepSeek V4 Flash) y su cadena de fallback (Qwen3 → Llama 3.3 → llama-3.1-8b) | **PASE** |
| **Problemas encontrados** | Ninguno. | | |
| **Otros comentarios** | Editable con "Editar cadena". Evidencia: `esc12_01`, `esc12_02`. | | |

### Caso de Prueba 5.0 — Seguridad de la sesión (cookie httpOnly)

| Campo | Valor |
|---|---|
| **Nro de Caso** | 5.0 |
| **Área de Prueba** | Autenticación / Seguridad |
| **Nombre** | Emisión de token de sesión como cookie httpOnly |
| **Rol Usado** | Usuario / Administrador |
| **Asignado A** | Jeffry A. Romero Uriol |
| **Login Email** | `user@genova.ai` / `admin@genova.ai` |

| Paso | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|---|
| Paso 1 | Iniciar sesión y revisar la respuesta | Emite `Set-Cookie: genova_token=…; HttpOnly` (JWT HS256); el frontend no lee el token directamente | **PASE** |
| Paso 2 | Medir latencia de operaciones (login, cambio de contraseña) | Respuestas ~0.2–1.5 s | **PASE** |
| **Problemas encontrados** | Ninguno. | | |
| **Otros comentarios** | El token viaja vía `credentials: 'include'`. | | |

---

## 3. Correcciones aplicadas

Las 3 observaciones de la primera corrida se corrigieron y re-verificaron; los
casos correspondientes quedan en **PASE**.

| # | Caso | Problema | Corrección | Verificación |
|:--:|:--:|---|---|---|
| 1 | 2.3 | El endpoint `POST /api/ova/jobs` aceptaba (202) un `resource_type` que no pertenece a la `phase_type`; el worker crasheaba con `ValueError: int('<nombre>')` y el job quedaba "interrupted". | Se añadió `resource_exists(phase, type)` en `backend/generation/jobs/jobs_materialize.py` y un `model_validator` en `StartJobRequest` (`backend/generation/jobs/jobs_helpers.py`) que valida la pertenencia tipo↔fase y rechaza con **422** antes de encolar. | Combinación inválida → `HTTP 422`; válida → `HTTP 202`. |
| 2 | 2.2 | La generación fresca no completaba (quedaba "interrupted"/"error"). | Causa real: **workers `arq` duplicados/huérfanos** de sesiones previas compitiendo por la cola. Se dejó un único worker dedicado (no requiere cambios de código de la app). | Job `done`, OVA "listo" en ~3 min. Evidencia: `esc4_05_resultado_workspace`. |
| 3 | 1.5 | El botón de cambio de contraseña quedaba en "Actualizando…" indefinidamente (sin feedback). | Las banderas `isSavingProfile/isChangingPassword/isDeletingAccount/deleteAccountError` de `frontend/src/features/profile/pages/profile-page.component.ts` eran **propiedades planas**; con OnPush + zoneless, mutarlas tras un `await` no dispara detección de cambios. Se convirtieron a `signal()` (y el template a `()`). | El botón se restablece al terminar; el cambio se aplica (400/200 verificados). |

## 4. Otros comentarios

- **Corrección verificada:** el subtítulo de la pantalla de login ya no muestra
  el texto heredado del dominio ("curso de ML"); ahora dice "Accede para crear y
  gestionar tus OVAs.".
- Todas las pruebas se ejecutaron sobre el stack real (proveedores LLM y base de
  datos reales). La evidencia (38 capturas) está en
  [`docs/assets/caja-negra-completa/`](../assets/caja-negra-completa) y el
  script reproducible en
  [`tests/capture-caja-negra-completa.mjs`](../../tests/capture-caja-negra-completa.mjs).
- Para el paso a Excel: la sección **1. Matriz de Prueba** corresponde a la
  pestaña *Matriz de prueba*; cada **Caso de Prueba detallado** corresponde a una
  hoja de la pestaña *Caso de Prueba* (una hoja por flujo).
