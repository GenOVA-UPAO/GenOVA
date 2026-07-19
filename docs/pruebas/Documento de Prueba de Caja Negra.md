**UNIVERSIDAD PRIVADA ANTENOR ORREGO**

FACULTAD DE INGENIERÍA

PROGRAMA DE ESTUDIO DE INGENIERÍA

![Imagen que contiene LogotipoDescripción generada automáticamente][image1]  
---

**Prueba de Caja Negra \- Proyecto GenOVA**

---

**Estudiantes:**

Carranza Jacinto, Juan Diego 

Romero Uriol, Jeffry Anderson

**Asesor:** Cueva Chavez, Walter Manuel

**Trujillo \- PERÚ**

**2026**

# **Documento de Prueba de Caja Negra**

# **Descripción del Caso de Prueba:**

**Tipo de prueba a realizar:**

Pruebas de Caja Negra (funcionales)

# **Descripción:**

Se documenta lo que se probó (funcionalidad observable) sin mirar el código interno de los módulos, evaluando: las interfaces, la respuesta a las entradas del usuario, la integridad de los archivos generados (paquete SCORM), distintos escenarios válidos e inválidos, las respuestas de la aplicación y la secuencia de mensajes mostrados. Todas las capturas de este documento son **reales**, tomadas de la aplicación en ejecución con datos y sesiones vivas (no simuladas).

Este documento amplía la versión previa de 8 escenarios a **13 escenarios**, ejecutados contra el stack **real** (proveedores LLM, base de datos y worker de generación activos).

**Entorno de ejecución de las pruebas.** GenOVA es una aplicación web (no móvil). Las pruebas se ejecutaron contra el stack local con datos y sesiones reales:

* Frontend: Angular 22 servido en `http://localhost:4200`  
* Backend: FastAPI (`uvicorn`) en `http://localhost:8000`, con proveedores LLM reales y rate-limiting activo (`RATE_LIMIT_ENABLED=1`)  
* Worker: `arq` (cola durable en Redis/Upstash) ejecutándose como proceso separado para la generación 5E  
* Base de datos: Supabase PostgreSQL + pgvector (pooler de transacción)  
* Automatización de capturas: Playwright (Chromium headless), viewport 1440×900  
* Cuentas de prueba (seed): `admin@genova.ai` / `admin1234password` · `user@genova.ai` / `user1234password`  
* Sistema operativo: Windows 11  

Las capturas se generaron con el script `tests/capture-caja-negra-completa.mjs`, que reutiliza los selectores reales de la suite E2E y reaprovecha OVAs ya generados de la biblioteca del administrador para no regenerar contenido innecesariamente.

**Métodos aplicados.** Partición de equivalencia (formularios de registro, inicio de sesión, perfil y contraseña) y tabla de decisiones (recuperación de contraseña, generación, exportación SCORM, control de acceso y gestión de biblioteca).

# **Escenario 1: Registro de nuevo usuario**

**Datos de Entrada:** Registro de un nuevo usuario en la aplicación GenOVA.

**Entorno:** Módulo de registro (/register), con los campos que almacenan el nombre completo, correo electrónico y contraseña del usuario.

**Parámetros:**

* Campo Nombre completo (\#fullName)  
* Campo Email (\#email)  
* Campo Contraseña (\#password)  
  **Respuesta de otros módulos:** Se llama al módulo de registro (`backend/auth/`), que normaliza el email, valida y persiste la cuenta con la contraseña cifrada (bcrypt).  
  **Condiciones iniciales:**  
1. Se dejaron nulos (vacíos) los campos de nombre, email y contraseña y se pulsó "Crear cuenta".  
2. Se ingresó una contraseña de 3 caracteres sin números ("abc").  
3. Se ingresó un email sin @ ni dominio ("correo-sin-arroba").  
4. Se ingresó un email ya registrado ("user@genova.ai") con contraseña válida.  
5. Se ingresó nombre válido, email único válido y contraseña "Clave1234" (≥ 8, con letras y números).  
   **Datos de Salida:**

   **Resultados entregados:**  
   Para la condición 1, la aplicación no permite el envío y muestra mensajes de campo requerido; permanece en /register. Para la condición 2, no permite el registro, deshabilita el botón y muestra "Mínimo 8 caracteres con letras y números". Para la condición 3, no permite el registro y muestra un error de formato de email. Para la condición 4, el backend rechaza el registro por email ya existente. Para la condición 5, la aplicación permite el registro: crea la cuenta e inicia sesión / muestra el aviso de verificación de correo.  
   **Estado final de las variables:**  
   Se adjuntan capturas de las pruebas:  
1) Campos vacíos

![](../assets/caja-negra-completa/esc1_01_campos_vacios.png)

2) Contraseña débil

![](../assets/caja-negra-completa/esc1_02_password_debil.png)

3) Email inválido

