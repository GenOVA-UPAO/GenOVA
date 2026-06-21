"""Prompts for the 10 EXPLORE-phase resources (5E methodology).

Each prompt fixes the resource FORMAT but adapts its content, datasets and
mechanics to whatever Machine Learning concept is passed in `concept`.
"""

from llm.utils.utils import CURSO_CONTEXTO, DESIGN_SYSTEM, SCORM_JS, format_contexto_usuario

RECURSOS_META = {
    1: {
        "tipo": "Simulador Virtual Lab",
        "duracion": "3–4 min",
        "interactividad": "Alta",
        "emoji": "🧪",
    },
    2: {"tipo": "Agente Socrático", "duracion": "5–6 min", "interactividad": "Alta", "emoji": "🤔"},
    3: {
        "tipo": "Juego Drag & Drop",
        "duracion": "2–3 min",
        "interactividad": "Media",
        "emoji": "🎮",
    },
    4: {
        "tipo": "Video con Pausa Activa",
        "duracion": "2–3 min",
        "interactividad": "Media",
        "emoji": "🎬",
    },
    5: {
        "tipo": "Lectura Interactiva",
        "duracion": "3–4 min",
        "interactividad": "Media",
        "emoji": "📖",
    },
    6: {
        "tipo": "Simulador de Slider",
        "duracion": "4–5 min",
        "interactividad": "Alta",
        "emoji": "🎛️",
    },
    7: {
        "tipo": "Experimento Guiado",
        "duracion": "5–6 min",
        "interactividad": "Media",
        "emoji": "🔬",
    },
    8: {"tipo": "Juego de Roles", "duracion": "4–5 min", "interactividad": "Media", "emoji": "🎭"},
    9: {"tipo": "Mapa Mental", "duracion": "5–6 min", "interactividad": "Alta", "emoji": "🗺️"},
    10: {
        "tipo": "Lab de Hipótesis",
        "duracion": "5–7 min",
        "interactividad": "Alta",
        "emoji": "💡",
    },
}

CODE_ONLY = {1, 6, 10}


def prompt_codigo(
    n: int, concept: str, contexto_usuario: str = "", design_system: str | None = None,
    config: dict | None = None,
) -> str:
    contexto = format_contexto_usuario(contexto_usuario)
    ds = design_system or DESIGN_SYSTEM
    t = {
        1: f"""[ROL] Desarrollador front-end de laboratorios virtuales interactivos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Un laboratorio virtual HTML5 donde el estudiante EXPLORA "{concept}" manipulando sus elementos y observando los resultados.
[TAREA] Diseña la simulación más representativa de cómo funciona "{concept}": elige datos de ejemplo, controles y visualización (SVG o canvas) apropiados al tema. Debe permitir: (1) manipular entradas o parámetros, (2) ejecutar o iterar el proceso central de "{concept}", (3) ver el resultado actualizarse, (4) un botón que explica qué está ocurriendo.
[REQUISITOS] HTML5+JS autocontenido. Mínimo 320 líneas de calidad. Datos de ejemplo hardcodeados como arrays JS.
{ds}
[SCORM] Al final del <script>: {SCORM_JS}. Llama _scormComplete() tras varias iteraciones o al pulsar el botón explicativo.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.""",
        6: f"""[ROL] Desarrollador front-end de simuladores paramétricos educativos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Un simulador HTML5 centrado en UN parámetro clave de "{concept}" para que el estudiante descubra su efecto.
[TAREA] Identifica el parámetro o variable más ilustrativo de "{concept}" y construye: (1) un slider o control para ese parámetro con un rango sensato, (2) un gráfico SVG que se actualiza en tiempo real (<100 ms), (3) zonas o estados coloreados que indican el comportamiento (p. ej. correcto / límite / incorrecto), (4) un campo para la hipótesis del estudiante, (5) un botón "Revelar zona óptima".
[REQUISITOS] HTML5+JS autocontenido. Mínimo 320 líneas de calidad.
{ds}
[SCORM] Al final del <script>: {SCORM_JS}. Llama _scormComplete() al revelar.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.""",
        10: f"""[ROL] Desarrollador front-end de laboratorios de experimentación.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Un laboratorio HTML5 donde el estudiante formula una hipótesis sobre "{concept}", experimenta y la contrasta.
[TAREA] Construye: (1) una visualización de datos relevante a "{concept}" (scatter, curva u otra; datos hardcodeados como array JS), (2) controles para probar configuraciones, (3) métricas o indicadores visibles que cambian con cada prueba, (4) un campo de hipótesis, (5) un botón "Revelar" que muestra la configuración óptima y nombra el concepto técnico correcto.
[REQUISITOS] HTML5+JS autocontenido. Mínimo 320 líneas de calidad.
{ds}
[SCORM] Al final del <script>: {SCORM_JS}. Llama _scormComplete() al revelar.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.""",
    }
    base = t.get(n, "")
    return base + contexto if base else ""


