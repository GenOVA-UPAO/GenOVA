# Casos de prueba funcionales — GenOVA

> Plan de pruebas del sprint 3. Pruebas funcionales de caja negra ejecutadas sobre la **aplicación desplegada** (frontend en https://gen-ova-frontend.vercel.app, backend en Railway y base de datos Supabase). Cada paso se describe desde el arranque: el primero es siempre abrir el navegador e ingresar a la URL de la aplicación. Las evidencias son las capturas de `docs/assets/caja-negra-completa/` referenciadas en los comentarios de cada caso.

| Campo | Valor |
|---|---|
| Plan de pruebas | Sprint 3 |
| Fecha de creación | 18/07/2026 |
| Última actualización | 22/07/2026 |
| Entorno de ejecución | https://gen-ova-frontend.vercel.app (producción) |
| Creado por | Jeffry Anderson Romero Uriol · Juan Diego Carranza Jacinto |
| Casos de prueba | 31 |

## Matriz de pruebas

| Caso | Caso de uso | Área / Módulo | Estado | Severidad | Comentarios |
|---|---|---|:--:|:--:|---|
| 1 | Registro de usuario con validación de campos (nombre, email y contraseña) | Autenticación / Registro | PASE | 2 | Método: partición de equivalencia (clases válidas e inválidas de nombre, email y contraseña). |
| 1.1 | Inicio de sesión con credenciales válidas e inválidas | Autenticación / Login | PASE | 1 | Método: partición de equivalencia. |
| 1.2 | Bloqueo temporal de la cuenta tras intentos fallidos | Autenticación / Login | PASE | 1 | Método: tabla de decisiones sobre el contador de intentos. El bloqueo es temporal y se libera solo. |
| 1.3 | Recuperación de contraseña con protección anti-enumeración | Autenticación / Recuperación | PASE | 2 | Método: tabla de decisiones (correo existente / inexistente). Requisito de seguridad: no revelar la existencia de cuentas. |
| 1.4 | Visualización y edición de los datos del perfil | Perfil | PASE | 3 | Método: partición de equivalencia sobre el nombre. |
| 1.5 | Cambio de contraseña desde el perfil con validaciones | Perfil / Seguridad | PASE | 3 | Método: partición de equivalencia y tabla de decisiones. |
| 1.6 | Restablecimiento de contraseña con validación del token y de la confirmación | Autenticación / Restablecimiento | PASE | 2 | Caso añadido el 22/07/2026 para cubrir un control que no estaba probado. Método: partición de equivalencia sobre el par (contraseña, confirmación) y tabla de decisiones sobre el token. |
| 1.7 | Verificación de la cuenta por correo | Autenticación / Verificación de correo | PASE | 2 | Caso añadido el 22/07/2026. Método: tabla de decisiones sobre la presencia y validez del token. |
| 2 | Creación de OVA con validación del formulario de prompt | Creación de OVA | PASE | 2 | Método: partición de equivalencia sobre la longitud del prompt. |
| 2.1 | Configuración de recursos por fase del modelo 5E | Creación de OVA / Recursos 5E | PASE | 2 | Método: partición de equivalencia sobre el número de fases configuradas. |
| 2.2 | Generación del OVA en vivo (worker y SSE) | Generación | PASE | 2 | Generación real de extremo a extremo con proveedores LLM activos. |
| 2.3 | Validación de la combinación fase y tipo de recurso | Generación / API | PASE | 2 | Método: tabla de decisiones fase × tipo de recurso contra el catálogo RECURSOS_META. La documentación interactiva (/docs) está deshabilitada en producción, así que la comprobación se hace desde la consola del navegador con la sesión activa. |
| 2.4 | Carga de archivos base para el contexto (RAG) | RAG / Archivos de contexto | PASE | 3 | Método: partición de equivalencia sobre el tipo de archivo. |
| 2.5 | Visualización del OVA en el workspace (modelo 5E) | Workspace | PASE | 1 | Evidencia: capturas esc5_01 y esc5_02. |
| 3 | Edición del OVA mediante el panel de cambios | Workspace / Edición | PASE | 2 | Evidencia: captura esc6_01. |
| 3.1 | Exportación del OVA como paquete SCORM | SCORM / Exportación | PASE | 1 | Evidencia: capturas esc7_01 y esc7_02, más el listado del contenido del .zip. |
| 3.2 | Búsqueda de un OVA por título | Biblioteca | PASE | 3 | Evidencia: captura esc8_01. |
| 3.3 | Duplicación de un OVA | Biblioteca | PASE | 3 | Las operaciones destructivas de los casos siguientes se realizan sobre esta copia para no alterar los OVAs originales. |
| 3.4 | Mover un OVA a la papelera (borrado lógico) | Biblioteca / Papelera | PASE | 2 | Evidencia: capturas esc8_03 y esc8_04. |
| 3.5 | Restauración y borrado definitivo de un OVA | Papelera | PASE | 3 | Evidencia: capturas esc8_05 y esc8_06. |
| 4 | Gestión de usuarios (listado y búsqueda) | Admin / Usuarios | PASE | 2 | Requiere rol administrador. |
| 4.1 | Gestión de roles (listado) | Admin / Roles | PASE | 2 | Evidencia: captura esc13_02. |
| 4.2 | Creación de un rol con permisos | Admin / Roles | PASE | 2 | Evidencia: captura esc13_03. |
| 4.3 | Control de acceso por rol (adminGuard) | Admin / Seguridad | PASE | 1 | Método: tabla de decisiones sobre el rol de la sesión. |
| 4.4 | Consulta del catálogo de modelos de IA | Modelos | PASE | 2 | Evidencia: captura esc12_01. |
| 4.5 | Asignación de modelo por tarea y cadena de fallback | Modelos / Cadena de fallback | PASE | 2 | Evidencia: captura esc12_02. |
| 4.6 | Consulta de credenciales de proveedores con enmascarado | Modelos / Credenciales y Perfil / Configuración | PASE | 1 | Caso añadido el 22/07/2026. Requisito de seguridad: los secretos no se exponen en el cliente. |
| 4.7 | Consulta de la analítica de aprendizaje con control de acceso | Analítica | PASE | 2 | Caso añadido el 22/07/2026. Método: tabla de decisiones sobre el permiso del rol. |
| 5 | Sesión con token en cookie httpOnly (JWT) | Autenticación / Seguridad | PASE | 1 | Requisito de seguridad verificado en el registro y en el inicio de sesión. |
| 5.1 | Integridad del paquete SCORM exportado | SCORM / Integridad del paquete | PASE | 1 | Verificación estructural del estándar SCORM 1.2 con capa cmi5/xAPI. |
| 5.2 | Activación del segundo factor de autenticación (TOTP) | Perfil / Seguridad — Segundo factor | PASE | 1 | Caso añadido el 22/07/2026. Método: partición de equivalencia sobre la longitud y validez del código. |

## Grupo 1: Autenticación y gestión de cuenta

### Caso de prueba 1 — Registro de usuario con validación de campos

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Autenticación / Registro (/register) |
| Rol usado | Invitado (sin sesión) |
| Asignado a | Jeffry Anderson Romero Uriol |
| Login email | jromerou2@upao.edu.pe |
| Severidad | 2 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador e ingresar a la aplicación desplegada en https://gen-ova-frontend.vercel.app. La aplicación redirige a la pantalla de inicio de sesión (https://gen-ova-frontend.vercel.app/login) por no haber sesión activa. | Carga la pantalla «Iniciar sesión» con los campos Email y Contraseña, sin errores en la consola del navegador. | PASE |
| Paso 2 | Pulsar el enlace «Crear cuenta» del pie del formulario para navegar a /register. | Carga el formulario de registro con los campos Nombre completo, Email y Contraseña, y el botón «Crear cuenta». | PASE |
| Paso 3 | Con los tres campos vacíos, pulsar el botón «Crear cuenta». | No permite el envío: marca los campos como requeridos y la aplicación permanece en /register. | PASE |
| Paso 4 | Escribir un nombre válido, un email válido y la contraseña «abc» (3 caracteres, sin números). | Rechaza el registro, mantiene el botón «Crear cuenta» deshabilitado y muestra «Mínimo 8 caracteres con letras y números». | PASE |
| Paso 5 | Reemplazar el email por «correo-sin-arroba» (sin arroba ni dominio) y salir del campo. | Marca el campo como inválido y muestra el error de formato de email; no envía la petición. | PASE |
| Paso 6 | Escribir el email ya registrado «user@genova.ai» con la contraseña válida «Clave1234» y pulsar «Crear cuenta». | El backend rechaza el alta porque el email ya existe y la aplicación muestra el mensaje de correo duplicado (HTTP 409). | PASE |
| Paso 7 | Escribir un nombre válido, un email único (por ejemplo «demo.<fecha>@upao.edu.pe») y la contraseña «Clave1234» (mínimo 8 caracteres con letras y números) y pulsar «Crear cuenta». | Crea la cuenta, emite la cookie de sesión httpOnly y redirige al dashboard o muestra el aviso de verificación de correo. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Método: partición de equivalencia (clases válidas e inválidas de nombre, email y contraseña). Evidencia: capturas esc1_01 a esc1_05.

### Caso de prueba 1.1 — Inicio de sesión con credenciales válidas e inválidas

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Autenticación / Login (/login) |
| Rol usado | Usuario |
| Asignado a | Juan Diego Carranza Jacinto |
| Login email | jcarranzaj2@upao.edu.pe |
| Severidad | 1 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador e ingresar a https://gen-ova-frontend.vercel.app/login. | Carga la pantalla «Iniciar sesión» con los campos Email y Contraseña y el botón «Entrar». | PASE |
| Paso 2 | Sin escribir nada, observar el estado del botón «Entrar». | El botón «Entrar» permanece deshabilitado mientras los campos estén vacíos. | PASE |
| Paso 3 | Escribir «correo-invalido» en el campo Email y salir del campo. | La validación del campo marca el email como inválido y el botón sigue deshabilitado. | PASE |
| Paso 4 | Escribir el email válido «user@genova.ai» y la contraseña incorrecta «claveErronea1» y pulsar «Entrar». | No autentica: la aplicación muestra «Credenciales inválidas.» (HTTP 401) y permanece en /login. | PASE |
| Paso 5 | Escribir las credenciales válidas «user@genova.ai» / «user1234password» y pulsar «Entrar». | Autentica, el backend emite la cookie httpOnly genova_token y la aplicación redirige al dashboard. | PASE |
| Paso 6 | Comprobar en el dashboard que la barra superior muestra el usuario autenticado. | El menú de usuario muestra el nombre y el rol de la cuenta con la que se inició sesión. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Método: partición de equivalencia. Evidencia: capturas esc2_01, esc2_02 y esc2_04.

### Caso de prueba 1.2 — Bloqueo temporal de la cuenta por intentos fallidos

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Autenticación / Login (/login) |
| Rol usado | Usuario |
| Asignado a | Jeffry Anderson Romero Uriol |
| Login email | jromerou2@upao.edu.pe |
| Severidad | 1 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador e ingresar a https://gen-ova-frontend.vercel.app/login. | Carga la pantalla de inicio de sesión. | PASE |
| Paso 2 | Escribir el email «user@genova.ai» con una contraseña incorrecta y pulsar «Entrar». | Muestra «Credenciales inválidas.» (HTTP 401) y contabiliza el intento fallido. | PASE |
| Paso 3 | Repetir el intento fallido con la misma cuenta hasta acumular cuatro intentos. | La aplicación sigue respondiendo «Credenciales inválidas.» sin revelar cuántos intentos quedan. | PASE |
| Paso 4 | Realizar el quinto intento fallido consecutivo sobre la misma cuenta. | La cuenta queda bloqueada de forma temporal y la aplicación muestra «Cuenta bloqueada. Intenta de nuevo en N minuto(s).» (HTTP 403). | PASE |
| Paso 5 | Intentar entrar con la contraseña CORRECTA mientras dura el bloqueo. | El backend sigue rechazando el acceso con el mensaje de cuenta bloqueada: el bloqueo no depende de que la contraseña sea correcta. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Método: tabla de decisiones sobre el contador de intentos. El bloqueo es temporal y se libera solo. Evidencia: captura esc2_03.

### Caso de prueba 1.3 — Solicitud de recuperación de contraseña con protección anti-enumeración

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Autenticación / Recuperación (/forgot-password) |
| Rol usado | Invitado (sin sesión) |
| Asignado a | Juan Diego Carranza Jacinto |
| Login email | jcarranzaj2@upao.edu.pe |
| Severidad | 2 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador e ingresar a https://gen-ova-frontend.vercel.app/login. | Carga la pantalla de inicio de sesión. | PASE |
| Paso 2 | Pulsar el enlace «¿Olvidaste tu contraseña?» para navegar a /forgot-password. | Carga la pantalla de recuperación con el campo Email y el botón de envío. | PASE |
| Paso 3 | Escribir un correo que NO existe en el sistema (por ejemplo «no-existe@upao.edu.pe») y enviar la solicitud. | Responde con un mensaje genérico de confirmación que no revela si el correo está registrado (protección contra enumeración de cuentas). | PASE |
| Paso 4 | Repetir el envío con un correo que SÍ existe («user@genova.ai»). | Muestra exactamente el mismo mensaje genérico que en el paso anterior: desde fuera, ambos casos son indistinguibles. | PASE |
| Paso 5 | Inspeccionar la respuesta HTTP de /api/auth/forgot-password en el panel de red del navegador. | El cuerpo de la respuesta no contiene el token de restablecimiento: el enlace solo viaja por correo. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Método: tabla de decisiones (correo existente / inexistente). Requisito de seguridad: no revelar la existencia de cuentas. Evidencia: capturas esc3_01 y esc3_02.

### Caso de prueba 1.4 — Visualización y edición de los datos del perfil

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Perfil (/profile) |
| Rol usado | Usuario |
| Asignado a | Jeffry Anderson Romero Uriol |
| Login email | jromerou2@upao.edu.pe |
| Severidad | 3 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login y autenticarse con «user@genova.ai» / «user1234password». | Autentica y redirige al dashboard. | PASE |
| Paso 2 | Abrir el menú de usuario de la barra superior y pulsar «Perfil» (o navegar a /profile). | Carga la pantalla de perfil en la pestaña «Información» con los datos de la cuenta: nombre, correo, rol y fecha de alta. | PASE |
| Paso 3 | Modificar el campo «Nombre completo» por un valor válido distinto y pulsar «Guardar Cambios». | Acepta el cambio, lo persiste en el backend y muestra el aviso de guardado. | PASE |
| Paso 4 | Recargar la página con F5 y volver a la pestaña «Información». | El nombre actualizado se mantiene tras recargar: el cambio quedó persistido y no solo en memoria. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Método: partición de equivalencia sobre el nombre. Evidencia: capturas esc9_01 y esc9_02.

### Caso de prueba 1.5 — Cambio de contraseña desde el perfil con validaciones

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Perfil / Seguridad (/profile) |
| Rol usado | Usuario |
| Asignado a | Juan Diego Carranza Jacinto |
| Login email | jcarranzaj2@upao.edu.pe |
| Severidad | 3 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login y autenticarse con una cuenta de prueba creada para este caso. | Autentica y redirige al dashboard. | PASE |
| Paso 2 | Navegar a /profile y pulsar la pestaña «Seguridad». | Muestra el bloque «Seguridad de la Cuenta» con los campos Contraseña actual, Nueva contraseña y Confirmar nueva contraseña. | PASE |
| Paso 3 | Escribir una contraseña actual INCORRECTA junto a una nueva contraseña válida y pulsar «Actualizar Contraseña». | El backend rechaza el cambio con HTTP 400 «La contraseña actual ingresada es incorrecta.» y no modifica la contraseña. | PASE |
| Paso 4 | Escribir la contraseña actual correcta y «abc» como nueva contraseña. | La validación en línea muestra «Debe tener al menos 8 caracteres.» y mantiene deshabilitado el botón «Actualizar Contraseña». | PASE |
| Paso 5 | Escribir la contraseña actual correcta y una nueva contraseña válida y coincidente en los dos campos, y pulsar «Actualizar Contraseña». | El backend responde HTTP 200 «Contraseña actualizada con éxito.», aplica el cambio y el botón vuelve a habilitarse. | PASE |
| Paso 6 | Cerrar sesión e iniciarla de nuevo con la contraseña nueva. | La cuenta autentica con la contraseña nueva: el cambio surtió efecto. | PASE |

**Problemas encontrados:** Se detectó y corrigió que el botón quedaba en «Actualizando…» de forma indefinida (detección de cambios con OnPush + zoneless). Re-verificado.

**Otros comentarios:** Método: partición de equivalencia y tabla de decisiones. Evidencia: capturas esc10_01 a esc10_03.

### Caso de prueba 1.6 — Definición de la nueva contraseña desde el enlace de recuperación

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Autenticación / Restablecimiento (/reset-password) |
| Rol usado | Invitado (sin sesión) |
| Asignado a | Jeffry Anderson Romero Uriol |
| Login email | jromerou2@upao.edu.pe |
| Severidad | 2 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador e ingresar a https://gen-ova-frontend.vercel.app/reset-password SIN el parámetro token en la URL. | No muestra el formulario: informa de que el enlace no incluye un token válido y ofrece el enlace «Solicitar nuevo enlace». | PASE |
| Paso 2 | Ingresar ahora a https://gen-ova-frontend.vercel.app/reset-password?token=token-de-prueba-invalido. | Muestra el formulario «Nueva contraseña» con los campos Nueva contraseña y Confirmar contraseña. | PASE |
| Paso 3 | Escribir «abc» en ambos campos y salir del campo. | La política de contraseña rechaza el valor y el botón «Guardar contraseña» permanece deshabilitado. | PASE |
| Paso 4 | Escribir «NuevaClave1234» en Nueva contraseña y «OtraClave5678» en Confirmar contraseña. | Marca el campo de confirmación en rojo y muestra «Las contraseñas no coinciden»; no envía la petición. | PASE |
| Paso 5 | Corregir la confirmación para que ambas coincidan y pulsar «Guardar contraseña». | El formulario sí envía y es el backend quien rechaza el restablecimiento por token inválido o caducado. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Caso añadido el 22/07/2026 para cubrir un control que no estaba probado. Método: partición de equivalencia sobre el par (contraseña, confirmación) y tabla de decisiones sobre el token. Evidencia: capturas esc14_01 a esc14_04.

### Caso de prueba 1.7 — Activación de la cuenta desde el enlace de verificación

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Autenticación / Verificación de correo (/verify-email) |
| Rol usado | Invitado (sin sesión) |
| Asignado a | Juan Diego Carranza Jacinto |
| Login email | jcarranzaj2@upao.edu.pe |
| Severidad | 2 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador e ingresar a https://gen-ova-frontend.vercel.app/verify-email SIN el parámetro token en la URL. | Muestra el estado «No se pudo verificar» con el motivo, sin activar ninguna cuenta. | PASE |
| Paso 2 | Ingresar a https://gen-ova-frontend.vercel.app/verify-email?token=token-de-prueba-invalido. | La pantalla pasa por el estado «Verificando tu correo…» y termina en «No se pudo verificar»: el backend rechaza el token. | PASE |
| Paso 3 | Comprobar el mensaje mostrado en el caso anterior. | El mensaje no indica si el token existió alguna vez ni a qué cuenta pertenece: no filtra información. | PASE |
| Paso 4 | Pulsar la acción de volver al inicio de sesión que ofrece la pantalla. | Navega a /login sin haber alterado el estado de ninguna cuenta. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Caso añadido el 22/07/2026. Método: tabla de decisiones sobre la presencia y validez del token. Evidencia: capturas esc15_01 y esc15_02.

## Grupo 2: Generación de OVA (modelo 5E)

### Caso de prueba 2 — Validación del formulario de creación de OVA

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Creación de OVA (/crear) |
| Rol usado | Usuario |
| Asignado a | Jeffry Anderson Romero Uriol |
| Login email | jromerou2@upao.edu.pe |
| Severidad | 2 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login y autenticarse con «user@genova.ai» / «user1234password». | Autentica y redirige al dashboard. | PASE |
| Paso 2 | Pulsar «Crear OVA» en la barra superior o en el menú lateral para navegar a /crear. | Carga la pantalla «Crear nuevo OVA» con el área de texto del prompt, la sección de recursos por fase y el botón «Generar OVA». | PASE |
| Paso 3 | Observar el botón «Generar OVA» con el prompt vacío. | El botón permanece deshabilitado y la ayuda indica «Faltan N caracteres para generar». | PASE |
| Paso 4 | Escribir un prompt corto (menos del mínimo exigido) en el área de texto. | El botón sigue deshabilitado y el contador de caracteres que faltan se actualiza. | PASE |
| Paso 5 | Escribir un prompt válido, por ejemplo «Redes neuronales para estudiantes de pregrado de Ingeniería». | El contador desaparece y el botón «Generar OVA» se habilita. | PASE |
| Paso 6 | Pulsar el botón de ayuda (icono de interrogación) de la barra de herramientas. | Vuelve a lanzarse la visita guiada de tres pasos (prompt → configuración → generar). | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Método: partición de equivalencia sobre la longitud del prompt. Evidencia: capturas esc4_01 y esc4_02.

### Caso de prueba 2.1 — Configuración de recursos por fase del modelo 5E

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Creación de OVA / Recursos 5E (/crear) |
| Rol usado | Usuario |
| Asignado a | Juan Diego Carranza Jacinto |
| Login email | jcarranzaj2@upao.edu.pe |
| Severidad | 2 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login, autenticarse y navegar a /crear. | Carga la pantalla «Crear nuevo OVA» con el prompt vacío. | PASE |
| Paso 2 | Escribir un prompt válido en el área de texto. | El botón «Generar OVA» se habilita. | PASE |
| Paso 3 | Pulsar «Configurar recursos» para abrir el modal de configuración por fase. | Muestra el modal con las cinco fases del modelo 5E: Engage, Explore, Explain, Elaborate y Evaluate. | PASE |
| Paso 4 | Seleccionar una fase, por ejemplo Engage, y revisar los tipos de recurso disponibles. | Lista los tipos de recurso admitidos por esa fase (por ejemplo «Cómic Interactivo») con su vista previa. | PASE |
| Paso 5 | Seleccionar un tipo de recurso en Engage y otro en Explore, y cerrar el modal. | La pantalla de creación refleja los recursos elegidos por fase y mantiene el botón «Generar OVA» habilitado. | PASE |
| Paso 6 | Dejar seleccionada una sola fase y observar la ayuda del botón «Generar OVA». | Avisa de que se requieren recursos en al menos dos fases antes de poder generar. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Método: partición de equivalencia sobre el número de fases configuradas. Evidencia: captura esc4_03.

### Caso de prueba 2.2 — Generación del OVA en vivo con seguimiento del progreso

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Generación (worker y SSE) |
| Rol usado | Usuario |
| Asignado a | Jeffry Anderson Romero Uriol |
| Login email | jromerou2@upao.edu.pe |
| Severidad | 2 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login, autenticarse y navegar a /crear. | Carga la pantalla de creación. | PASE |
| Paso 2 | Escribir un prompt válido, configurar recursos en al menos dos fases y pulsar «Generar OVA». | La aplicación encola el trabajo (HTTP 202) y navega al workspace del OVA en generación. | PASE |
| Paso 3 | Observar el panel de progreso mientras el worker procesa el trabajo. | Muestra el estado «Generando…» con el aviso «Los recursos aparecerán aquí a medida que se generen» y el progreso en vivo por SSE. | PASE |
| Paso 4 | Esperar a que termine la generación sin recargar la página. | Los recursos aparecen conforme se completan, sin necesidad de refrescar: la conexión SSE actualiza la vista. | PASE |
| Paso 5 | Comprobar el estado final del OVA en el workspace y en /mis-ovas. | El OVA queda en estado «Listo» con su contenido 5E renderizado, y aparece como listo en la biblioteca. | PASE |

**Problemas encontrados:** Requiere el proceso worker (arq) en ejecución además del backend; sin él el trabajo queda encolado indefinidamente.

**Otros comentarios:** Generación real de extremo a extremo con proveedores LLM activos. Evidencia: capturas esc4_04 y esc4_05.

### Caso de prueba 2.3 — Validación de la combinación de fase y tipo de recurso

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Generación / API (POST /api/jobs) |
| Rol usado | Usuario |
| Asignado a | Juan Diego Carranza Jacinto |
| Login email | jcarranzaj2@upao.edu.pe |
| Severidad | 2 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login y autenticarse con «user@genova.ai» / «user1234password». | Autentica y el backend emite la cookie httpOnly genova_token para el dominio de la API. | PASE |
| Paso 2 | Abrir las herramientas de desarrollo del navegador (F12) y situarse en la pestaña Consola, sin salir del dominio de la aplicación. | La consola queda lista para lanzar peticiones con la sesión ya iniciada. | PASE |
| Paso 3 | Enviar una petición a POST /api/jobs de la API desplegada con una combinación inválida: el recurso «Lectura Interactiva» dentro de la fase «engage». | El backend responde HTTP 422 con «Recurso no válido para la fase 'engage'.» y NO encola el trabajo. | PASE |
| Paso 4 | Repetir la petición con la combinación válida: «Lectura Interactiva» en la fase «explore». | El backend responde HTTP 202 y encola el trabajo con normalidad, devolviendo su identificador. | PASE |
| Paso 5 | Consultar el estado de ese trabajo en GET /api/jobs/{job_id} con el identificador devuelto. | El trabajo progresa sin errores: la validación previa evita que el worker caiga con una combinación imposible. | PASE |

**Problemas encontrados:** Se detectó y corrigió que la combinación inválida se aceptaba con HTTP 202 y el worker fallaba después dejando el trabajo interrumpido.

**Otros comentarios:** Método: tabla de decisiones fase × tipo de recurso contra el catálogo RECURSOS_META. La documentación interactiva (/docs) está deshabilitada en producción, así que la comprobación se hace desde la consola del navegador con la sesión activa.

### Caso de prueba 2.4 — Carga de archivos base para el contexto (RAG)

| Campo | Valor |
|---|---|
| Área/módulo de prueba | RAG / Archivos de contexto (/crear) |
| Rol usado | Usuario |
| Asignado a | Jeffry Anderson Romero Uriol |
| Login email | jromerou2@upao.edu.pe |
| Severidad | 3 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login, autenticarse y navegar a /crear. | Carga la pantalla de creación. | PASE |
| Paso 2 | Desplegar la sección de archivos de referencia del formulario. | Muestra la zona de carga con los formatos admitidos (PDF, DOCX, PPTX, MP3, WAV, M4A, JPG, PNG y WEBP) y el límite de 5 archivos. | PASE |
| Paso 3 | Adjuntar un archivo de un tipo aceptado, por ejemplo una imagen .png. | Acepta el archivo y muestra su chip con el nombre, el tamaño y el estado de subida (1 de 5). | PASE |
| Paso 4 | Comprobar el indicador de indexado del archivo adjuntado. | El archivo queda subido e indexado para RAG y disponible como contexto de la generación. | PASE |
| Paso 5 | Quitar el archivo con la acción de eliminar de su chip. | El chip desaparece y el contador vuelve a 0 de 5. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Método: partición de equivalencia sobre el tipo de archivo. Evidencia: capturas esc11_01 y esc11_02.

### Caso de prueba 2.5 — Visualización del OVA generado en el workspace

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Workspace (/workspace/:id) |
| Rol usado | Usuario |
| Asignado a | Juan Diego Carranza Jacinto |
| Login email | jcarranzaj2@upao.edu.pe |
| Severidad | 1 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login y autenticarse. | Autentica y redirige al dashboard. | PASE |
| Paso 2 | Navegar a «Mis OVAs» y localizar un OVA en estado «Listo». | La biblioteca muestra las tarjetas de los OVAs con su estado. | PASE |
| Paso 3 | Pulsar «Editar» en la tarjeta para abrir el workspace del OVA. | Carga el workspace con el título del OVA, la versión (v1) y las pestañas de recurso. | PASE |
| Paso 4 | Recorrer las pestañas de recurso generadas, por ejemplo «Cómic Interactivo» y «Preguntas de Desarrollo». | Cada recurso se renderiza con su contenido real: título, narrativa y las ilustraciones generadas. | PASE |
| Paso 5 | Comprobar la presencia del botón de exportación en la cabecera del workspace. | El workspace expone el botón «SCORM» para exportar el paquete. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Evidencia: capturas esc5_01 y esc5_02.

## Grupo 3: Edición, exportación y biblioteca

### Caso de prueba 3 — Edición del OVA mediante el panel de cambios

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Workspace / Edición (/workspace/:id) |
| Rol usado | Usuario |
| Asignado a | Jeffry Anderson Romero Uriol |
| Login email | jromerou2@upao.edu.pe |
| Severidad | 2 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login, autenticarse y abrir un OVA «Listo» desde «Mis OVAs». | Carga el workspace del OVA con sus recursos. | PASE |
| Paso 2 | Abrir el panel de edición lateral del workspace. | Muestra el panel con el área de instrucciones y las acciones «Regenerar» y «Seleccionar recursos». | PASE |
| Paso 3 | Pulsar «Seleccionar recursos» y marcar uno de los recursos como contexto del cambio. | El panel refleja el recurso seleccionado y lo usa como alcance de la instrucción. | PASE |
| Paso 4 | Escribir una instrucción de cambio, por ejemplo «Añade un ejemplo aplicado al final», y revisar el botón «Aplicar». | El panel queda listo para aplicar el cambio con la instrucción escrita y el recurso seleccionado. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Evidencia: captura esc6_01.

### Caso de prueba 3.1 — Exportación del OVA como paquete SCORM

| Campo | Valor |
|---|---|
| Área/módulo de prueba | SCORM / Exportación (/mis-ovas) |
| Rol usado | Usuario |
| Asignado a | Juan Diego Carranza Jacinto |
| Login email | jcarranzaj2@upao.edu.pe |
| Severidad | 1 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login y autenticarse. | Autentica y redirige al dashboard. | PASE |
| Paso 2 | Navegar a «Mis OVAs» y localizar un OVA en estado «Listo». | La tarjeta del OVA muestra el botón «Descargar» habilitado. | PASE |
| Paso 3 | Pulsar «Descargar» en la tarjeta del OVA. | La aplicación genera el paquete y el navegador descarga un archivo .zip. | PASE |
| Paso 4 | Abrir el .zip descargado y revisar su contenido. | Contiene imsmanifest.xml, index.html, cmi5.xml y los recursos HTML por fase (resources/recurso_1.html, resources/recurso_2.html): 9 archivos en total. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Evidencia: capturas esc7_01 y esc7_02, más el listado del contenido del .zip.

### Caso de prueba 3.2 — Búsqueda de un OVA por título

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Biblioteca (/mis-ovas) |
| Rol usado | Usuario |
| Asignado a | Jeffry Anderson Romero Uriol |
| Login email | jromerou2@upao.edu.pe |
| Severidad | 3 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login y autenticarse. | Autentica y redirige al dashboard. | PASE |
| Paso 2 | Navegar a «Mis OVAs» desde el menú lateral. | Muestra la biblioteca con las tarjetas de los OVAs del usuario y el contador total. | PASE |
| Paso 3 | Escribir en el buscador una palabra contenida en el título de un OVA existente. | El listado se filtra y deja visibles solo las tarjetas cuyo título coincide. | PASE |
| Paso 4 | Borrar el texto del buscador. | Se restablece el listado completo de la biblioteca. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Evidencia: captura esc8_01.

### Caso de prueba 3.3 — Duplicación de un OVA existente

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Biblioteca (/mis-ovas) |
| Rol usado | Usuario |
| Asignado a | Juan Diego Carranza Jacinto |
| Login email | jcarranzaj2@upao.edu.pe |
| Severidad | 3 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login, autenticarse y navegar a «Mis OVAs». | Muestra la biblioteca y su contador (10 OVAs en la corrida documentada). | PASE |
| Paso 2 | Abrir el menú de acciones de la tarjeta de un OVA y pulsar «Duplicar». | La aplicación crea una copia del OVA con el sufijo «(copia)». | PASE |
| Paso 3 | Comprobar el contador de la biblioteca y la nueva tarjeta. | El total aumenta de 10 a 11 y la copia aparece en el listado (el título se trunca visualmente en la tarjeta, pero el sufijo se conserva en el dato). | PASE |
| Paso 4 | Abrir la copia para comprobar su contenido. | La copia conserva las fases y los recursos del OVA original. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Las operaciones destructivas de los casos siguientes se realizan sobre esta copia para no alterar los OVAs originales. Evidencia: captura esc8_02.

### Caso de prueba 3.4 — Envío de un OVA a la papelera (borrado lógico)

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Biblioteca / Papelera (/mis-ovas → /papelera) |
| Rol usado | Usuario |
| Asignado a | Jeffry Anderson Romero Uriol |
| Login email | jromerou2@upao.edu.pe |
| Severidad | 2 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login, autenticarse y navegar a «Mis OVAs». | Muestra la biblioteca con la copia creada en el caso 3.3. | PASE |
| Paso 2 | Abrir el menú de acciones de la copia y pulsar «Eliminar». | Muestra el diálogo de confirmación explicando que el OVA se moverá a la papelera. | PASE |
| Paso 3 | Confirmar la acción con el botón «Mover». | La copia desaparece de «Mis OVAs» y el contador de la biblioteca se reduce. | PASE |
| Paso 4 | Navegar a «Papelera» en el menú lateral. | La copia aparece en la papelera con estado «Borrador» y su fecha de eliminación («1 OVA en papelera»): el borrado es lógico, no definitivo. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Evidencia: capturas esc8_03 y esc8_04.

### Caso de prueba 3.5 — Restauración y borrado definitivo de un OVA

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Papelera (/papelera) |
| Rol usado | Usuario |
| Asignado a | Juan Diego Carranza Jacinto |
| Login email | jcarranzaj2@upao.edu.pe |
| Severidad | 3 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login, autenticarse y navegar a «Papelera». | Muestra la copia enviada a la papelera en el caso 3.4. | PASE |
| Paso 2 | Pulsar «Restaurar» en la tarjeta de la copia. | La copia sale de la papelera y vuelve a aparecer en «Mis OVAs». | PASE |
| Paso 3 | Volver a enviarla a la papelera y, ya en /papelera, pulsar «Eliminar definitivamente». | Muestra el diálogo de confirmación advirtiendo de que la acción es irreversible. | PASE |
| Paso 4 | Confirmar el borrado definitivo. | La copia desaparece de la papelera y de la biblioteca: se elimina el registro y su paquete SCORM asociado. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Evidencia: capturas esc8_05 y esc8_06.

## Grupo 4: Administración y configuración

### Caso de prueba 4 — Gestión de usuarios: listado y búsqueda

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Admin / Usuarios (/admin) |
| Rol usado | Administrador |
| Asignado a | Jeffry Anderson Romero Uriol |
| Login email | jromerou2@upao.edu.pe |
| Severidad | 2 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login y autenticarse con «admin@genova.ai» / «admin1234password». | Autentica como administrador y redirige al dashboard, con la sección «Administración» visible en el menú lateral. | PASE |
| Paso 2 | Pulsar «Administración → Usuarios» para navegar a /admin. | Carga el panel con la tabla de usuarios paginada y el contador total (419 usuarios en la corrida documentada). | PASE |
| Paso 3 | Escribir un correo parcial en el buscador de la tabla. | La tabla filtra y muestra solo los usuarios cuyo correo coincide. | PASE |
| Paso 4 | Abrir el selector de rol de un usuario de la lista. | Ofrece los roles disponibles del sistema para reasignar al usuario. | PASE |
| Paso 5 | Cerrar el selector sin confirmar el cambio. | El usuario conserva su rol original: la acción solo se aplica al confirmar. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Requiere rol administrador. Evidencia: captura esc13_01.

### Caso de prueba 4.1 — Consulta de los roles del sistema y sus permisos

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Admin / Roles (/admin/roles) |
| Rol usado | Administrador |
| Asignado a | Juan Diego Carranza Jacinto |
| Login email | jcarranzaj2@upao.edu.pe |
| Severidad | 2 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login y autenticarse como administrador. | Autentica y redirige al dashboard. | PASE |
| Paso 2 | Navegar a «Administración → Roles» (/admin/roles). | Muestra la lista de roles del sistema: administrador, profesor, estudiante, usuario y usuarios_prueba. | PASE |
| Paso 3 | Abrir el detalle de un rol del sistema. | Muestra los permisos asociados a ese rol. | PASE |
| Paso 4 | Intentar editar un rol del sistema. | Los roles del sistema no son editables: la interfaz no ofrece la acción de edición para ellos. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Evidencia: captura esc13_02.

### Caso de prueba 4.2 — Creación de un rol con permisos

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Admin / Roles (/admin/roles) |
| Rol usado | Administrador |
| Asignado a | Jeffry Anderson Romero Uriol |
| Login email | jromerou2@upao.edu.pe |
| Severidad | 2 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login, autenticarse como administrador y navegar a /admin/roles. | Muestra la lista de roles. | PASE |
| Paso 2 | Pulsar «Crear rol». | Abre el modal «Crear nuevo rol» con los campos Nombre y Descripción y la lista de permisos (Crear, Ver y Exportar OVAs, entre otros). | PASE |
| Paso 3 | Enviar el formulario con el campo Nombre vacío. | No crea el rol: la validación exige el nombre. | PASE |
| Paso 4 | Escribir el nombre de un rol que ya existe y enviar. | El backend rechaza la creación por nombre duplicado. | PASE |
| Paso 5 | Escribir un nombre único, marcar al menos un permiso y confirmar la creación. | Crea el rol y lo muestra en la lista con los permisos seleccionados. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Evidencia: captura esc13_03.

### Caso de prueba 4.3 — Control de acceso al panel de administración por rol

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Admin / Seguridad (adminGuard) |
| Rol usado | Usuario sin rol administrador |
| Asignado a | Juan Diego Carranza Jacinto |
| Login email | jcarranzaj2@upao.edu.pe |
| Severidad | 1 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login y autenticarse con la cuenta SIN rol administrador «user@genova.ai». | Autentica y redirige al dashboard. | PASE |
| Paso 2 | Revisar el menú lateral de la aplicación. | No aparece la sección «Administración»: la navegación no expone opciones que la cuenta no puede usar. | PASE |
| Paso 3 | Escribir directamente la URL /admin en la barra de direcciones y pulsar Entrar. | El adminGuard bloquea el acceso y redirige la navegación al Dashboard, sin renderizar el panel. | PASE |
| Paso 4 | Repetir la prueba con la ruta /admin/roles. | El resultado es el mismo: redirección al Dashboard sin exponer datos de administración. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Método: tabla de decisiones sobre el rol de la sesión. Evidencia: captura esc13_04.

### Caso de prueba 4.4 — Consulta del catálogo de modelos de IA

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Modelos (/models) |
| Rol usado | Administrador |
| Asignado a | Jeffry Anderson Romero Uriol |
| Login email | jromerou2@upao.edu.pe |
| Severidad | 2 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login y autenticarse como administrador. | Autentica y redirige al dashboard. | PASE |
| Paso 2 | Navegar a «Modelos» (/models) desde el menú lateral. | Carga la pantalla de modelos con la franja de estado y las pestañas Modelos, Credenciales y Plataforma. | PASE |
| Paso 3 | Revisar el indicador de proveedores conectados de la franja de estado. | Muestra «Proveedores conectados 4/4» y los modelos marcados como favoritos. | PASE |
| Paso 4 | Abrir el catálogo completo con «Abrir catálogo» y aplicar un filtro por modalidad. | El catálogo filtra los modelos por la modalidad elegida (texto, imagen, audio, vídeo o embedding). | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Evidencia: captura esc12_01.

### Caso de prueba 4.5 — Asignación de modelo por tarea y cadena de respaldo

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Modelos / Cadena de fallback (/models) |
| Rol usado | Administrador |
| Asignado a | Juan Diego Carranza Jacinto |
| Login email | jcarranzaj2@upao.edu.pe |
| Severidad | 2 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login, autenticarse como administrador y navegar a /models. | Carga la pantalla de modelos en la pestaña «Modelos». | PASE |
| Paso 2 | Revisar la tarea «Texto» en la lista de tareas. | Muestra el modelo primario asignado (por ejemplo «DeepSeek V4 Flash») y su cadena de respaldo (Qwen3 → Meta Llama 3.3 → llama-3.1-8b). | PASE |
| Paso 3 | Pulsar «Editar cadena» en esa tarea. | Solo entonces se despliega la fila de configuración avanzada con los modelos de la cadena. | PASE |
| Paso 4 | Modificar el orden de la cadena de respaldo. | La barra de guardado aparece indicando que hay cambios sin guardar. | PASE |
| Paso 5 | Descartar los cambios sin guardar. | La cadena vuelve a su configuración original y la barra de guardado desaparece. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Evidencia: captura esc12_02.

### Caso de prueba 4.6 — Consulta de las credenciales de proveedores de IA

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Modelos / Credenciales y Perfil / Configuración |
| Rol usado | Administrador |
| Asignado a | Jeffry Anderson Romero Uriol |
| Login email | jromerou2@upao.edu.pe |
| Severidad | 1 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login y autenticarse como administrador. | Autentica y redirige al dashboard. | PASE |
| Paso 2 | Navegar a /models y pulsar la pestaña «Credenciales». | Muestra el estado de conexión por proveedor (Groq, OpenRouter, Gemini y demás) con sus claves enmascaradas. | PASE |
| Paso 3 | Comprobar si alguna clave se muestra en claro en pantalla. | Ninguna clave se muestra completa: solo el estado de conexión y una versión enmascarada. | PASE |
| Paso 4 | Navegar a /profile y abrir la pestaña «Configuración». | Muestra la tarjeta de claves propias del usuario, también enmascaradas. | PASE |
| Paso 5 | Inspeccionar la respuesta de GET /api/users/me/api-keys en el panel de red del navegador. | La respuesta no devuelve el valor de la clave: el secreto no viaja al cliente. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Caso añadido el 22/07/2026. Requisito de seguridad: los secretos no se exponen en el cliente. Evidencia: capturas esc17_01 y esc17_02.

### Caso de prueba 4.7 — Panel de analítica de aprendizaje y su control de acceso

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Analítica (/analytics) |
| Rol usado | Administrador y usuario sin permiso |
| Asignado a | Juan Diego Carranza Jacinto |
| Login email | jcarranzaj2@upao.edu.pe |
| Severidad | 2 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login y autenticarse con una cuenta con permiso de analítica (administrador). | Autentica y redirige al dashboard. | PASE |
| Paso 2 | Navegar a /analytics. | Carga la pantalla «Analítica de aprendizaje» con las métricas agregadas de la cuenta. | PASE |
| Paso 3 | Revisar las métricas mostradas en el panel. | Presenta los indicadores agregados de uso, sin exponer datos de otras cuentas. | PASE |
| Paso 4 | Cerrar sesión e iniciar sesión con la cuenta «user@genova.ai», que no tiene el permiso. | Autentica y redirige al dashboard. | PASE |
| Paso 5 | Navegar de nuevo a /analytics con esa cuenta. | La aplicación deniega el acceso y avisa al usuario, sin mostrar ninguna métrica. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Caso añadido el 22/07/2026. Método: tabla de decisiones sobre el permiso del rol. Evidencia: capturas esc18_01 y esc18_02.

## Grupo 5: Seguridad y no funcionales

### Caso de prueba 5 — Sesión con token en cookie httpOnly (JWT)

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Autenticación / Seguridad (cookie httpOnly) |
| Rol usado | Usuario |
| Asignado a | Jeffry Anderson Romero Uriol |
| Login email | jromerou2@upao.edu.pe |
| Severidad | 1 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login y abrir las herramientas de desarrollo en la pestaña de red. | Carga la pantalla de inicio de sesión con el panel de red registrando las peticiones. | PASE |
| Paso 2 | Autenticarse con «user@genova.ai» / «user1234password» y localizar la respuesta de POST /api/auth/login. | La respuesta incluye la cabecera Set-Cookie con genova_token y los atributos HttpOnly, Secure y SameSite. | PASE |
| Paso 3 | Abrir la consola del navegador y ejecutar document.cookie. | El token no aparece: al ser httpOnly, el JavaScript de la página no puede leerlo (protección frente a XSS). | PASE |
| Paso 4 | Navegar a una ruta protegida como /mis-ovas y revisar la petición en el panel de red. | La cookie viaja automáticamente en la petición y el backend responde 200: la sesión se mantiene sin guardar el token en localStorage. | PASE |
| Paso 5 | Pulsar «Cerrar sesión» y volver a intentar entrar a /mis-ovas. | El backend revoca el token, la cookie se borra y la aplicación redirige al inicio de sesión. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Requisito de seguridad verificado en el registro y en el inicio de sesión.

### Caso de prueba 5.1 — Integridad del paquete SCORM exportado

| Campo | Valor |
|---|---|
| Área/módulo de prueba | SCORM / Integridad del paquete |
| Rol usado | Usuario |
| Asignado a | Juan Diego Carranza Jacinto |
| Login email | jcarranzaj2@upao.edu.pe |
| Severidad | 1 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login, autenticarse y descargar el paquete de un OVA «Listo» desde «Mis OVAs». | El navegador descarga el archivo .zip del paquete SCORM. | PASE |
| Paso 2 | Descomprimir el .zip y listar su contenido. | Contiene imsmanifest.xml, index.html, cmi5.xml y la carpeta resources con un HTML por recurso: 9 archivos en total. | PASE |
| Paso 3 | Abrir imsmanifest.xml y comprobar que cada recurso declarado existe en el paquete. | Todas las referencias del manifiesto apuntan a archivos presentes: no hay recursos declarados que falten. | PASE |
| Paso 4 | Abrir index.html en el navegador. | El paquete se abre y navega entre los recursos de las fases sin errores. | PASE |

**Problemas encontrados:** Ninguno.

**Otros comentarios:** Verificación estructural del estándar SCORM 1.2 con capa cmi5/xAPI.

### Caso de prueba 5.2 — Alta del segundo factor de autenticación (2FA/TOTP)

| Campo | Valor |
|---|---|
| Área/módulo de prueba | Perfil / Seguridad — Segundo factor (/profile) |
| Rol usado | Usuario |
| Asignado a | Jeffry Anderson Romero Uriol |
| Login email | jromerou2@upao.edu.pe |
| Severidad | 1 |

| Workflow | Datos | Resultado esperado | Resultado de la prueba |
|---|---|---|:--:|
| Paso 1 | Abrir el navegador, ingresar a https://gen-ova-frontend.vercel.app/login y autenticarse con «user@genova.ai» / «user1234password». | Autentica y redirige al dashboard. | PASE |
| Paso 2 | Navegar a /profile y pulsar la pestaña «Seguridad». | Muestra la tarjeta «Autenticación en 2 pasos (2FA)» con el segundo factor desactivado y el botón «Activar 2FA». | PASE |
| Paso 3 | Pulsar «Activar 2FA». | La tarjeta pasa al paso «Configura tu autenticador» y muestra la URI de aprovisionamiento, la clave secreta y ocho códigos de respaldo de un solo uso. | PASE |
| Paso 4 | Escribir «000» (tres dígitos) en el campo «Código de verificación». | La validación exige seis dígitos y no permite confirmar la activación. | PASE |
| Paso 5 | Escribir «000000» (seis dígitos, incorrecto) y pulsar «Confirmar y activar». | El backend responde «Código incorrecto o expirado.» y el 2FA permanece desactivado. | PASE |
| Paso 6 | Pulsar «Cancelar» para abandonar el alta. | La tarjeta vuelve al estado inicial sin haber activado el segundo factor. | PASE |

**Problemas encontrados:** Se detectó que la tarjeta no avanzaba del paso inicial pese a que el backend respondía 200: el segundo factor no podía activarse desde la interfaz. Corregido (estado del componente migrado a signals) y re-verificado.

**Otros comentarios:** Caso añadido el 22/07/2026. Método: partición de equivalencia sobre la longitud y validez del código. Evidencia: capturas esc16_01 a esc16_04.