![](../assets/caja-negra-completa/esc1_03_email_invalido.png)

4) Email duplicado

![](../assets/caja-negra-completa/esc1_04_email_duplicado.png)

5) Registro válido

![](../assets/caja-negra-completa/esc1_05_registro_ok.png)

**Método de Prueba:** Partición de equivalencia: se insertaron clases de datos válidas e inválidas (vacío, longitud/composición de contraseña, formato de email, unicidad) y se contrastó la respuesta de la aplicación.

**Módulos:** Formulario reactivo (Signal Forms) de la vista de registro, servicio de autenticación del frontend y router de auth del backend.

**Hardware y Software:** Navegador de escritorio sobre Windows 11; frontend Angular en :4200, backend FastAPI en :8000.

**Procedimientos o herramientas necesarios:** Ir a /register, ingresar caracteres según la condición, pulsar "Crear cuenta" y observar la respuesta.

**Dependencias o relación con otros casos de prueba:** Habilita el Escenario 2 (inicio de sesión).

# **Escenario 2: Inicio de sesión y bloqueo por intentos**

**Datos de Entrada:** Inicio de sesión de un usuario en la aplicación GenOVA.

**Entorno:** Módulo de inicio de sesión (/login), con los campos que reciben como parámetro el email y la contraseña del usuario.

**Parámetros:**

* Campo Email (\#email)  
* Campo Contraseña (\#password)  
  **Respuesta de otros módulos:** Se llama al módulo de autenticación (`backend/auth/`), que verifica credenciales, cuenta los intentos fallidos y emite la cookie httpOnly `genova_token` (JWT HS256).  
  **Condiciones iniciales:**  
1. Se dejaron vacíos los campos de email y contraseña.  
2. Se ingresó un email válido con contraseña incorrecta.  
3. Se repitieron intentos fallidos consecutivos sobre la misma cuenta.  
4. Se ingresaron email y contraseña válidos ("user@genova.ai" / "user1234password").  
   **Datos de Salida:**

   **Resultados entregados:**  
   Para la condición 1, el botón "Entrar" permanece deshabilitado. Para la condición 2, la aplicación no autentica y muestra "Credenciales inválidas." (HTTP 401). Para la condición 3, tras 5 intentos fallidos la cuenta queda bloqueada y la aplicación muestra "Cuenta bloqueada. Intenta de nuevo en N minuto(s)." (HTTP 403, bloqueo temporal). Para la condición 4, la aplicación autentica, emite la cookie httpOnly y redirige al dashboard.  
   **Estado final de las variables:**  
   Se adjuntan capturas de las pruebas:  
1) Formulario vacío (botón deshabilitado)

![](../assets/caja-negra-completa/esc2_01_form_vacio.png)

2) Credenciales inválidas

![](../assets/caja-negra-completa/esc2_02_credenciales_invalidas.png)

3) Cuenta bloqueada

![](../assets/caja-negra-completa/esc2_03_bloqueo_cuenta.png)

4) Login correcto (dashboard)

![](../assets/caja-negra-completa/esc2_04_login_ok.png)

**Método de Prueba:** Partición de equivalencia (formulario vacío / credenciales inválidas / válidas) combinada con tabla de decisiones para el bloqueo temporal por número de intentos.

**Módulos:** Vista de login, servicio de autenticación (cookies credentials: 'include') y throttle por intentos del backend.

**Hardware y Software:** Navegador de escritorio sobre Windows 11.

**Procedimientos o herramientas necesarios:** Ir a /login, ingresar datos según la condición, pulsar "Entrar" y observar la secuencia de mensajes.

**Dependencias o relación con otros casos de prueba:** Requiere una cuenta registrada (Escenario 1). La autenticación válida habilita todos los escenarios protegidos.

# **Escenario 3: Recuperación de contraseña**

**Datos de Entrada:** Solicitud de restablecimiento de contraseña por correo.

**Entorno:** Módulo de recuperación (/forgot-password), con el campo de email y el botón de envío.

**Parámetros:**

* Campo Email (input[type=email])  
* Botón de envío del enlace de recuperación  
  **Respuesta de otros módulos:** Se llama al módulo de reset del backend (`backend/auth/reset_router.py`), que genera y envía un token por correo, con rate-limit por IP.  
  **Condiciones iniciales:**  
1. Se accedió a la pantalla de recuperación.  
2. Se ingresó un email que no existe en el sistema y se solicitó el enlace.  
   **Datos de Salida:**

   **Resultados entregados:**  
   Para la condición 1, la aplicación muestra el formulario de recuperación. Para la condición 2, la aplicación responde con un mensaje genérico que no revela si el correo existe o no (protección contra enumeración de cuentas) y no devuelve el token en la respuesta HTTP.  
   **Estado final de las variables:**  
   Se adjuntan capturas de las pruebas:  
1) Pantalla de recuperación

