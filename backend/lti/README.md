# LTI 1.3 — GenOVA como herramienta dentro del LMS

Un docente añade GenOVA a su curso (Moodle, Canvas, Blackboard…) como herramienta
externa LTI 1.3, elige una de sus OVAs con **Deep Linking** y los estudiantes la abren
dentro del LMS sin descargar paquetes. Si la OVA tiene fase de evaluación, la nota
vuelve al libro de calificaciones con **AGS** (Assignment and Grade Services).

## Endpoints

| Ruta | Quién la llama | Para qué |
|---|---|---|
| `GET /lti/jwks` | LMS | Claves públicas de GenOVA (verifica Deep Linking y el client assertion de AGS) |
| `GET\|POST /lti/login` | LMS (navegador) | Inicio OIDC: crea `state` + `nonce` y redirige al LMS |
| `POST /lti/launch` | LMS (navegador) | redirect_uri: valida el `id_token` y abre el selector o el reproductor |
| `GET\|POST /lti/deep-link/{token}` | Docente | Selector de sus OVAs listas → `LtiDeepLinkingResponse` firmado |
| `GET /lti/play/{token}/` | Estudiante | Reproductor de la OVA (sin editor) |
| `GET /lti/play/{token}/content/…` | Estudiante | Archivos del paquete web de la OVA |
| `POST /lti/play/{token}/score` | Reproductor | Puente runtime → AGS |
| `/api/admin/lti/tool`, `/api/admin/lti/platforms` | Admin GenOVA | Datos de la herramienta y CRUD de plataformas |

En la app: **Administración → LTI** (`/admin/lti`).

## Configuración (backend)

| Variable | Por defecto | Uso |
|---|---|---|
| `LTI_TOOL_URL` | (de la petición) | URL pública del backend que ve el LMS, sin barra final. **Obligatoria en producción** (detrás de un proxy la petición puede llegar como `http://`). |
| `LTI_PRIVATE_KEY` | vacío | Par RSA de GenOVA en PEM (`\n` literales admitidos). Vacío: se genera una RSA-2048 y se guarda cifrada (Fernet, clave derivada de `JWT_SECRET`) en `lti_tool_keys`. |
| `LTI_KEY_ID` | thumbprint RFC 7638 | `kid` de esa clave. |
| `LTI_STATE_COOKIE_REQUIRED` | `1` | Exigir la cookie del `state` en `/lti/launch`. |
| `LTI_SESSION_HOURS` | `8` | Vida de la sesión LTI (reproductor/selector). |
| `LTI_PURGE_INTERVAL_HOURS` | `6` | Cada cuántas horas se borran los `state`/`nonce` caducados y los launches caducados hace más de 7 días (también al arrancar) |

Rotar `JWT_SECRET` deja ilegible la clave guardada: se genera otra y el LMS la
vuelve a leer del JWKS (las sesiones LTI abiertas caducan).

## Registrar GenOVA en Moodle (4.x)

1. En GenOVA, entra a **Administración → LTI** y copia las tres URLs de «Datos de
   GenOVA para el LMS» (sustituye `https://API` por tu `LTI_TOOL_URL`).
2. En Moodle: *Administración del sitio → Extensiones → Módulos de actividad →
   Herramienta externa → Gestionar herramientas → configurar una herramienta manualmente*:

   | Campo de Moodle | Valor |
   |---|---|
   | Nombre de la herramienta | GenOVA |
   | URL de la herramienta | `https://API/lti/launch` |
   | Versión LTI | LTI 1.3 |
   | Tipo de clave pública | URL del conjunto de claves (keyset URL) |
   | URL del conjunto de claves públicas | `https://API/lti/jwks` |
   | URL de inicio de sesión | `https://API/lti/login` |
   | URI(s) de redirección | `https://API/lti/launch` |
   | Uso de la configuración | Mostrar en el selector de actividades… |
   | Soporta Deep Linking (Content-Item Message) | ✔ |
   | URL de selección de contenido | `https://API/lti/launch` |
   | Servicios → Servicios de asignación y calificación (AGS) | «Usar este servicio para sincronizar calificaciones y gestionar columnas» |
   | Privacidad → Compartir el correo del lanzador | **Siempre** (el selector busca las OVAs del docente por su correo) |
   | Privacidad → Compartir el nombre | Siempre (opcional) |

