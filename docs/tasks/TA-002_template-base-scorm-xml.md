# TA-002: Crear template base SCORM XML

## Ruta de guardado
`tasks/TA-002_template-base-scorm-xml.md`

## Objetivo
Definir y proveer una plantilla base SCORM 1.2 reutilizable por el motor de empaquetado de la HU-004, para envolver contenido generado por IA y exportarlo como paquete compatible con Canvas LMS.

## Alcance
Incluye:
- `imsmanifest.xml` genérico y válido para SCORM 1.2.
- Carpeta `resources/` para activos compartidos.
- `index.html` base con placeholders explícitos para fases 5E.
- Hoja de estilos común (`resources/styles.css`).

No incluye:
- Compresión final a `.zip`.
- Lógica del motor HU-004 para reemplazo dinámico de placeholders.

## Entregables técnicos

### 1) Estructura de archivos de plantilla
```text
scorm-template/
├── imsmanifest.xml
├── index.html
└── resources/
    └── styles.css
```

### 2) Placeholders obligatorios para inyección IA
En `index.html` deben existir placeholders claramente identificados:
- `{{COURSE_TITLE}}`
- `{{COURSE_DESCRIPTION}}`
- `{{PHASE_ENGAGE_HTML}}`
- `{{PHASE_EXPLORE_HTML}}`
- `{{PHASE_EXPLAIN_HTML}}`
- `{{PHASE_ELABORATE_HTML}}`
- `{{PHASE_EVALUATE_HTML}}`

### 3) Reglas de validez SCORM 1.2
El `imsmanifest.xml` debe contener al menos:
- `metadata/schema = ADL SCORM`
- `metadata/schemaversion = 1.2`
- `organizations` con organización por defecto.
- `resources` con un recurso SCO apuntando a `index.html`.
- Referencias de archivos incluidas en `<file href="..."/>`.

## Criterios de aceptación (verificables)
1. Existe archivo `scorm-template/imsmanifest.xml` bien formado y estructurado para SCORM 1.2.
2. Existe carpeta `scorm-template/resources/`.
3. Existe archivo `scorm-template/index.html` base.
4. Existe archivo `scorm-template/resources/styles.css` común.
5. El `index.html` contiene placeholders 5E claramente identificados para inyección posterior.
6. El diseño permite reutilización por HU-004 sin cambios estructurales.

## Estimación
Implementación objetivo: **< 3 horas**.

## Mockup ASCII (vista base `index.html`)
```text
+--------------------------------------------------------------------------------+
| {{COURSE_TITLE}}                                                               |
| {{COURSE_DESCRIPTION}}                                                         |
+--------------------------------------------------------------------------------+
| [Engage]                                                                       |
| {{PHASE_ENGAGE_HTML}}                                                          |
+--------------------------------------------------------------------------------+
| [Explore]                                                                      |
| {{PHASE_EXPLORE_HTML}}                                                         |
+--------------------------------------------------------------------------------+
| [Explain]                                                                      |
| {{PHASE_EXPLAIN_HTML}}                                                         |
+--------------------------------------------------------------------------------+
| [Elaborate]                                                                    |
| {{PHASE_ELABORATE_HTML}}                                                       |
+--------------------------------------------------------------------------------+
| [Evaluate]                                                                     |
| {{PHASE_EVALUATE_HTML}}                                                        |
+--------------------------------------------------------------------------------+
```

## Notas de integración con HU-004
- HU-004 deberá reemplazar placeholders con contenido IA por fase.
- HU-004 deberá empaquetar todo el árbol `scorm-template/` en zip SCORM.
- Si HU-004 agrega assets extra (imágenes, JS, PDFs), deberá registrarlos en `imsmanifest.xml` dentro del recurso correspondiente.