![](../assets/caja-negra-completa/esc3_01_pantalla.png)

2) Mensaje genérico (anti-enumeración)

![](../assets/caja-negra-completa/esc3_02_email_generico.png)

**Método de Prueba:** Tabla de decisiones: correo existente vs. inexistente; se verificó que la respuesta observable es idéntica (no filtra la existencia de la cuenta).

**Módulos:** Vista de recuperación y router de reset con rate-limit por IP.

**Hardware y Software:** Navegador de escritorio sobre Windows 11.

**Procedimientos o herramientas necesarios:** Ir a /forgot-password, ingresar un email y solicitar el enlace.

**Dependencias o relación con otros casos de prueba:** Se relaciona con el Escenario 2 (autenticación).

# **Escenario 4: Creación de un OVA desde un prompt (modelo 5E)**

**Datos de Entrada:** Generación de un Objeto Virtual de Aprendizaje a partir de un prompt y una configuración de recursos por fase pedagógica.

**Entorno:** Módulo de creación (/crear), con un área de texto para el prompt, el botón "Configurar recursos 5E" (modal por fase) y el botón "Generar OVA".

**Parámetros:**

* Área de texto del prompt (textarea)  
* Botón "Configurar recursos 5E" (modal de recursos por fase)  
* Botón "Generar OVA"  
  **Respuesta de otros módulos:** Se llama al motor de generación Prometheus (`backend/prometheus/`) mediante el encolado de un job (`backend/generation/jobs/`); el worker `arq` procesa el job y el workspace muestra el progreso en vivo (SSE).  
  **Condiciones iniciales:**  
1. Se accedió a /crear sin escribir prompt.  
2. Se escribió un prompt válido en el área de texto.  
3. Se abrió el modal de configuración de recursos 5E.  
4. Se lanzó la generación real y se observó el progreso en vivo.  
5. Se esperó a que el OVA quedara Listo con su contenido 5E renderizado.  
   **Datos de Salida:**

   **Resultados entregados:**  
   Para la condición 1, el botón "Generar OVA" permanece deshabilitado ("Faltan N caracteres para generar"). Para la condición 2, al escribir un prompt válido el botón se habilita. Para la condición 3, la aplicación muestra el modal con las cinco fases 5E (Engage, Explore, Explain, Elaborate, Evaluate) y los tipos de recurso seleccionables. Para la condición 4, la aplicación encola el job y muestra el estado "Generando…" con el aviso "Los recursos aparecerán aquí a medida que se generen". Para la condición 5, al finalizar, el OVA queda "Listo" con su contenido 5E renderizado (generación fresca completa de extremo a extremo).  
   **Estado final de las variables:**  
   Se adjuntan capturas de las pruebas:  
1) Botón Generar deshabilitado

![](../assets/caja-negra-completa/esc4_01_generar_deshabilitado.png)

2) Prompt escrito, botón habilitado

![](../assets/caja-negra-completa/esc4_02_prompt_escrito.png)

3) Modal de recursos 5E

![](../assets/caja-negra-completa/esc4_03_modal_recursos.png)

4) Generación en curso (en vivo)

![](../assets/caja-negra-completa/esc4_04_generando.png)

5) OVA generado y renderizado (completo)

![](../assets/caja-negra-completa/esc4_05_resultado_workspace.png)

**Método de Prueba:** Tabla de decisiones: prompt vacío/válido, recursos mínimos por fase y arranque de la generación; se observó la habilitación del botón y la transición al estado "Generando…".

**Módulos:** Vista de creación, modal de recursos 5E, router de jobs de generación, worker `arq` y motor Prometheus.

**Hardware y Software:** Navegador de escritorio; backend con proveedores LLM reales y worker de generación activo.

**Procedimientos o herramientas necesarios:** Autenticarse, ir a /crear, escribir el prompt, configurar recursos en ≥ 2 fases y pulsar "Generar OVA".

**Dependencias o relación con otros casos de prueba:** Requiere sesión iniciada (Escenario 2). Produce el artefacto usado por los Escenarios 5, 6 y 7.

# **Escenario 5: Visualización del OVA en el workspace (modelo 5E)**

**Datos de Entrada:** Apertura y visualización de un OVA generado en el workspace.

**Entorno:** Módulo workspace (/workspace/:id), con el visor de fases 5E, la vista previa HTML de cada recurso, el versionado y la exportación.

**Parámetros:**

* Pestañas de fases 5E y de recursos por fase  
* Vista previa HTML del recurso generado  
* Botones "Vista previa" / "Editar" / "Historial" y "SCORM"  
  **Respuesta de otros módulos:** Se llama al servicio de OVAs (`backend/ova/`) que devuelve el OVA con sus fases y recursos.  
  **Condiciones iniciales:**  
