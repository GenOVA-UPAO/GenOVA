# Auditoría visual E2E — despliegue local (2026-07-16)

> **Estado de remediación (mismo día)**: ejecutada según
> `sdd/plans/2026-07-16-remediacion-auditoria-visual.md`. Resuelto: MO-01, WS-01,
> WS-02, CR-01/02, GN-01/02/03/05, G-01 (dark mode completo), G-02 (view
> transitions retiradas), DB-02/04/07/08, MD-01/02, PF-01/02, AN-01, RP-01,
> NF-01, RG-01/02, EX-01/02/03, VN-01 (entrada en menú de usuario), LG-01.
> **Falsos positivos del harness de browser** (re-diagnosticados con
> instrumentación): DB-06 (el menú de usuario siempre funcionó — el pane no
> entregaba clicks/teclas reales; se añadió igualmente ARIA `role=menu`,
> `aria-expanded`, Escape y entradas Vinculación/Analítica) y LG-02 (el pane no
> entrega `keydown` a la página — 0 eventos instrumentados; el form de login es
> correcto). Fuera de alcance consciente: MO-03, DB-03, CR-05, MD-03.

**Alcance**: recorrido manual asistido por browser de 16 interfaces sobre `pnpm dev` + `uvicorn` locales,
con seeds `user@genova.ai` y `admin@genova.ai`. Se revisó: iconografía, adherencia al chrome
Editorial Académico UPAO, responsive (375 / 768 / 1280), consistencia de componentes, errores
de consola/red y a11y superficial. **Solo observación — ningún fix aplicado.**

Dark mode quedó cubierto por un único hallazgo global (G-01): la app no tiene dark mode, así que
no hubo nada que auditar por vista. Generación real de OVA ejecutada (2 recursos, fases ENGAGE+EXPLAIN).

## Resumen ejecutivo

| Sev. | # | Hallazgos clave |
|---|---|---|
| ALTA | 3 | Menú de usuario muerto (sin logout en toda la app) · /mis-ovas roto en mobile · workspace en blanco en mobile |
| MEDIA | 10 | Sin dark mode · Enter no envía login · modales fantasma en /crear · emojis como iconos · tabs de recurso indistinguibles · a11y (accnames vacíos, botones anidados) · tabs cortados en /profile · tab "Acceso denegado" · redirect silencioso /analytics · job fallido sin estado de error |
| BAJA | ~14 | Ortografía, copys legacy "ML", inconsistencias de patrón entre páginas |

**Iconografía (veredicto)**: la app usa **Phosphor Icons** vía icon-font (`<i class="ph ph-*">`, wrapper
`gn-nav-icon`) de forma consistente en el chrome — framework legítimo, cero SVG sueltos. La excepción
son **emojis hardcodeados** en el flujo de generación (CR-01/GN-01), que rompen el sistema.

---

## Hallazgos por severidad

### ALTA

- **[DB-06] Menú de usuario (avatar) muerto — sin logout en toda la app.**
  Click real y sintético sobre "Menu de usuario" (probado como user y como admin): no monta
  overlay ni `role=menu`, sin `aria-expanded`. `/login` rebota a `/dashboard` por `guestGuard` y la
  cookie es httpOnly → **no existe ninguna vía de cerrar sesión desde la UI** (el endpoint
  `POST /api/auth/logout` sí funciona). No es un problema general de overlays: los modales de
  /crear y el dropdown "Acción" de /admin sí abren.

- **[MO-01] /mis-ovas inusable en mobile (375px).**
  El grid de cards no colapsa a 1 columna: `gn-ova-card` mide 619px dentro de un viewport de 375
  (`main.scrollWidth=619`). Títulos, badges y botones ("Metadatos", "Papelera") quedan cortados y
  solo se alcanzan con scroll horizontal interno. /papelera hereda el mismo componente.

- **[WS-01] Workspace (/workspace/:id) en blanco en mobile.**
  Existe un toggle responsive Chat | Preview/Code (buena base), pero al elegir cualquiera el
  contenido no se pinta: el DOM contiene toolbar, tabs e iframe, pero ~186 contenedores quedan con
  altura 0. Editor inutilizable en móvil.