3. Guarda y pulsa el icono de **detalles de configuración** de la herramienta. Moodle
   muestra: *ID de la plataforma*, *ID de cliente*, *ID de despliegue*, *URL del
   conjunto de claves públicas*, *URL del token de acceso* y *URL de solicitud de
   autenticación*.
4. En GenOVA → **Registrar plataforma**, pega esos seis valores (Issuer = ID de la
   plataforma; Deployment IDs = ID de despliegue) y guarda.
5. En un curso: *Añadir actividad → GenOVA → Seleccionar contenido*. El docente ve sus
   OVAs listas, elige una y Moodle crea la actividad (con columna de calificación si
   la OVA tiene evaluación).

Canvas/Blackboard: mismas URLs (Canvas: *Developer Keys → LTI Key*, «Target Link URI»
= `/lti/launch`, «OpenID Connect Initiation Url» = `/lti/login`, «JWK Method» = Public
JWK URL; placement *Link Selection* con Deep Linking y scopes de AGS *score*).

## Cómo funciona

- **Login/launch.** `/lti/login` busca la plataforma por `iss` (+`client_id`), guarda
  `state` y `nonce` (10 min, un solo uso) en `lti_oidc_states` y deja una cookie
  `lti_state_<state>` `HttpOnly; Secure; SameSite=None; Partitioned; Path=/lti`.
  `/lti/launch` exige esa cookie, consume el `state` atómicamente y valida el
  `id_token` con PyJWT contra el JWKS de la plataforma (caché 10 min, relectura si el
  `kid` es nuevo): firma RS256, `iss`, `aud`, `azp`, `exp`/`iat` (60 s de margen),
  `nonce`, `deployment_id` registrado, versión `1.3.0` y `message_type`
  (`LtiResourceLinkRequest` o `LtiDeepLinkingRequest`).
- **Sesión LTI acotada.** Tras el launch se redirige a una URL con un JWT HS256 propio
  (audiencia `genova-lti`, no vale como sesión de GenOVA) que apunta a una fila de
  `lti_launches`. Va en la URL y no en cookie porque el iframe del LMS puede bloquear
  cookies de terceros. Solo abre esa OVA y publica esa nota.
- **Deep Linking.** Solo roles Instructor/ContentDeveloper/Administrator. Se listan las
  OVAs `listo` del usuario de GenOVA con el mismo correo que el lanzador. La respuesta
  (`ltiResourceLink`, `custom.ova_id`, `lineItem` con `scoreMaximum: 100` si la OVA
  tiene fase *evaluate*) se firma con la clave de GenOVA y se envía con un formulario
  auto-enviado a `deep_link_return_url`. Cada selección es de un solo uso.
- **Reproductor.** Mismo shell que la exportación «Web (HTML)» (`scorm` formato `html`),
  construido al vuelo desde la versión activa. La página envoltorio define una API
  SCORM 1.2 (`window.API`); el `scorm.js` del paquete la encuentra en la ventana padre.
  Al completar (`lesson_status` completed/passed/failed + `score.raw`) se llama a
  `POST score`, que pide un token `client_credentials` con JWT assertion al LMS y
  publica el score en `{lineitem}/scores` (`application/vnd.ims.lis.v1.score+json`).
  Sin fase de evaluación o sin claim AGS no se publica nada.
- **Enmarcado.** Las páginas LTI llevan `Content-Security-Policy: frame-ancestors 'self'
  <origen del LMS>` y no `X-Frame-Options` (el middleware de seguridad lo omite cuando
  la respuesta ya declara `frame-ancestors`).
- **Rate limit.** SlowAPI: login/launch 60/min, selección y notas 30/min por IP.

## Limitaciones conocidas

- El docente debe tener cuenta en GenOVA con el mismo correo que en el LMS.
- La nota que se envía es la que calcula el runtime de la OVA (media de los recursos
  puntuados). Si no hay recursos puntuados y se marca como completada, no se envía nota.
- `target_link_uri` no se usa para elegir destino: siempre se valida en `/lti/launch`.
- Sin soporte de NRPS (lista de participantes) ni de LTI 1.1.
