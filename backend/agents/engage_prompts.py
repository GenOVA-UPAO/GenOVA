"""Structured prompts for all 10 ENGAGE phase resources (5E methodology)."""
from agents.utils import SCORM_JS

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
        1: f"""[ROL] Guionista de cómics educativos para universitarios sin experiencia en ML.
[CONTEXTO] El estudiante ve "{concept}" por primera vez y necesita un gancho visual humorístico.
[TAREA] Guion de 4 viñetas con robot "Max". Cada viñeta: descripcion_visual (≤20 palabras), dialogo (≤15 palabras), prompt_imagen (inglés, estilo cartoon).
[RESTRICCIONES] Sin jerga técnica en diálogos. Progresión narrativa hacia un clímax. Humor empático.
[SALIDA] JSON puro sin markdown: array de 4 objetos con claves "numero","descripcion_visual","dialogo","prompt_imagen".""",

        2: f"""[ROL] Guionista audiovisual de EdTech para aperturas de sesión.
[CONTEXTO] Estudiante a punto de ver "{concept}". Necesita video de apertura de 40 segundos.
[TAREA] Genera: guion_visual con marcadores de tiempo cada 10s usando metáforas cotidianas, narracion_voz ≤60 palabras terminando en pregunta abierta, prompt_video en inglés ≤80 palabras para Runway ML.
[RESTRICCIONES] Sin términos técnicos en guion ni narración. Tono cinematográfico.
[SALIDA] JSON puro sin markdown con claves "guion_visual","narracion_voz","prompt_video".""",

        3: f"""[ROL] Productor de micro-podcasts educativos de tecnología.
[CONTEXTO] Estudiante a punto de estudiar "{concept}". Necesita monólogo de 45 segundos.
[TAREA] Monólogo narrativo de 90-100 palabras. El narrador ES el concepto hablando en primera persona. Termina con pregunta abierta. Estructura: situación (10s) → tensión (20s) → pregunta (15s).
[RESTRICCIONES] Sin términos matemáticos abstractos. Tono íntimo y reflexivo. Puntuación para pausas TTS.
[SALIDA] Solo el texto del monólogo en español, sin etiquetas ni JSON.""",

        4: f"""[ROL] Diseñador de minijuegos educativos cronometrados.
[CONTEXTO] Estudiante a punto de estudiar "{concept}". Necesita 3 rondas para sentir urgencia del concepto.
[TAREA] Minijuego de 3 rondas (30s c/u). Tabla 5x3 de e-commerce (nombre_cliente, monto_compra, fecha) con valor problemático. Ronda 1: nulo, Ronda 2: outlier extremo ($999,999), Ronda 3: duplicado. Incluir celda_problema (ej:"fila2_col1"), feedback_correcto e incorrecto (≤10 palabras).
[RESTRICCIONES] Sin jerga técnica. Duplicados idénticos.
[SALIDA] JSON puro: objeto "rondas": array 3 objetos con "tabla","celda_problema","tipo_problema","feedback_correcto","feedback_incorrecto".""",

        5: f"""[ROL] Redactor de casos pedagógicos de ética en IA para ingeniería.
[CONTEXTO] Estudiante a punto de estudiar "{concept}". Necesita dilema ético que genere posición personal.
[TAREA] caso_narrativo 120 palabras sobre empresa con consecuencia ética no intencionada, pregunta_posicion directa, opciones: array de 3 strings, reflexion_post_voto 50 palabras que amplía el dilema sin dar respuesta correcta.
[RESTRICCIONES] Empresa ficticia. Tono periodístico. Sin jerga técnica en narrativa.
[SALIDA] JSON puro con claves "caso_narrativo","pregunta_posicion","opciones","reflexion_post_voto".""",

        6: f"""[ROL] Periodista tecnológico especializado en IA aplicada.
[CONTEXTO] Estudiante a punto de estudiar "{concept}". Necesita noticia de impacto real.
[TAREA] Noticia ficticia plausible: titular ≤12 palabras, subtitulo 20 palabras, cuerpo_noticia 70 palabras (hospital/empresa ficticia), pregunta_cierre ≤10 palabras.
[RESTRICCIONES] Sin términos ultra-técnicos. Tono de urgencia informativa. Genera admiración, no miedo.
[SALIDA] JSON puro con claves "titular","subtitulo","cuerpo_noticia","pregunta_cierre".""",

        7: f"""[ROL] Diseñador de Role-Based Learning para cursos universitarios de IA.
[CONTEXTO] Estudiante a punto de estudiar "{concept}". Asume rol de consultor IA en su primer día.
[TAREA] contexto_rol 60 palabras (empresa retail o salud), pregunta_decision, opcion_A y opcion_B (cortas), feedback_A y feedback_B 30 palabras c/u (valida sin revelar respuesta), pregunta_cierre 15 palabras.
[RESTRICCIONES] No uses el nombre exacto del concepto en el escenario. Feedback no revela respuesta.
[SALIDA] JSON puro con claves "contexto_rol","pregunta_decision","opcion_A","opcion_B","feedback_A","feedback_B","pregunta_cierre".""",

        8: f"""[ROL] Historiador de tecnología especializado en IA, narrativa dramática y accesible.
[CONTEXTO] Estudiante a punto de estudiar "{concept}". Necesita contexto histórico de 3 hitos reales.
[TAREA] Timeline de 3 hitos: año, nombre, descripcion 40 palabras en crónica histórica, dato_sorprendente (1 línea), conexion_actual 15 palabras con vida del estudiante hoy.
[RESTRICCIONES] Hechos verídicos o altamente plausibles. Sin fórmulas. Cada hito ≤20s de lectura.
[SALIDA] JSON puro con clave "hitos": array 3 objetos con "año","nombre","descripcion","dato_sorprendente","conexion_actual".""",

        9: f"""[ROL] Diseñador de escape rooms educativas digitales para ML universitario.
[CONTEXTO] Estudiante a punto de estudiar "{concept}". Necesita 3 acertijos progresivos de diagnóstico.
[TAREA] 3 acertijos lógicos encadenados sin usar terminología técnica de "{concept}". Cada acertijo: escenario 50 palabras, opcion_A, opcion_B, respuesta_correcta ("A" o "B"), explicacion_conexion 20 palabras.
[RESTRICCIONES] Respuestas deducibles por lógica cotidiana. Tono de urgencia narrativa.
[SALIDA] JSON puro con clave "acertijos": array 3 objetos con "numero","escenario","opcion_A","opcion_B","respuesta_correcta","explicacion_conexion".""",
    }
    return t.get(n, "")


