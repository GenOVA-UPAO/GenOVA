"""Prompts for the 10 ENGAGE-phase resources (5E methodology).

Each prompt fixes the resource FORMAT but adapts all content to whatever
Machine Learning concept is passed in `concept` — no hardcoded ML subtopic.
"""
from agents.utils import CURSO_CONTEXTO, SCORM_JS

RECURSOS_META = {
    1: {"tipo": "Cómic Interactivo", "duracion": "1–2 min", "interactividad": "Alta", "emoji": "🎭"},
    2: {"tipo": "Video Opening", "duracion": "40 seg", "interactividad": "Baja", "emoji": "🎬"},
    3: {"tipo": "Micro-Podcast", "duracion": "45 seg", "interactividad": "Baja", "emoji": "🎙️"},
    4: {"tipo": "Juego de Gamificación", "duracion": "1–2 min", "interactividad": "Alta", "emoji": "🎮"},
    5: {"tipo": "Dilema Ético", "duracion": "2–3 min", "interactividad": "Media", "emoji": "⚖️"},
    6: {"tipo": "Noticia de Impacto", "duracion": "1–2 min", "interactividad": "Baja", "emoji": "📰"},
    7: {"tipo": "Juego de Roles", "duracion": "2–3 min", "interactividad": "Media", "emoji": "🎯"},
    8: {"tipo": "Timeline Interactivo", "duracion": "2–3 min", "interactividad": "Media", "emoji": "📅"},
    9: {"tipo": "Escape Room Virtual", "duracion": "3–4 min", "interactividad": "Alta", "emoji": "🔐"},
    10: {"tipo": "Simulador Intuitivo", "duracion": "2–3 min", "interactividad": "Alta", "emoji": "🎛️"},
}


def prompt_texto(n: int, concept: str) -> str:
    t = {
        1: f"""[ROL] Guionista de cómics educativos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Guion de 5 viñetas con el robot "Max" que enganche al estudiante con "{concept}". Elige una analogía cotidiana concreta que capture fielmente la idea central de "{concept}" y construye una historia con progresión hacia un clímax que despierte curiosidad. Cada viñeta: descripcion_visual (≤25 palabras), dialogo (≤18 palabras), prompt_imagen (en inglés, estilo cartoon plano).
[RESTRICCIONES] Sin jerga técnica en los diálogos. Humor empático. La analogía debe reflejar de verdad cómo funciona "{concept}".
[SALIDA] JSON puro sin markdown: array de 5 objetos con claves "numero","descripcion_visual","dialogo","prompt_imagen".""",

        2: f"""[ROL] Guionista audiovisual de EdTech.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Video de apertura de 40 s sobre "{concept}". Genera: guion_visual con marcadores de tiempo cada 10 s y metáforas cotidianas apropiadas al tema; narracion_voz ≤70 palabras que cierra con una pregunta abierta; prompt_video en inglés ≤90 palabras para un generador de video.
[RESTRICCIONES] Sin términos técnicos en guion ni narración. Tono cinematográfico.
[SALIDA] JSON puro sin markdown con claves "guion_visual","narracion_voz","prompt_video".""",

        3: f"""[ROL] Productor de micro-podcasts educativos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Monólogo narrativo de 100-120 palabras donde el narrador ES "{concept}" hablando en primera persona. Estructura: situación → tensión → pregunta abierta final. Apóyate en una imagen mental concreta y fiel al tema.
[RESTRICCIONES] Sin matemática abstracta. Tono íntimo y reflexivo. Puntuación clara para pausas de lectura por voz.
[SALIDA] Solo el texto del monólogo en español, sin etiquetas ni JSON.""",

        4: f"""[ROL] Diseñador de minijuegos educativos cronometrados.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Minijuego de 3 rondas (30 s c/u) que haga sentir la intuición central de "{concept}". Diseña una mecánica de "detectar o elegir" apropiada al tema: cada ronda muestra un caso concreto con varias opciones, una de las cuales es la correcta. Dificultad creciente. Cada ronda: enunciado, items (lista de 3-6 opciones), respuesta_correcta (el item correcto), feedback_correcto e feedback_incorrecto (≤14 palabras).
[RESTRICCIONES] Sin jerga técnica. La mecánica debe conectar de forma genuina con "{concept}".
[SALIDA] JSON puro con clave "rondas": array de 3 objetos con "ronda","enunciado","items","respuesta_correcta","feedback_correcto","feedback_incorrecto".""",

        5: f"""[ROL] Redactor de casos de ética en IA.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] caso_narrativo de 130 palabras sobre una empresa ficticia donde el uso de "{concept}" produce una consecuencia ética no intencionada y plausible; pregunta_posicion directa; opciones (array de 3 strings); reflexion_post_voto de 60 palabras que amplía el dilema sin dar una respuesta correcta.
[RESTRICCIONES] Empresa ficticia. Tono periodístico. La consecuencia debe derivarse de forma realista de cómo funciona "{concept}".
[SALIDA] JSON puro con claves "caso_narrativo","pregunta_posicion","opciones","reflexion_post_voto".""",

        6: f"""[ROL] Periodista tecnológico especializado en IA.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Noticia ficticia plausible sobre un impacto real de "{concept}": titular ≤12 palabras; subtitulo ≤22 palabras; cuerpo_noticia de 90 palabras (organización ficticia, caso concreto); pregunta_cierre ≤12 palabras.
[RESTRICCIONES] Sin términos ultra-técnicos. Tono de urgencia informativa. Genera admiración, no miedo.
[SALIDA] JSON puro con claves "titular","subtitulo","cuerpo_noticia","pregunta_cierre".""",

        7: f"""[ROL] Diseñador de aprendizaje basado en roles.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] El estudiante es consultor de IA en su primer día. contexto_rol de 70 palabras (empresa de un sector concreto) donde "{concept}" resolvería un problema; pregunta_decision; opcion_A y opcion_B (cortas); feedback_A y feedback_B de 35 palabras (validan sin revelar la respuesta); pregunta_cierre ≤16 palabras.
[RESTRICCIONES] No nombres explícitamente "{concept}" en el escenario. El feedback no revela la respuesta.
[SALIDA] JSON puro con claves "contexto_rol","pregunta_decision","opcion_A","opcion_B","feedback_A","feedback_B","pregunta_cierre".""",

        8: f"""[ROL] Historiador de la tecnología.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Timeline de 4 hitos reales (o muy plausibles) que llevaron al desarrollo de "{concept}". Cada hito: año, nombre, descripcion de 45 palabras en tono de crónica, dato_sorprendente (1 línea), conexion_actual de 18 palabras con la vida del estudiante hoy.
[RESTRICCIONES] Hechos verídicos o altamente plausibles. Sin fórmulas. Cada hito ≤22 s de lectura.
[SALIDA] JSON puro con clave "hitos": array de 4 objetos con "año","nombre","descripcion","dato_sorprendente","conexion_actual".""",

        9: f"""[ROL] Diseñador de escape rooms educativas digitales.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] 3 acertijos lógicos encadenados cuya lógica refleje la intuición de "{concept}" SIN usar su terminología técnica. Cada acertijo: escenario de 55 palabras, opcion_A, opcion_B, respuesta_correcta ("A" o "B"), explicacion_conexion de 22 palabras que revela el paralelismo con "{concept}".
[RESTRICCIONES] Respuestas deducibles por lógica cotidiana. Tono de urgencia narrativa.
[SALIDA] JSON puro con clave "acertijos": array de 3 objetos con "numero","escenario","opcion_A","opcion_B","respuesta_correcta","explicacion_conexion".""",
    }
    return t.get(n, "")