1. Se abrió un OVA existente en estado "Listo".  
2. Se revisaron los recursos de las fases y el botón de exportación.  
   **Datos de Salida:**

   **Resultados entregados:**  
   Para la condición 1, la aplicación carga el workspace con el título del OVA, la versión (v1) y las pestañas de recurso (p. ej. "Cómic Interactivo", "Preguntas de Desarrollo"). El recurso se renderiza con su contenido real (título, narrativa y las ilustraciones generadas). Para la condición 2, el workspace expone el botón "SCORM" para la exportación.  
   **Estado final de las variables:**  
   Se adjuntan capturas de las pruebas:  
1) Workspace con recursos 5E

![](../assets/caja-negra-completa/esc5_01_workspace_recursos.png)

2) Botón SCORM visible

![](../assets/caja-negra-completa/esc5_02_boton_scorm.png)

**Método de Prueba:** Tabla de decisiones (OVA con datos vs. sin datos): con un OVA "Listo" se verificó el renderizado de recursos y la disponibilidad de la exportación.

**Módulos:** Vista workspace, servicio de OVAs y visor de recursos HTML.

**Hardware y Software:** Navegador de escritorio sobre Windows 11.

**Procedimientos o herramientas necesarios:** Abrir un OVA "Listo" desde Mis OVAs con "Editar" y navegar por las fases 5E.

**Dependencias o relación con otros casos de prueba:** Requiere un OVA generado (Escenario 4). Habilita la exportación (Escenario 7).

# **Escenario 6: Edición del OVA en el workspace**

**Datos de Entrada:** Aplicación de cambios sobre un OVA existente mediante el panel de edición estilo chat.

**Entorno:** Panel izquierdo del workspace (/workspace/:id), con "Regenerar OVA completo", "Seleccionar recursos", el historial de prompts y el cuadro de texto "Escribe un cambio o mejora para el OVA…".

**Parámetros:**

* Cuadro de prompt de edición  
* Acciones "Regenerar OVA completo" y "Seleccionar recursos"  
  **Respuesta de otros módulos:** Se llama a los routers de edición y micro-versionado de OVA (`backend/generation/`), que aplican el cambio y crean una nueva versión del recurso.  
  **Condiciones iniciales:**  
1. Se abrió un OVA "Listo" y se escribió una instrucción de cambio en el panel.  
   **Datos de Salida:**

   **Resultados entregados:**  
   Para la condición 1, la aplicación muestra el panel de edición con el prompt escrito, listo para aplicar el cambio ("Aplicar"), junto a las acciones de regeneración y selección de recursos como contexto.  
   **Estado final de las variables:**  
   Se adjuntan capturas de las pruebas:  
1) Panel de edición (prompt de cambios)

![](../assets/caja-negra-completa/esc6_01_panel_edicion.png)

**Método de Prueba:** Partición de equivalencia sobre la entrada de edición (prompt de cambio) y verificación de las afordancias de edición disponibles.

**Módulos:** Panel de chat del workspace, router de edición y micro-versionado por recurso.

**Hardware y Software:** Navegador de escritorio sobre Windows 11.

**Procedimientos o herramientas necesarios:** Abrir un OVA "Listo", escribir un cambio en el panel y pulsar "Aplicar".

**Dependencias o relación con otros casos de prueba:** Requiere un OVA generado (Escenario 4/5).

# **Escenario 7: Exportación del OVA como paquete SCORM**

**Datos de Entrada:** Descarga del OVA empaquetado en el estándar SCORM.

**Entorno:** Card del OVA en Mis OVAs (botón "Descargar") o botón "SCORM" del workspace.

**Parámetros:**

* Botón "Descargar" / "SCORM"  
  **Respuesta de otros módulos:** Se llama al motor de exportación SCORM (`backend/scorm/`), que produce un ZIP con `imsmanifest.xml` (SCORM 1.2, con capa cmi5/xAPI embebida).  
  **Condiciones iniciales:**  
1. Se localizó un OVA en estado "Listo" en Mis OVAs.  
2. Se pulsó "Descargar" en la card.  
   **Datos de Salida:**

   **Resultados entregados:**  
   Para la condición 1, la card muestra el botón "Descargar" habilitado. Para la condición 2, la aplicación genera y descarga un archivo `.zip` (paquete SCORM). El contenido del paquete descargado se verificó e incluye: `imsmanifest.xml`, `index.html`, `cmi5.xml` y los recursos HTML por fase (`resources/recurso_1.html`, `resources/recurso_2.html`) — 9 archivos en total.  
   **Estado final de las variables:**  
   Se adjuntan capturas de las pruebas:  
1) Card con botón Descargar

![](../assets/caja-negra-completa/esc7_01_card_descargar.png)

2) Descarga del paquete SCORM

![](../assets/caja-negra-completa/esc7_02_descarga_scorm.png)

