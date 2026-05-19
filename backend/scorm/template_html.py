def build_manifest(course_title: str, module_title: str) -> str:
    return f"""<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<manifest
  identifier=\"GENOVA-SCORM-EXPORT\"
  version=\"1.0\"
  xmlns=\"http://www.imsproject.org/xsd/imscp_rootv1p1p2\"
  xmlns:adlcp=\"http://www.adlnet.org/xsd/adlcp_rootv1p2\"
  xmlns:imsmd=\"http://www.imsglobal.org/xsd/imsmd_rootv1p2p1\"
  xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"
  xsi:schemaLocation=\"http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
  http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd
  http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd\">

  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>

  <organizations default=\"ORG-DEFAULT\">
    <organization identifier=\"ORG-DEFAULT\">
      <title>{course_title}</title>
      <item identifier=\"ITEM-INDEX\" identifierref=\"RES-INDEX\" isvisible=\"true\">
        <title>{module_title}</title>
      </item>
    </organization>
  </organizations>

  <resources>
    <resource identifier=\"RES-INDEX\" type=\"webcontent\" adlcp:scormtype=\"sco\" href=\"index.html\">
      <file href=\"index.html\" />
      <file href=\"resources/content.html\" />
      <file href=\"resources/styles.css\" />
      <file href=\"resources/scorm.js\" />
      <file href=\"resources/app.js\" />
    </resource>
  </resources>
</manifest>
"""


def build_index_html(course_title: str) -> str:
    return f"""<!doctype html>
<html lang=\"es\">
  <head>
    <meta charset=\"UTF-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
    <title>{course_title}</title>
    <link rel=\"stylesheet\" href=\"resources/styles.css\" />
  </head>
  <body>
    <main class=\"container\">
      <header>
        <h1>{course_title}</h1>
        <p>Paquete SCORM de prueba para Canvas LMS (UPAO)</p>
      </header>

      <nav class=\"nav\">
        <a href=\"#overview\">Resumen</a>
        <a href=\"#content\">Contenido</a>
        <a href=\"#progress\">Progreso</a>
      </nav>

      <section id=\"overview\" class=\"card\">
        <h2>Resumen</h2>
        <p>Este OVA de prueba verifica estructura SCORM 1.2 y comunicación LMS.</p>
      </section>

      <section id=\"content\" class=\"card\">
        <h2>Contenido de prueba</h2>
        <iframe title=\"Contenido OVA\" src=\"resources/content.html\"></iframe>
      </section>

      <section id=\"progress\" class=\"card\">
        <h2>Estado SCORM</h2>
        <p id=\"scorm-status\">Pendiente de inicialización...</p>
        <button id=\"complete-btn\" type=\"button\">Marcar progreso como completado</button>
      </section>
    </main>

    <script src=\"resources/scorm.js\"></script>
    <script src=\"resources/app.js\"></script>
  </body>
</html>
"""


PHASE_LABELS = {
    "motivacion": "Motivación",
    "contenido": "Contenido",
    "explicacion": "Explicación",
    "actividad": "Actividad",
    "evaluacion": "Evaluación",
}

DEFAULT_PHASES = [
    {"type": "motivacion", "order": 1,
     "content": "Explora cómo aplicar Machine Learning en problemas reales de negocio."},
    {"type": "contenido", "order": 2,
     "content": "Identifica variables relevantes y revisa un dataset simple de clasificación."},
    {"type": "explicacion", "order": 3,
     "content": "Compara conceptos de entrenamiento, validación y evaluación de modelos."},
    {"type": "actividad", "order": 4,
     "content": "Piensa en un caso UPAO donde puedas aplicar un modelo supervisado."},
    {"type": "evaluacion", "order": 5,
     "content": "Checklist: ¿entendiste objetivo, datos y criterio de éxito del modelo?"},
]


def build_content_html(phases: list[dict] | None = None) -> str:
    source = phases if phases else DEFAULT_PHASES
    sections = ""
    for phase in source:
        label = PHASE_LABELS.get(phase.get("type", ""), phase.get("type", "Fase"))
        content = phase.get("content", "")
        sections += f"\n      <section>\n        <h3>{label}</h3>\n        <p>{content}</p>\n      </section>"

    return f"""<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Contenido OVA</title>
  </head>
  <body>
    <article>{sections}
    </article>
  </body>
</html>
"""
