"""Prompts for the 10 ENGAGE-phase resources (5E methodology).

Each prompt fixes the resource FORMAT but adapts all content to whatever
Machine Learning concept is passed in `concept` — no hardcoded ML subtopic.
"""

from llm.utils.utils import CURSO_CONTEXTO, DESIGN_SYSTEM, SCORM_JS, format_contexto_usuario

RECURSOS_META = {
    1: {
        "tipo": "Cómic Interactivo",
        "duracion": "1–2 min",
        "interactividad": "Alta",
        "emoji": "🎭",
    },
    2: {
        "tipo": "Storyboard de Video",
        "duracion": "40 seg",
        "interactividad": "Baja",
        "emoji": "🎬",
    },
    3: {"tipo": "Micro-Podcast", "duracion": "45 seg", "interactividad": "Baja", "emoji": "🎙️"},
    4: {
        "tipo": "Juego de Gamificación",
        "duracion": "1–2 min",
        "interactividad": "Alta",
        "emoji": "🎮",
    },
    5: {"tipo": "Dilema Ético", "duracion": "2–3 min", "interactividad": "Media", "emoji": "⚖️"},
    6: {
        "tipo": "Noticia de Impacto",
        "duracion": "1–2 min",
        "interactividad": "Baja",
        "emoji": "📰",
    },
    7: {"tipo": "Juego de Roles", "duracion": "2–3 min", "interactividad": "Media", "emoji": "🎯"},
    8: {
        "tipo": "Timeline Interactivo",
        "duracion": "2–3 min",
        "interactividad": "Media",
        "emoji": "📅",
    },
    9: {
        "tipo": "Escape Room Virtual",
        "duracion": "3–4 min",
        "interactividad": "Alta",
        "emoji": "🔐",
    },
    10: {
        "tipo": "Simulador Intuitivo",
        "duracion": "2–3 min",
        "interactividad": "Alta",
        "emoji": "🎛️",
    },
}


