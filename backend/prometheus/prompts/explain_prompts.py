"""Prompts for the 10 EXPLAIN-phase resources (5E methodology).

Each prompt fixes the resource FORMAT but adapts all content to whatever
Machine Learning concept is passed in `concept` — no hardcoded ML subtopic.
"""

from llm.utils import CURSO_CONTEXTO, DESIGN_SYSTEM, SCORM_JS, format_contexto_usuario

# fmt: off
RECURSOS_META = {
    1: {"tipo": "Video Teórico", "duracion": "2–3 min", "interactividad": "Baja", "emoji": "🎥"},
    2: {"tipo": "Lectura Guiada", "duracion": "4–5 min", "interactividad": "Baja", "emoji": "📖"},
    3: {"tipo": "Mapa Conceptual", "duracion": "1–2 min", "interactividad": "Alta", "emoji": "🗺️"},
    4: {"tipo": "FAQ Interactivo", "duracion": "2–3 min", "interactividad": "Media", "emoji": "❓"},
    5: {"tipo": "Demo Animada", "duracion": "1–2 min", "interactividad": "Alta", "emoji": "✨"},
    6: {"tipo": "Glosario Visual", "duracion": "2–3 min", "interactividad": "Media", "emoji": "📝"},
    7: {"tipo": "Línea de Tiempo", "duracion": "2–3 min", "interactividad": "Media", "emoji": "⏳"},
    8: {"tipo": "Diagrama de Framework", "duracion": "1–2 min", "interactividad": "Alta", "emoji": "🧩"},
    9: {"tipo": "Tabla Comparativa", "duracion": "2–3 min", "interactividad": "Media", "emoji": "📊"},
    10: {"tipo": "Infografía Interactiva", "duracion": "2–3 min", "interactividad": "Alta", "emoji": "🎨"},
}
# fmt: on
CODE_ONLY = {3, 5, 8, 10}


def prompt_codigo(n: int, concept: str, contexto_usuario: str = "", design_system: str | None = None) -> str:
    contexto = format_contexto_usuario(contexto_usuario)
    ds = design_system or DESIGN_SYSTEM
    t = {
        3: f"""[ROL] Desarrollador front-end de mapas conceptuales interactivos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Mapa conceptual HTML5 donde el estudiante explore visualmente subtemas y relaciones de "{concept}".
[TAREA] Grafo SVG con 6-8 nodos clave de "{concept}", conexiones etiquetadas, nodos expandibles al clic con definicion breve, leyenda de colores y boton "Explorar todo". Nodos SVG reales con <text>.
[REQUISITOS] HTML5+JS autocontenido. Minimo 300 lineas de calidad.
{ds}
[SCORM] Al final del <script>: {SCORM_JS}. Llama _scormComplete() al explorar todos los nodos.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.""",
        5: f"""[ROL] Desarrollador front-end de demostraciones animadas educativas.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Demo animada HTML5 que ilustre paso a paso el funcionamiento de "{concept}".
[TAREA] Animacion SVG/canvas con escena inicial, controles play/pause/step, 4-5 pasos progresivos, texto explicativo por paso y boton "Repetir". requestAnimationFrame.
[REQUISITOS] HTML5+JS autocontenido. Minimo 300 lineas de calidad.
{ds}
[SCORM] Al final del <script>: {SCORM_JS}. Llama _scormComplete() tras completar todos los pasos.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.""",
        8: f"""[ROL] Desarrollador front-end de diagramas de framework educativo.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Diagrama HTML5 que muestre la arquitectura o taxonomia de "{concept}" como framework visual.
[TAREA] Diagrama SVG con bloques jerarquicos de "{concept}", flechas de flujo, tooltips al hover, zoom/reset y leyenda. SVG con viewBox + preserveAspectRatio.
[REQUISITOS] HTML5+JS autocontenido. Minimo 300 lineas de calidad.
{ds}
[SCORM] Al final del <script>: {SCORM_JS}. Llama _scormComplete() al explorar todos los tooltips.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.""",
        10: f"""[ROL] Desarrollador front-end de infografias interactivas.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Infografia HTML5 que comunique la esencia y datos clave de "{concept}".
[TAREA] 5-6 secciones reveladas progresivamente con iconos SVG, dato impactante por seccion, barra de progreso y boton "Ver resumen" final. Animaciones de entrada.
[REQUISITOS] HTML5+JS autocontenido. Minimo 300 lineas de calidad.
{ds}
[SCORM] Al final del <script>: {SCORM_JS}. Llama _scormComplete() al llegar a la seccion final.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.""",
    }
    base = t.get(n, "")
    return base + contexto if base else ""