def prompt_texto(n: int, concept: str, contexto_usuario: str = "", config: dict | None = None) -> str:
    contexto = format_contexto_usuario(contexto_usuario)
    cfg = config or {}
    t = {
        2: f"""[ROL] Agente pedagógico socrático "DataGuide" — guías, nunca revelas la respuesta.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Sesión socrática de {cfg.get('num_turns', 6)} turnos que lleva al estudiante a descubrir la idea central de "{concept}". Cada turno: dato_mostrado (un ejemplo, dato o situación concreta y relevante a "{concept}"), pregunta (≤28 palabras, abierta, guía al descubrimiento), respuesta_correcta (seguimiento si acierta), respuesta_incorrecta (pista adicional sin revelar).
[RESTRICCIONES] Nunca digas "la respuesta es". Tono de mentor curioso. Dificultad creciente entre turnos.
[SALIDA] JSON puro con clave "turnos": array de {cfg.get('num_turns', 6)} objetos con "turno","dato_mostrado","pregunta","respuesta_correcta","respuesta_incorrecta".""",
        3: f"""[ROL] Diseñador de minijuegos de clasificación para ciencia de datos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Juego drag & drop de {cfg.get('num_rounds', 6)} rondas donde el estudiante clasifica items en 2 categorías propias de "{concept}" (elige las dos categorías más ilustrativas del tema). Define category_a y category_b. Cada ronda: item, contexto (1 línea), respuesta ("A" o "B"), feedback_correcto (≤16 palabras), feedback_incorrecto (≤16 palabras). Incluye al menos un caso ambiguo.
[RESTRICCIONES] Sin repetir items. Dificultad creciente (de obvio a ambiguo).
[SALIDA] JSON puro con claves "category_a","category_b" y "rondas": array de {cfg.get('num_rounds', 6)} objetos con "ronda","item","contexto","respuesta","feedback_correcto","feedback_incorrecto".""",
        4: f"""[ROL] Guionista pedagógico de visualización de ML.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Guion de video de 120 s sobre "{concept}" con marcadores de tiempo cada 30 s y metáforas cotidianas, más {cfg.get('num_pauses', 3)} preguntas de pausa activa distribuidas a lo largo del video que provoquen una predicción sin revelar la teoría.
[RESTRICCIONES] Sin fórmulas. Preguntas abiertas, no de opción múltiple.
[SALIDA] JSON puro con claves "guion" (texto con marcadores de tiempo) y "pausas": array de {cfg.get('num_pauses', 3)} objetos con "segundo","pregunta".""",
        5: f"""[ROL] Redactor de materiales de análisis exploratorio.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] lectura de 220 palabras (tono periodístico intrigante) que lleva al estudiante a observar un patrón relacionado con "{concept}"; un conjunto_datos ficticio pero plausible y relevante a "{concept}" (8-10 registros); pregunta de exploración; revelacion de 50 palabras que conecta el patrón con "{concept}".
[RESTRICCIONES] Sin la terminología técnica de "{concept}" en la lectura inicial. El patrón debe ser identificable a simple vista.
[SALIDA] JSON puro con claves "lectura","conjunto_datos" (array de objetos),"pregunta","revelacion".""",
        7: f"""[ROL] Instructor de análisis exploratorio de datos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Experimento guiado de {cfg.get('num_steps', 4)} pasos para explorar "{concept}": descripcion_dataset (un conjunto de datos plausible y relevante al tema, descrito en texto), puntos para un gráfico (20-25 puntos con coordenadas x/y/grupo que formen una estructura visible coherente con "{concept}"), 3 preguntas de exploración progresivas, revelacion de 60 palabras que conecta lo observado con "{concept}".
[RESTRICCIONES] Sin código visible. Las preguntas guían, no evalúan.
[SALIDA] JSON puro con claves "descripcion_dataset","puntos" (array de objetos con x,y,grupo),"preguntas" (array de 3),"revelacion".""",
        8: f"""[ROL] Diseñador de aprendizaje basado en roles para científicos de datos junior.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] 4 escenarios de negocio de sectores distintos donde aplicar "{concept}". Cada escenario: problema ≤45 palabras en lenguaje cotidiano, opcion_A, opcion_B, respuesta_correcta, feedback_A y feedback_B (≤25 palabras). Mensajes finales según el puntaje, con claves "0","1-2","3-4".
[RESTRICCIONES] Sin jerga técnica en los enunciados. Respuesta objetivamente correcta y justificable.
[SALIDA] JSON puro con claves "escenarios" (array de 4 objetos con id,problema,opcion_A,opcion_B,respuesta_correcta,feedback_A,feedback_B) y "mensajes_finales" (objeto).""",
        9: f"""[ROL] Facilitador de mapas mentales para el aprendizaje de ML.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] 6 tarjetas que emparejan una pista_cotidiana con su nodo_tecnico real de "{concept}" (relación 1:1). Cada tarjeta: feedback_correcto (✓ y 1 línea de contexto), feedback_incorrecto (✗ y pista sin revelar). Una revelacion final de 90 palabras que integra los 6 nodos en el marco conceptual de "{concept}".
[RESTRICCIONES] Las pistas se entienden sin conocimiento previo. Tono celebratorio en la revelación.
[SALIDA] JSON puro con claves "tarjetas" (array de 6 objetos con id,pista_cotidiana,nodo_tecnico,feedback_correcto,feedback_incorrecto) y "revelacion".""",
    }
    base = t.get(n, "")
    return base + contexto if base else ""


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
        2: "chat educativo: burbujas de DataGuide, campo de texto del estudiante, feedback revelado por turno, barra de progreso",
        3: "juego drag & drop: items arrastrables, 2 zonas destino etiquetadas, animación de arrastre, feedback inmediato, puntuación",
        4: "storyboard interactivo: guion por secciones, reproductor simulado con barra de progreso, overlay de pregunta de pausa",
        5: "lectura interactiva: texto periodístico y tabla del conjunto de datos, pregunta destacada, botón 'Revelar patrón' animado",
        7: "laboratorio EDA: tabla del dataset, gráfico scatter SVG, 3 preguntas secuenciales, botón 'Revelar' que colorea los grupos",
        8: "escenarios ejecutivos secuenciales: 2 botones de decisión, feedback animado, pantalla final con puntaje y mensaje",
        9: "mapa mental drag & drop: 6 pistas y 6 nodos técnicos, conexión por arrastre, feedback por par, revelación al completar",
    }
    estilo = estilos.get(n, "página educativa interactiva moderna")
    return (
        f"""[ROL] Desarrollador front-end experto en recursos educativos interactivos.
[CURSO] {CURSO_CONTEXTO}
[OBJETIVO] Construir un recurso HTML5 interactivo de la fase EXPLORE sobre "{concept}" para que el estudiante explore y descubra.
[DATOS] Usa exactamente este contenido, sin inventar ni omitir datos:
{data_json}
[FORMATO] {estilo}
[REQUISITOS]
- HTML5 autocontenido: todo el CSS en <style>, todo el JS en <script>.
- Mínimo 320 líneas de calidad. Toda actividad debe ser funcional REAL (arrastre, navegación, feedback, puntuación, revelaciones).
- Paleta según el tipo: lectura (clara periodística), chat socrático (clara académica), drag&drop (clara lúdica),
  experimento (clara clínica), mapa mental (clara con acentos).
{ds}
[SCORM] Al final del <script>: {SCORM_JS}. Llama _scormComplete() al completar la actividad principal.
[SALIDA] Solo el documento HTML completo desde <!DOCTYPE html>, sin markdown."""
        + contexto
    )