### MEDIA

- **[G-01] No hay dark mode.** `prefers-color-scheme: dark` se ignora, sin clase `dark` en `<html>`
  ni toggle. Decidir: soportarlo o declararlo fuera de alcance.
- **[LG-02] El login no se envía con Enter.** Con foco en Contraseña y datos válidos, Enter no
  dispara submit (cero POST); solo funciona el click en "Entrar". UX/a11y de teclado.
- **[CR-02] Modales fantasma en /crear.** "Tema visual del OVA": Escape lo oculta pero queda
  montado y reaparece; se tragó 148 caracteres tecleados al textarea (interceptaba el foco).
  Además permite apilar "Archivos de referencia" encima de "Tema visual" (2 modales abiertos).
- **[CR-01/GN-01] Emojis como iconos + nombres perdidos en generación.** En cola: "🎭 Cómic
  Interactivo", "📖 Lectura Guiada" (emoji hardcodeado, rompe Phosphor). Durante la generación
  pasan a llamarse "Recurso 1" / "Recurso 2" — se pierde el nombre real y los tabs de preview son
  indistinguibles.
- **[WS-02] Tabs de recurso rotulados solo por fase y duplicados** en el workspace: "Enganche ·
  Enganche · Exploración · Exploración". Imposible saber cuál es cuál; falta el nombre del recurso.
- **[GN-03] Job fallido sin estado de error en la UI.** El worker murió con 2/2 recursos listos y la
  UI siguió en "Generando recursos…" (barra llena, solo "Cancelar") ≥2 min después; en Analítica
  seguía "GENERANDO" ~8 min después. Coherente con los 105 OVAs (71%) "Generando" zombis que
  muestra la propia Analítica.
- **[A11y transversal]** (DB-07, MD-01, EX-01, checkboxes de /mis-ovas): links del sidebar sin
  nombre accesible (labels visibles pero accname vacío), logo con accname "Gen", 6 tabs de /models
  sin nombre, radios del modal de tema sin nombre, checkboxes de selección sin label, y en
  /explore–/engage **botones anidados** (`<button>` dentro de `<button>`, HTML inválido).
- **[PF-01] /profile mobile:** la barra de tabs desborda 11px — "Seguridad" cortado (contenedor
  `w-fit` sin wrap/scroll) + decoración absoluta que empuja el scrollWidth.
- **[PF-02] Tab "Configuración" visible para usuario sin permisos** cuyo único contenido es
  "Acceso denegado: se requieren privilegios de administrador". Ocultarlo si no aplica.
- **[AN-01] /analytics con usuario normal redirige en silencio a /dashboard.** Con admin funciona
  (label "Analítica" en sidebar). Si es por rol, mejor 403 explícito o mantener la ruta oculta con
  mensaje.

### BAJA

- **[G-02]** Consola: `InvalidStateError: Transition was aborted` (View Transitions) en cada
  navegación; durante la transición se capturan frames intermedios con artefactos.
- **[RG-01]** /register inconsistente con /login y /forgot-password: sin eyebrow "GENOVA · UPAO" y
  sin acento naranja superior en la card (las otras dos lo tienen).
- **[RG-02]** Placeholder "Ejemplo: Solange" (nombre personal, resto de demo).
- **[DB-02]** "Configuracion" sin tilde en el sidebar (texto fuente; el uppercase es CSS).
- **[DB-08]** aria-label "Menu de usuario" sin tilde.
- **[DB-03]** Botón "+ Crear OVA" duplicado visible (header y hero del dashboard).
- **[DB-04 / EX-03 / GN-02]** Copys legacy "ML" por todos lados: branding "GenOVA **ML**", login
  "Accede para continuar al curso de ML", /explore "escribe el concepto de ML", placeholder
  "Ej: K-Means…", badge "RECURSO INTERACTIVO DE MACHINE LEARNING" en un OVA de redes. La app ya es
  genérica; el copy sigue siendo del curso demo de ML.