def prompt_texto(n: int, concept: str, contexto_usuario: str = "", config: dict | None = None) -> str:
    contexto = format_contexto_usuario(contexto_usuario)
    cfg = config or {}
    t = {
        1: f"""[ROL] Guionista de cómics educativos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Guion de {cfg.get('num_panels', 5)} viñetas con el robot "Max" que enganche al estudiante con "{concept}". Elige una analogía cotidiana concreta que capture fielmente la idea central de "{concept}" y construye una historia con progresión hacia un clímax que despierte curiosidad. Cada viñeta: descripcion_visual (≤25 palabras), dialogo (≤18 palabras), prompt_imagen (en inglés, estilo cartoon plano).
[RESTRICCIONES] Sin jerga técnica en los diálogos. Humor empático. La analogía debe reflejar de verdad cómo funciona "{concept}".
[SALIDA] JSON puro sin markdown: array de {cfg.get('num_panels', 5)} objetos con claves "numero","descripcion_visual","dialogo","prompt_imagen".""",
        2: f"""[ROL] Guionista audiovisual de EdTech.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Video de apertura de {cfg.get('duration_seconds', 40)} s sobre "{concept}". Genera: guion_visual con marcadores de tiempo cada 10 s y metáforas cotidianas apropiadas al tema; narracion_voz ≤70 palabras que cierra con una pregunta abierta; prompt_video en inglés ≤90 palabras para un generador de video.
[RESTRICCIONES] Sin términos técnicos en guion ni narración. Tono cinematográfico.
[SALIDA] JSON puro sin markdown con claves "guion_visual","narracion_voz","prompt_video".""",
        3: f"""[ROL] Productor de micro-podcasts educativos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Monólogo narrativo de {cfg.get('word_count', 110)} palabras aproximadamente donde el narrador ES "{concept}" hablando en primera persona. Estructura: situación → tensión → pregunta abierta final. Apóyate en una imagen mental concreta y fiel al tema.
[RESTRICCIONES] Sin matemática abstracta. Tono íntimo y reflexivo. Puntuación clara para pausas de lectura por voz.
[SALIDA] Solo el texto del monólogo en español, sin etiquetas ni JSON.""",
        4: f"""[ROL] Diseñador de minijuegos educativos cronometrados.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Minijuego de {cfg.get('num_rounds', 3)} rondas (30 s c/u) que haga sentir la intuición central de "{concept}". Diseña una mecánica de "detectar o elegir" apropiada al tema: cada ronda muestra un caso concreto con varias opciones, una de las cuales es la correcta. Dificultad creciente. Cada ronda: enunciado, items (lista de 3-6 opciones), respuesta_correcta (el item correcto), feedback_correcto e feedback_incorrecto (≤14 palabras).
[RESTRICCIONES] Sin jerga técnica. La mecánica debe conectar de forma genuina con "{concept}".
[SALIDA] JSON puro con clave "rondas": array de {cfg.get('num_rounds', 3)} objetos con "ronda","enunciado","items","respuesta_correcta","feedback_correcto","feedback_incorrecto".""",
        5: f"""[ROL] Redactor de casos de ética en IA.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] caso_narrativo de 130 palabras sobre una empresa ficticia donde el uso de "{concept}" produce una consecuencia ética no intencionada y plausible; pregunta_posicion directa; opciones (array de {cfg.get('num_options', 3)} strings); reflexion_post_voto de 60 palabras que amplía el dilema sin dar una respuesta correcta.
[RESTRICCIONES] Empresa ficticia. Tono periodístico. La consecuencia debe derivarse de forma realista de cómo funciona "{concept}".
[SALIDA] JSON puro con claves "caso_narrativo","pregunta_posicion","opciones","reflexion_post_voto".""",
        6: f"""[ROL] Periodista tecnológico especializado en IA.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Noticia ficticia plausible sobre un impacto real de "{concept}": titular ≤12 palabras; subtitulo ≤22 palabras; cuerpo_noticia de {cfg.get('body_words', 90)} palabras (organización ficticia, caso concreto); pregunta_cierre ≤12 palabras.
[RESTRICCIONES] Sin términos ultra-técnicos. Tono de urgencia informativa. Genera admiración, no miedo.
[SALIDA] JSON puro con claves "titular","subtitulo","cuerpo_noticia","pregunta_cierre".""",
        7: f"""[ROL] Diseñador de aprendizaje basado en roles.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] El estudiante es consultor de IA en su primer día. contexto_rol de {cfg.get('context_words', 70)} palabras (empresa de un sector concreto) donde "{concept}" resolvería un problema; pregunta_decision; opcion_A y opcion_B (cortas); feedback_A y feedback_B de 35 palabras (validan sin revelar la respuesta); pregunta_cierre ≤16 palabras.
[RESTRICCIONES] No nombres explícitamente "{concept}" en el escenario. El feedback no revela la respuesta.
[SALIDA] JSON puro con claves "contexto_rol","pregunta_decision","opcion_A","opcion_B","feedback_A","feedback_B","pregunta_cierre".""",
        8: f"""[ROL] Historiador de la tecnología.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Timeline de {cfg.get('num_milestones', 4)} hitos reales (o muy plausibles) que llevaron al desarrollo de "{concept}". Cada hito: año, nombre, descripcion de 45 palabras en tono de crónica, dato_sorprendente (1 línea), conexion_actual de 18 palabras con la vida del estudiante hoy.
[RESTRICCIONES] Hechos verídicos o altamente plausibles. Sin fórmulas. Cada hito ≤22 s de lectura.
[SALIDA] JSON puro con clave "hitos": array de {cfg.get('num_milestones', 4)} objetos con "año","nombre","descripcion","dato_sorprendente","conexion_actual".""",
        9: f"""[ROL] Diseñador de escape rooms educativas digitales.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] {cfg.get('num_puzzles', 3)} acertijos lógicos encadenados cuya lógica refleje la intuición de "{concept}" SIN usar su terminología técnica. Cada acertijo: escenario de 55 palabras, opcion_A, opcion_B, respuesta_correcta ("A" o "B"), explicacion_conexion de 22 palabras que revela el paralelismo con "{concept}".
[RESTRICCIONES] Respuestas deducibles por lógica cotidiana. Tono de urgencia narrativa.
[SALIDA] JSON puro con clave "acertijos": array de {cfg.get('num_puzzles', 3)} objetos con "numero","escenario","opcion_A","opcion_B","respuesta_correcta","explicacion_conexion".""",
    }
    base = t.get(n, "")
    return base + contexto if base else ""