def prompt_simulador(concept: str) -> str:
    return f"""[ROL] Desarrollador front-end de simuladores educativos interactivos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Un simulador HTML5 autocontenido para la fase ENGAGE que provoque curiosidad: el estudiante manipula algo y ve el efecto, descubriendo la intuición central de "{concept}".
[TAREA] Diseña la mecánica interactiva más apropiada para "{concept}" (slider, lienzo clicable, arrastre, botones...). Debe incluir: al menos un control manipulable, una visualización que reacciona en tiempo real (SVG o canvas), retroalimentación visual del estado, y un texto breve que interpreta lo que ocurre. Un botón de cierre ("¿Qué descubriste?") visible tras explorar.
[REQUISITOS] HTML5 autocontenido: CSS y JS embebidos, sin CDN ni librerías. Empieza con <!DOCTYPE html>. Responsive. Diseño moderno oscuro, animaciones suaves. Mínimo ~250 líneas de código de calidad, sin secciones vacías.
[SCORM] Al final del <script>: {SCORM_JS}. Llama _scormComplete() al pulsar el botón de cierre.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown."""


def prompt_html(n: int, concept: str, data_json: str) -> str:
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
    return f"""[ROL] Desarrollador front-end experto en recursos educativos interactivos.
[CURSO] {CURSO_CONTEXTO}
[OBJETIVO] Construir un recurso HTML5 interactivo de la fase ENGAGE sobre "{concept}" que enganche al estudiante.
[DATOS] Usa exactamente este contenido, sin inventar ni omitir datos:
{data_json}
[FORMATO] {estilo}
[REQUISITOS]
- HTML5 autocontenido: todo el CSS en <style>, todo el JS en <script>. Sin CDN, librerías ni recursos externos.
- Empieza con <!DOCTYPE html>. Responsive en móvil y escritorio.
- Diseño moderno y cuidado: paleta coherente, jerarquía tipográfica, espaciado generoso, transiciones suaves, estados hover/activo.
- Interactividad real: cada elemento del contenido debe ser funcional (navegación, botones, feedback, puntuación).
- Accesibilidad básica: contraste alto y foco visible.
- Mínimo ~250 líneas de HTML/CSS/JS de calidad; sin secciones vacías ni texto de relleno.
[SCORM] Al final del <script>: {SCORM_JS}. Llama _scormComplete() al completar la actividad principal.
[SALIDA] Solo el documento HTML completo desde <!DOCTYPE html>, sin markdown."""