**Método de Prueba:** Tabla de decisiones (OVA listo vs. no listo) y verificación de integridad de archivos: se inspeccionó el `.zip` descargado y su manifiesto.

**Módulos:** Servicio de exportación SCORM y almacenamiento (Supabase Storage / disco local con fallback 302).

**Hardware y Software:** Navegador de escritorio sobre Windows 11.

**Procedimientos o herramientas necesarios:** Localizar un OVA "Listo", pulsar "Descargar" y verificar el `.zip` (opcionalmente validarlo en SCORM Cloud / validador ADL).

**Dependencias o relación con otros casos de prueba:** Requiere un OVA generado (Escenario 4/5).

# **Escenario 8: Gestión de la biblioteca (buscar, duplicar, papelera, restaurar)**

**Datos de Entrada:** Operaciones de gestión sobre los OVAs de la biblioteca del usuario.

**Entorno:** Módulo Mis OVAs (/mis-ovas) y Papelera (/papelera), con buscador y acciones por card (Editar, Metadatos, Duplicar, Descargar, A papelera, Restaurar, Borrar definitivamente).

**Parámetros:**

* Buscador por título  
* Botones de card: "Duplicar", "A papelera", "Restaurar"  
* Confirmaciones "Mover" (papelera) y "Eliminar" (borrado definitivo)  
  **Respuesta de otros módulos:** Se llama al servicio de OVAs para duplicar, mover a papelera (borrado lógico), restaurar y listar.  
  **Condiciones iniciales:**  
1. Se buscó un OVA por su título.  
2. Se duplicó el OVA desde su card.  
3. Se movió la copia a la papelera y se confirmó "Mover".  
4. Se restauró la copia desde la papelera.  
   **Datos de Salida:**

   **Resultados entregados:**  
   Para no alterar los originales, las operaciones se realizaron sobre una copia. Para la condición 1, el buscador filtra y muestra las cards. Para la condición 2, la aplicación crea una copia del OVA con el sufijo "(copia)" (el total de la biblioteca aumenta de 10 a 11 OVAs; el sufijo se conserva en el dato, aunque el título se trunca visualmente en la card). Para la condición 3, la copia desaparece de Mis OVAs y aparece en la papelera con estado "Borrador" y la fecha de eliminado ("1 OVA en papelera", borrado lógico). Para la condición 4, la copia se restaura y vuelve a Mis OVAs.  
   **Estado final de las variables:**  
   Se adjuntan capturas de las pruebas:  
1) Búsqueda por título

![](../assets/caja-negra-completa/esc8_01_buscar.png)

2) Duplicado (Total: 11 OVAs)

![](../assets/caja-negra-completa/esc8_02_duplicado.png)

3) Confirmación mover a papelera

![](../assets/caja-negra-completa/esc8_03_confirmar_papelera.png)

4) Copia en la papelera

![](../assets/caja-negra-completa/esc8_04_papelera.png)

5) Copia restaurada

![](../assets/caja-negra-completa/esc8_05_restaurado.png)

**Método de Prueba:** Tabla de decisiones sobre el ciclo de vida del OVA (activo → duplicado → papelera → restaurado), verificando la reversibilidad del borrado lógico.

**Módulos:** Vistas Mis OVAs y Papelera, cards de OVA y servicio de biblioteca.

**Hardware y Software:** Navegador de escritorio sobre Windows 11.

**Procedimientos o herramientas necesarios:** En Mis OVAs, usar el buscador y las acciones de card; verificar el estado en /papelera.

**Dependencias o relación con otros casos de prueba:** Requiere OVAs generados (Escenario 4/5).

# **Escenario 9: Ver y editar el perfil del usuario**

**Datos de Entrada:** Visualización y edición de los datos de perfil.

**Entorno:** Módulo perfil (/profile), con las pestañas "Información" (nombre, correo, código universitario UPAO, sexo/género, teléfono) y "Seguridad".

**Parámetros:**

* Campo Nombre completo  
* Campos Código universitario, Sexo/Género, Teléfono  
* Botones "Restablecer" y "Guardar"  
  **Respuesta de otros módulos:** Se llama al servicio de usuarios (`backend/users/`) para leer y actualizar el perfil.  
  **Condiciones iniciales:**  
1. Se navegó a /profile con una cuenta autenticada.  
2. Se editó el nombre completo (dato válido) y se guardó.  
   **Datos de Salida:**

   **Resultados entregados:**  
   Para la condición 1, la aplicación muestra los datos de la cuenta. Para la condición 2, la aplicación acepta el nuevo nombre, lo persiste y refleja el valor actualizado.  
   **Estado final de las variables:**  
   Se adjuntan capturas de las pruebas:  
1) Pantalla de perfil

![](../assets/caja-negra-completa/esc9_01_perfil.png)

2) Nombre actualizado y guardado

![](../assets/caja-negra-completa/esc9_02_perfil_editado.png)