def prompt_texto(n: int, concept: str, contexto_usuario: str = "") -> str:
    contexto = format_contexto_usuario(contexto_usuario)
    t = {
        1: f"""[ROL] Guionista de videos educativos teoricos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Video teorico: guion_visual con 4 marcadores (cada 30 s) usando metaforas cotidianas; narracion_voz <=120 palabras tono divulgativo con pregunta reflexiva; prompt_video en ingles <=100 palabras para generador.
[RESTRICCIONES] Sin formulas ni jerga densa. Metaforas visuales potentes.
[SALIDA] JSON puro con claves "guion_visual","narracion_voz","prompt_video".""",
        2: f"""[ROL] Redactor academico de lecturas guiadas.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Lectura de 250 palabras: introduccion (caso real), desarrollo (3 ideas centrales de "{concept}" con ejemplo cada una), cierre (aplicaciones). 3 preguntas intercaladas con respuesta modelo.
[RESTRICCIONES] Lenguaje accesible sin formulas. Cada idea central <=70 palabras.
[SALIDA] JSON puro con claves "introduccion","secciones" (array de 3 con idea,ejemplo,pregunta,respuesta),"cierre".""",
        4: f"""[ROL] Curador de contenido educativo interactivo.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] FAQ de 6 preguntas genuinas sobre "{concept}". Cada una: pregunta en lenguaje estudiantil, respuesta <=60 palabras con analogia, etiqueta (principiante/intermedio/avanzado), categoria.
[RESTRICCIONES] Preguntas genuinas no retoricas. Respuestas que iluminan sin clase magistral.
[SALIDA] JSON puro con clave "faqs": array de 6 objetos con "pregunta","respuesta","etiqueta","categoria".""",
        6: f"""[ROL] Lexicografo visual de conceptos de ML.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Glosario de 8 terminos de "{concept}". Cada uno: nombre <=20 chars, definicion <=50 palabras, icono_sugerido (emoji+descripcion), ejemplo_concreto <=30 palabras del mundo real.
[RESTRICCIONES] Definiciones autocontenidas. Iconos distintos entre si.
[SALIDA] JSON puro con clave "terminos": array de 8 objetos con "termino","definicion","icono_sugerido","ejemplo_concreto".""",
        7: f"""[ROL] Historiador de la ciencia de datos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Timeline de 5 hitos historicos reales de "{concept}". Cada hito: anio, titulo <=25 chars, descripcion 40 palabras tono cronica, dato_curioso, legado_actual 20 palabras.
[RESTRICCIONES] Hechos verificables, sin mitos. Conexion logica entre hitos.
[SALIDA] JSON puro con clave "hitos": array de 5 objetos con "anio","titulo","descripcion","dato_curioso","legado_actual".""",
        9: f"""[ROL] Analista comparativo de tecnologias de ML.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Tabla comparativa de "{concept}" vs 3 conceptos relacionados. 4 dimensiones relevantes. Por concepto: valores y balance ventaja/desventaja.
[RESTRICCIONES] Comparaciones objetivas y medibles. Sin sesgo. Dimensiones que diferencien.
[SALIDA] JSON puro con claves "dimensiones" (array de 4) y "comparaciones" (array de 3 con concepto,valores,balance).""",
    }
    base = t.get(n, "")
    return base + contexto if base else ""


# fmt: off
def prompt_html(
    n: int, concept: str, data_json: str, contexto_usuario: str = "", design_system: str | None = None
) -> str:
    contexto = format_contexto_usuario(contexto_usuario)
    ds = design_system or DESIGN_SYSTEM
    estilos = {
        1: "storyboard de video: guion visual con bloques temporales, narracion estilizada, prompt video en caja copiable",
        2: "lectura guiada: texto con secciones expandibles, preguntas con toggle de respuesta, disenio articulo academico",
        4: "FAQ interactivo: acordeon con tags de categoria, barra de filtro, contador de preguntas exploradas",
        6: "glosario visual: grid de tarjetas con emoji grande, definicion y ejemplo, filtro por categoria, expandir/colapsar",
        7: "timeline horizontal: 5 nodos conectados, clic expande descripcion, barra de progreso, navegacion prev/next",
        9: "tabla comparativa: columnas responsivas, iconos ventaja/desventaja, tooltips, toggle de dimensiones",
    }
    estilo = estilos.get(n, "pagina educativa interactiva moderna")
    return f"""[ROL] Desarrollador front-end experto en recursos educativos interactivos.
[CURSO] {CURSO_CONTEXTO}
[OBJETIVO] Construir un recurso HTML5 de la fase EXPLAIN sobre "{concept}" que explique con claridad.
[DATOS] Usa exactamente este contenido, sin inventar ni omitir datos:
{data_json}
[FORMATO] {estilo}
[REQUISITOS] HTML5 autocontenido: CSS en <style>, JS en <script>. Minimo 300 lineas de calidad. Navegacion, filtros, feedback y animaciones funcionales. Paleta educativa clara.
{ds}
[SCORM] Al final del <script>: {SCORM_JS}. Llama _scormComplete() al completar la exploracion.
[SALIDA] Solo el documento HTML completo desde <!DOCTYPE html>, sin markdown.""" + contexto
# fmt: on