def prompt_simulador(concept: str) -> str:
    return f"""Genera simulador HTML5 autocontenido sobre "{concept}" para la fase ENGAGE (provocar curiosidad).
ESTRUCTURA: slider "Velocidad de Aprendizaje" (0.001–2.0), animación SVG pelota en curva U reactiva al slider, emoji dinámico (🐢<0.01 · ✅0.01-0.3 · 💥>0.5), texto analógico adaptado a "{concept}", botón "¿Cuál es el mejor valor?" visible tras 30s.
CÓDIGO SCORM al final del script: {SCORM_JS}. Llama _scormComplete() al hacer clic en el botón.
RESTRICCIONES: CSS/SVG puro, sin CDN. Un solo HTML. Diseño moderno oscuro.
SALIDA: Solo HTML completo desde <!DOCTYPE html>, sin markdown."""


def prompt_html(n: int, concept: str, data_json: str) -> str:
    estilos = {
        1: "galería deslizable tipo cómic: tarjetas de colores, bocadillos CSS, navegación prev/next",
        2: "storyboard con marcadores de tiempo, narración en bloque cita, prompt de video en caja copiable",
        3: "reproductor de podcast oscuro con visualizador de onda CSS animado, texto grande del monólogo",
        4: "minijuego: cronómetro visual, tabla 5x3 con celdas cliqueables, puntuación dinámica, pantalla de resultados",
        5: "tarjeta periodística: caso narrativo, 3 botones de votación, revelación animada de reflexión post-voto",
        6: "periódico digital: titular bold, columna de noticia, pregunta de cierre resaltada, botón Continuar al llegar al fondo",
        7: "interfaz ejecutiva oscura, escenario narrativo, 2 botones de decisión, revelación de feedback animada",
        8: "timeline horizontal: 3 nodos clickeables que expanden info, completado al expandir los 3",
        9: "escape room: fondo oscuro, 3 candados SVG que se abren progresivamente, escenarios por pantalla, botones A/B",
    }
    estilo = estilos.get(n, "página educativa moderna e interactiva")
    return f"""Genera HTML5 interactivo completo para recurso ENGAGE sobre "{concept}".
DATOS JSON: {data_json}
DISEÑO: {estilo}
REQUISITOS: HTML autocontenido (CSS en <style>, JS en <script>, sin CDN). Responsive. Inicia con <!DOCTYPE html>.
SCORM al final del script: {SCORM_JS}. Llama _scormComplete() al completar.
SALIDA: Solo el HTML, sin markdown."""