**Método de Prueba:** Partición de equivalencia sobre los campos del perfil (dato válido) y verificación de la persistencia.

**Módulos:** Vista de perfil, servicio de usuarios del frontend y router de usuarios del backend.

**Hardware y Software:** Navegador de escritorio sobre Windows 11.

**Procedimientos o herramientas necesarios:** Autenticarse, ir a /profile, editar los datos y pulsar "Guardar".

**Dependencias o relación con otros casos de prueba:** Requiere sesión iniciada (Escenario 2).

# **Escenario 10: Cambio de contraseña desde el perfil**

**Datos de Entrada:** Cambio de la contraseña de la cuenta desde la pestaña de seguridad del perfil.

**Entorno:** Pestaña "Seguridad" del módulo perfil (/profile), con el bloque "Seguridad de la Cuenta" (contraseña actual, nueva y confirmación) y la opción de 2FA.

**Parámetros:**

* Campo Contraseña actual (\#currentPassword)  
* Campo Nueva contraseña (\#newPassword)  
* Campo Confirmar nueva contraseña (\#confirmPassword)  
* Botón "Actualizar Contraseña"  
  **Respuesta de otros módulos:** Se llama al servicio de usuarios (`backend/users/`), que verifica la contraseña actual y actualiza el hash bcrypt.  
  **Condiciones iniciales:**  
1. Se ingresó una contraseña actual incorrecta con una nueva válida.  
2. Se ingresó una nueva contraseña débil ("abc").  
3. Se ingresaron contraseña actual correcta y una nueva válida coincidente.  
   **Datos de Salida:**

   **Resultados entregados:**  
   Para la condición 1, al enviar el formulario el backend rechaza el cambio con HTTP 400 ("La contraseña actual ingresada es incorrecta.") y no modifica la contraseña. Para la condición 2, la validación en línea muestra "Debe tener al menos 8 caracteres." (política: mínimo 8 alfanuméricos) y mantiene deshabilitado el botón "Actualizar Contraseña". Para la condición 3, con la contraseña actual correcta y una nueva conforme a la política, el backend responde HTTP 200 ("Contraseña actualizada con éxito.") y aplica el cambio; al terminar, el botón "Actualizar Contraseña" vuelve a habilitarse. (Corregido: antes el botón quedaba en "Actualizando…" de forma indefinida por un bug de detección de cambios OnPush+zoneless; las respuestas 400/200 se verificaron contra `/api/users/me/change-password`.)  
   **Estado final de las variables:**  
   Se adjuntan capturas de las pruebas:  
1) Envío con contraseña actual incorrecta (rechazo 400)

![](../assets/caja-negra-completa/esc10_01_actual_incorrecta.png)

2) Nueva contraseña débil (error en línea + botón deshabilitado)

![](../assets/caja-negra-completa/esc10_02_nueva_debil.png)

3) Envío con datos válidos (cambio aplicado, 200)

![](../assets/caja-negra-completa/esc10_03_cambio_ok.png)

**Método de Prueba:** Partición de equivalencia: clases inválidas (actual incorrecta, nueva débil) y clase válida (actual correcta + nueva conforme a la política).

**Módulos:** Componente de cambio de contraseña (pestaña Seguridad) y servicio de usuarios.

**Hardware y Software:** Navegador de escritorio sobre Windows 11.

**Procedimientos o herramientas necesarios:** Ir a /profile → "Seguridad", completar los tres campos y pulsar "Actualizar Contraseña".

**Dependencias o relación con otros casos de prueba:** Requiere sesión iniciada (Escenario 2); comparte la política de contraseñas con el Escenario 1.

# **Escenario 11: Carga de archivos base para el contexto (RAG)**

**Datos de Entrada:** Adjuntar un archivo de referencia que la IA usa como contexto (RAG) al generar el OVA.

**Entorno:** Sección "Archivos de referencia" del módulo de creación (/crear), con zona de arrastre y selección de archivos.

**Parámetros:**

* Botón "Archivos de referencia"  
* Zona de carga (arrastrar o hacer clic) con tipos aceptados: PDF, DOCX, PPTX, MP3, WAV, M4A, JPG, PNG, WEBP  
  **Respuesta de otros módulos:** Se llama al módulo de uploads (`backend/uploads/`) y al pipeline RAG (pgvector + embeddings de Gemini) que indexa el contenido como contexto.  
  **Condiciones iniciales:**  
1. Se abrió la sección de archivos de referencia en /crear.  
2. Se adjuntó un archivo de un tipo aceptado (.png).  
   **Datos de Salida:**

   **Resultados entregados:**  
   Para la condición 1, la aplicación muestra la zona de carga con los formatos admitidos y el límite (1 de 5). Para la condición 2, la aplicación acepta el archivo y muestra su chip con el nombre, tamaño y estado de subida.  
   **Estado final de las variables:**  
   Se adjuntan capturas de las pruebas:  