def prompt_simulador(
    concept: str, contexto_usuario: str = "", design_system: str | None = None,
    config: dict | None = None,
) -> str:
    contexto = format_contexto_usuario(contexto_usuario)
    cfg = config or {}
    ds = design_system or DESIGN_SYSTEM
    return (
        f"""[ROL] Desarrollador front-end de simuladores educativos interactivos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Un simulador HTML5 autocontenido para la fase ENGAGE que provoque curiosidad: el estudiante manipula algo y ve el efecto, descubriendo la intuición central de "{concept}".
[TAREA] Diseña la mecánica interactiva más apropiada para "{concept}" (slider, lienzo clicable, arrastre, botones...). Debe incluir: {cfg.get('num_controls', 1)} control(es) manipulable(s), una visualización que reacciona en tiempo real (SVG o canvas), retroalimentación visual del estado, y un texto breve que interpreta lo que ocurre. Un botón de cierre ("¿Qué descubriste?") visible tras explorar.
[REQUISITOS] HTML5 autocontenido con todo CSS y JS embebido. Mínimo 280 líneas de calidad sin secciones vacías. Paleta oscura elegante (educativa oscura). El control manipulable debe responder en <50ms a la interacción.
{ds}
[SCORM] Al final del <script>: {SCORM_JS}. Llama _scormComplete() al pulsar el botón de cierre.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown."""
        + contexto
    )


def prompt_codigo(
    n: int, concept: str, contexto_usuario: str = "", design_system: str | None = None,
    config: dict | None = None,
) -> str:
    return prompt_simulador(concept, contexto_usuario, design_system, config)


def prompt_html(
    n: int,
    concept: str,
    data_json: str,
    contexto_usuario: str = "",
    design_system: str | None = None,
) -> str:
    contexto = format_contexto_usuario(contexto_usuario)
    ds = design_system or DESIGN_SYSTEM
    estilos = {
        1: "galería deslizable tipo cómic: tarjetas grandes de colores, bocadillos CSS, navegación prev/next con indicador de progreso",
        2: "storyboard vertical con marcadores de tiempo, narración en bloque de cita, prompt de video en una caja copiable",
        3: "reproductor de podcast oscuro con visualizador de onda CSS animado y el monólogo en texto grande",
        4: "minijuego con cronómetro visual, panel de items cliqueables, puntuación dinámica y pantalla de resultados",
        5: "tarjeta periodística: caso narrativo, 3 botones de votación, revelación animada de la reflexión post-voto",
        6: "periódico digital: titular bold, columna de noticia, pregunta de cierre resaltada, botón Continuar al final",
        7: "interfaz ejecutiva oscura: escenario narrativo, 2 botones de decisión, revelación animada del feedback",
        8: "timeline horizontal con 4 nodos clicables que expanden su información; se completa al abrir los 4",
        9: "escape room: fondo oscuro, 3 candados SVG que se abren progresivamente, un escenario por pantalla, botones A/B",
    }
    estilo = estilos.get(n, "página educativa moderna e interactiva")
    return (
        f"""[ROL] Desarrollador front-end experto en recursos educativos interactivos.
[CURSO] {CURSO_CONTEXTO}
[OBJETIVO] Construir un recurso HTML5 interactivo de la fase ENGAGE sobre "{concept}" que enganche al estudiante.
[DATOS] Usa exactamente este contenido, sin inventar ni omitir datos:
{data_json}
[FORMATO] {estilo}
[REQUISITOS]
- HTML5 autocontenido: todo el CSS en <style>, todo el JS en <script>.
- Mínimo 280 líneas de calidad. Cada elemento debe ser funcional (navegación, botones, feedback, puntuación).
- Paleta apropiada al tipo: cómic (clara vibrante), noticia (clara periodística), escape-room (oscura dramática),
  podcast (oscura íntima), timeline (clara académica), juegos (clara con acentos).
{ds}
[IMAGENES] Si un item de los datos incluye un campo "image_placeholder" (por ejemplo "__IMG_1__"), úsalo literalmente como src del tag <img> correspondiente (por ejemplo: <img src="__IMG_1__" alt="...">). Si un item NO tiene "image_placeholder", NO inventes uno y NO incluyas <img> para ese item — renderiza solo texto. El servidor reemplaza los placeholders válidos por imágenes reales al renderizar.
[SCORM] Al final del <script>: {SCORM_JS}. Llama _scormComplete() al completar la actividad principal.
[SALIDA] Solo el documento HTML completo desde <!DOCTYPE html>, sin markdown."""
        + contexto
    )