- **[DB-05]** Usuario normal no tiene entrada de nav a /vinculacion (ruta funcional solo por URL).
  El sidebar por rol del admin sí la lista ("Vincular").
- **[RP-01]** /reset-password sin token muestra el form completo editable + banner de error;
  mejor ocultar/deshabilitar.
- **[NF-01]** 404: heading "Página no encontrada" en sans-serif ("404" sí va en serif) —
  inconsistencia tipográfica menor con el chrome.
- **[MO-02]** Acción "Papelera" en cards usa sustantivo como verbo ("Eliminar" / "Enviar a papelera").
- **[MO-03]** Paginación solo Anterior/Siguiente ("Página 1 de 7"), sin salto directo.
- **[MD-02]** Copy desactualizado en Credenciales: "Groq — LLM principal — Llama 3" (el primario
  real es DeepSeek V4 Flash).
- **[MD-03]** Heading de /models dentro de card con borde; dashboard y mis-ovas lo ponen directo
  sobre el fondo — patrón inconsistente.
- **[EX-02]** Chip "Disponible en Sprint 2" (texto interno) visible en el playground público.
- **[CR-03]** Botón "?" (Ver tutorial) icono-solo flotante al final del stepper, fácil de no ver.
- **[CR-05]** Fases 5E en inglés (ENGAGE/EXPLORE/…) en UI en español — estándar 5E, pero convive
  con títulos en español; validar como decisión consciente.
- **[Roles]** Chips de permisos mezclan snake_case inglés (`create_ova`, `manage_users`) con
  español ("Configurar fallback propio") en la misma card.

### Positivo (funciona bien)

- Iconografía Phosphor consistente en el chrome; serif Fraunces en títulos; azul/naranja UPAO.
- Estados de card diferenciados (Listo/Generando/Borrador) con acciones deshabilitadas coherentes;
  badge contador en Papelera; lista de /mis-ovas se actualiza en vivo al crear un job.
- Validación progresiva del composer /crear (contador de caracteres → recursos por fase → botón).
- Picker 5E: color por fase, badges de interactividad, preview por recurso, contador en Confirmar.
- Historial de versiones en modal con revertir; deep-link `/crear?jobId=` con skeleton.
- Drawer mobile del shell correcto; /models y /vinculacion responsive OK; tabla de /admin con
  scroll horizontal interno correcto en mobile.
- Estados de error de /verify-email y /reset-password claros (mensajes no técnicos).
- Admin: tabla usuarios con búsqueda/filtro/acciones (dropdown "Acción" sí funciona), Gestión de
  Roles clara con "Modo tesis", Analítica con métricas y top creadores.

## Observaciones fuera de alcance visual (anotadas de paso)

- **[GN-05]** Worker local: al fallar la generación, el logging crasheó con
  `UnicodeEncodeError: 'charmap'` (consola Windows cp1252) enmascarando el error real.
- **Jobs zombis**: la cola arq compartida drenó ~40 jobs "expired" al levantar worker local; mi job
  esperó 558s. 105 OVAs (71%) figuran "Generando" en Analítica — datos sucios de jobs nunca
  procesados/finalizados.
- El fallo final del job fue cadena LLM agotada (Groq 413 TPM 12k < 19.6k solicitados +
  minimax EmptyContentError + rate limits de modelos :free de OpenRouter).

## Condiciones del test

- Front `pnpm dev` (:4200), back `uvicorn` (:8000), worker `arq worker.WorkerSettings` levantado
  manualmente (sin él, los jobs quedan "En cola…" para siempre con REDIS_URL seteado).
- Viewports: 1280x800, 375x812, spot-checks 768. Dark: `prefers-color-scheme` (sin efecto, G-01).
- No se probó: exportación SCORM real, flujo 2FA completo, invitación de usuarios, modo tesis,
  Duplicar/Descargar/Restaurar (acciones con efecto), 768px exhaustivo.