1) Zona de carga (RAG)

![](../assets/caja-negra-completa/esc11_01_zona_carga.png)

2) Archivo adjuntado

![](../assets/caja-negra-completa/esc11_02_archivo_adjunto.png)

**Método de Prueba:** Tabla de decisiones sobre el tipo de archivo (aceptado vs. no aceptado); se verificó que un tipo permitido genera el chip de contexto.

**Módulos:** Componente de carga de archivos de la vista de creación, módulo de uploads y pipeline RAG.

**Hardware y Software:** Navegador de escritorio sobre Windows 11.

**Procedimientos o herramientas necesarios:** Autenticarse, ir a /crear, abrir "Archivos de referencia" y adjuntar un documento de tipo permitido.

**Dependencias o relación con otros casos de prueba:** Se relaciona con el Escenario 4 (creación del OVA con contexto).

# **Escenario 12: Configuración del catálogo de modelos de IA**

**Datos de Entrada:** Consulta y configuración del catálogo de modelos y de la cadena de fallback por tarea.

**Entorno:** Módulo Modelos (/models), con las pestañas "Modelos", "Credenciales" y "Plataforma", indicadores (proveedores conectados, modelos favoritos, cambios sin guardar) y la asignación de modelo por tarea.

**Parámetros:**

* Lista de tareas (Texto, Código/HTML, Orquestador, Razonamiento, Imagen, Video)  
* Modelo primario y cadena de fallback por tarea  
* Acciones "Editar cadena" y "Abrir catálogo"  
  **Respuesta de otros módulos:** Se llama al catálogo de modelos y a la configuración de plataforma (`backend/llm/`, `/api/admin`), que fusiona modelos de OpenRouter/Groq con el estado enable/disable.  
  **Condiciones iniciales:**  
1. Como administrador, se accedió a /models.  
2. Se revisó la asignación de modelo primario y la cadena de fallback por tarea.  
   **Datos de Salida:**

   **Resultados entregados:**  
   Para la condición 1, la aplicación muestra el catálogo con "Proveedores conectados 4/4" y los modelos favoritos. Para la condición 2, muestra el modelo primario por tarea (p. ej. Texto → "DeepSeek V4 Flash") y su cadena de fallback (Qwen3 → Meta Llama 3.3 → llama-3.1-8b), editable con "Editar cadena".  
   **Estado final de las variables:**  
   Se adjuntan capturas de las pruebas:  
1) Catálogo de modelos

![](../assets/caja-negra-completa/esc12_01_catalogo_modelos.png)

2) Asignación por tarea y fallback

![](../assets/caja-negra-completa/esc12_02_asignacion_fallback.png)

**Método de Prueba:** Tabla de decisiones sobre la selección de modelo por tarea y la cadena de respaldo; se verificó la presentación de primario + fallbacks.

**Módulos:** Vista de modelos, catálogo unificado de modelos y configuración de plataforma.

**Hardware y Software:** Navegador de escritorio sobre Windows 11.

**Procedimientos o herramientas necesarios:** Autenticarse como administrador, ir a /models y revisar la asignación por tarea.

**Dependencias o relación con otros casos de prueba:** Requiere rol administrador; afecta al Escenario 4 (qué modelos usa la generación).

# **Escenario 13: Administración (usuarios, roles y control de acceso)**

**Datos de Entrada:** Gestión administrativa de usuarios y roles, y verificación del control de acceso por rol.

**Entorno:** Panel de administración: gestión de usuarios (/admin), gestión de roles (/admin/roles), protegidas por authGuard + adminGuard.

**Parámetros:**

* Buscador de usuarios por nombre/email  
* Acciones de rol: "Nuevo rol", nombre, descripción, permisos, "Crear rol", "Editar permisos", "Eliminar"  
* Acceso restringido para cuentas sin rol administrador  
  **Respuesta de otros módulos:** Se llama a los servicios de usuarios y roles (`backend/users/`, `backend/roles/`).  
  **Condiciones iniciales:**  
1. Como administrador, se accedió a la gestión de usuarios y se buscó por email.  
2. Se accedió a la gestión de roles del sistema.  
3. Se abrió el formulario de creación de rol.  
4. (Control de acceso) Un usuario sin rol administrador intentó acceder a /admin.  
   **Datos de Salida:**

   **Resultados entregados:**  
   Para la condición 1, la aplicación muestra la lista de usuarios filtrada. Para la condición 2, muestra los roles del sistema con sus permisos. Para la condición 3, muestra el modal "Crear nuevo rol" con nombre, descripción y permisos (Crear/Ver/Exportar OVAs, etc.). Para la condición 4, el adminGuard bloquea el acceso y redirige al usuario a su Dashboard (sin exponer el panel ni la navegación de administración).  
   **Estado final de las variables:**  
   Se adjuntan capturas de las pruebas:  
1) Gestión de usuarios

![](../assets/caja-negra-completa/esc13_01_usuarios.png)

2) Gestión de roles

![](../assets/caja-negra-completa/esc13_02_roles.png)

3) Creación de rol

![](../assets/caja-negra-completa/esc13_03_crear_rol.png)

4) Control de acceso (no-admin redirigido)

![](../assets/caja-negra-completa/esc13_04_control_acceso.png)

**Método de Prueba:** Tabla de decisiones sobre el rol del usuario (administrador vs. no administrador) y su efecto en el acceso al panel.

**Módulos:** Vistas de administración (usuarios/roles), guards de ruta (authGuard, adminGuard) y servicios de usuarios y roles.

**Hardware y Software:** Navegador de escritorio sobre Windows 11.

**Procedimientos o herramientas necesarios:** Autenticarse como administrador (admin@genova.ai) y navegar a /admin y /admin/roles; luego, como usuario sin rol admin, intentar acceder a /admin.

**Dependencias o relación con otros casos de prueba:** Requiere sesión con rol "administrador"; el control de acceso (condición 4) se relaciona con el Escenario 2 (autenticación por rol).

# **Listado técnico**

## **Archivos involucrados**

* Frontend (Angular 22): páginas de `frontend/src/features/` (auth, ova-workspace, ova-library, profile, admin, llm-settings) y el layout de `frontend/src/app/layout/`.  
* Backend (FastAPI): módulos `auth/`, `ova/`, `roles/`, `users/`, `scorm/`, `prometheus/`, `generation/jobs/`, `llm/`, `rag/` y `uploads/` bajo `backend/`.  
* Script de captura de caja negra: `tests/capture-caja-negra-completa.mjs`.  

## **Sistemas y bibliotecas**

* Frontend: Angular 22, Angular Router, Tailwind CSS 4, SpartanUI.  
* Backend: FastAPI, SQLAlchemy 2, Uvicorn, SlowAPI, `arq` (cola durable), Redis (Upstash), bcrypt, PyJWT.  
* IA/RAG: Groq, OpenRouter, Gemini (embeddings), pgvector.  
* Empaquetado: SCORM 1.2 + cmi5/xAPI.  
* Pruebas: Playwright (Chromium), Cucumber / playwright-bdd.  

## **Hallazgos y correcciones aplicadas**

Las tres observaciones de la primera corrida se corrigieron y re-verificaron:

* **[CORREGIDO] Validación de recurso por fase en el encolado (robustez).** Antes, al encolar un recurso con una combinación fase/tipo inválida (p. ej. "Lectura Interactiva" en la fase Engage, cuando ese tipo pertenece a Explore), el endpoint aceptaba la petición (HTTP 202) y el worker fallaba con `ValueError`, dejando el job "interrupted". Fix: se añadió el helper `resource_exists(phase, type)` (`backend/generation/jobs/jobs_materialize.py`) y un `model_validator` en `StartJobRequest` (`backend/generation/jobs/jobs_helpers.py`) que rechazan la combinación inválida con HTTP 422 ("Recurso no válido para la fase '…'.") antes de encolar. Verificado: inválida → 422, válida → 202.  
* **[CORREGIDO] Generación fresca completa (Escenario 4).** La causa de que las generaciones nuevas no completaran era la presencia de workers `arq` duplicados/huérfanos de sesiones previas compitiendo por la misma cola. Con un único worker dedicado, una generación nueva completa correctamente (job `done`, OVA "listo", ~3 min): ver captura del Escenario 4 condición 5.  
* **[CORREGIDO] Feedback del cambio de contraseña.** El botón "Actualizar Contraseña" quedaba en estado "Actualizando…" de forma indefinida. Causa: en `ProfilePageComponent` las banderas `isSaving/isChanging/isDeleting` eran propiedades planas; con OnPush + zoneless, mutarlas tras un `await` no dispara detección de cambios. Fix: se convirtieron a `signal()` en `frontend/src/features/profile/pages/profile-page.component.ts`. Verificado: el botón se restablece al terminar y el cambio se aplica (400 actual incorrecta / 200 éxito).  
* **Corrección previa verificada.** El subtítulo de la pantalla de login ya no muestra el texto heredado del dominio ("curso de ML"); ahora dice "Accede para crear y gestionar tus OVAs."  

## **Notas**

* Todas las capturas de este documento son reales, tomadas de la aplicación en ejecución con proveedores LLM y base de datos reales (no `LLM_FAKE`).  
* Para no consumir créditos innecesarios, los escenarios de workspace, SCORM y biblioteca reutilizan OVAs ya generados de la biblioteca del administrador; el Escenario 4 sí lanza generación real.  
* Las capturas viven en `docs/assets/caja-negra-completa/`.  


[image1]: <data:image/png;base64,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>
