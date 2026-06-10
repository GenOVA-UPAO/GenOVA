"""Prompts for the 10 EVALUATE-phase resources (5E methodology).

Each prompt fixes the resource FORMAT but adapts all assessments, quizzes and
rubrics to whatever Machine Learning concept is passed in `concept`.
"""

from llm.utils import CURSO_CONTEXTO, DESIGN_SYSTEM, SCORM_JS, format_contexto_usuario

# fmt: off
RECURSOS_META = {
    1: {"tipo": "Quiz Interactivo", "duracion": "2–3 min", "interactividad": "Media", "emoji": "❓"},
    2: {"tipo": "Rúbrica de Autoevaluación", "duracion": "2–3 min", "interactividad": "Media", "emoji": "📋"},
    3: {"tipo": "Desafío Contrarreloj", "duracion": "2–3 min", "interactividad": "Alta", "emoji": "⏱️"},
    4: {"tipo": "Examen Opción Múltiple", "duracion": "3–4 min", "interactividad": "Media", "emoji": "📝"},
    5: {"tipo": "Completar Espacios", "duracion": "2–3 min", "interactividad": "Alta", "emoji": "✍️"},
    6: {"tipo": "Relacionar Conceptos", "duracion": "2–3 min", "interactividad": "Media", "emoji": "🔗"},
    7: {"tipo": "Crucigrama Conceptual", "duracion": "3–4 min", "interactividad": "Media", "emoji": "🧩"},
    8: {"tipo": "Preguntas de Desarrollo", "duracion": "4–5 min", "interactividad": "Baja", "emoji": "💬"},
    9: {"tipo": "Simulación Evaluativa", "duracion": "3–4 min", "interactividad": "Alta", "emoji": "🎯"},
    10: {"tipo": "Diploma de Logro", "duracion": "1–2 min", "interactividad": "Baja", "emoji": "🏆"},
}
# fmt: on
CODE_ONLY = {3, 5, 9}


def prompt_codigo(n: int, concept: str, contexto_usuario: str = "") -> str:
    contexto = format_contexto_usuario(contexto_usuario)
    t = {
        3: f"""[ROL] Desarrollador front-end de desafios cronometrados educativos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Desafio contrarreloj HTML5 que evalue dominio de "{concept}" bajo presion de tiempo.
[TAREA] Cronometro regresivo 90 s visible, 8 preguntas secuenciales de opcion multiple sobre "{concept}", puntuacion con bonus por velocidad, barra de progreso, pantalla final con puntaje y feedback por pregunta. Cronometro real setInterval.
[REQUISITOS] HTML5+JS autocontenido. Minimo 300 lineas.
{DESIGN_SYSTEM}
[SCORM] Al final del <script>: {SCORM_JS}. Llama _scormComplete(puntaje_final) al terminar.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.""",
        5: f"""[ROL] Desarrollador front-end de ejercicios de completar espacios.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Ejercicio HTML5 de completar espacios que evalue vocabulario de "{concept}".
[TAREA] 8 oraciones sobre "{concept}" con espacio en blanco, validacion flexible (ignora mayusculas/acentos), feedback inmediato con correccion, barra de progreso, puntaje y boton "Reintentar". Validacion JS real.
[REQUISITOS] HTML5+JS autocontenido. Minimo 280 lineas.
{DESIGN_SYSTEM}
[SCORM] Al final del <script>: {SCORM_JS}. Llama _scormComplete(puntaje_final) al completar.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.""",
        9: f"""[ROL] Desarrollador front-end de simulaciones evaluativas.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Simulacion evaluativa HTML5 donde el estudiante demuestre dominio practico de "{concept}".
[TAREA] Escenario profesional concreto, 3-4 decisiones evaluables mediante controles interactivos, evaluacion contra criterios objetivos de "{concept}", puntuacion con pesos, reporte final con fortalezas y areas de mejora.
[REQUISITOS] HTML5+JS autocontenido. Minimo 320 lineas. Evaluacion real basada en criterios.
{DESIGN_SYSTEM}
[SCORM] Al final del <script>: {SCORM_JS}. Llama _scormComplete(puntaje_final) al finalizar.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.""",
    }
    base = t.get(n, "")
    return base + contexto if base else ""


def prompt_texto(n: int, concept: str, contexto_usuario: str = "") -> str:
    contexto = format_contexto_usuario(contexto_usuario)
    t = {
        1: f"""[ROL] Diseniador de quizzes educativos de ML.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Quiz de 6 preguntas sobre "{concept}": enunciado <=40 palabras, 4 opciones (A/B/C/D), respuesta_correcta, feedback_correcto e incorrecto <=20 palabras. Dificultad: 2 faciles, 2 medias, 2 dificiles.
[RESTRICCIONES] Opciones plausibles. Feedback que ensenie, no solo indique error.
[SALIDA] JSON puro con clave "preguntas": array de 6 con "enunciado","opciones","correcta","feedback_correcto","feedback_incorrecto".""",
        2: f"""[ROL] Diseniador de rubricas de autoevaluacion para ML.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Rubrica con 5 criterios sobre "{concept}". Cada uno: descripcion <=25 palabras, 3 niveles (inicial/en desarrollo/logrado) con descriptor <=30 palabras. Puntuacion 1-3. Reflexion final segun rango de puntaje.
[RESTRICCIONES] Criterios auto-evaluables. Descriptores en primera persona ("Puedo...").
[SALIDA] JSON puro con claves "criterios" (array de 5) y "reflexiones" (objeto con rangos).""",
        4: f"""[ROL] Examinador de conceptos de Machine Learning.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Examen de 8 preguntas opcion multiple sobre "{concept}": enunciado <=40 palabras, 4 opciones, justificacion <=30 palabras. 2 conceptuales, 2 aplicacion, 2 analisis, 2 relacion. Total 8 puntos.
[RESTRICCIONES] Sin ambiguedades. Distractores verosimiles. Una sola correcta.
[SALIDA] JSON puro con clave "examen": array de 8 con "numero","enunciado","opciones","correcta","justificacion","tipo".""",
        6: f"""[ROL] Diseniador de ejercicios de asociacion conceptual.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] 6 parejas: columna A (definiciones), columna B (terminos de "{concept}"). Relacion 1:1. Cada pareja: feedback_acierto <=20 palabras, feedback_error <=20 palabras (pista sin revelar).
[RESTRICCIONES] Sin ambiguedad. Terminos y definiciones precisos. Sin pistas en la redaccion.
[SALIDA] JSON puro con claves "columna_a" (array de 6) y "parejas" (array de 6 con a_index,b_termino,feedback_acierto,feedback_error).""",
        7: f"""[ROL] Creador de crucigramas educativos de ML.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Crucigrama de 8 terminos de "{concept}": numero, orientacion, longitud, pista <=25 palabras, respuesta. Cuadricula interconectada (>=4 cruces). Pistas ingeniosas pero justas.
[RESTRICCIONES] Terminos reales. Sin abreviaturas.
[SALIDA] JSON puro con clave "entradas": array de 8 con "numero","orientacion","longitud","pista","respuesta".""",
        8: f"""[ROL] Evaluador de comprension profunda de ML.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] 3 preguntas de desarrollo sobre "{concept}": enunciado <=50 palabras (abierto), 3-4 criterios de evaluacion observables, respuesta_modelo <=80 palabras.
[RESTRICCIONES] No respondibles con si/no. Criterios evaluables objetivamente.
[SALIDA] JSON puro con clave "preguntas": array de 3 con "enunciado","criterios","respuesta_modelo".""",
        10: f"""[ROL] Diseniador de diplomas y certificados educativos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Diploma de logro por "{concept}": titulo <=20 palabras, descripcion_logro <=50 palabras, 3 competencias_adquiridas, firma_simulada, diseno_sugerido (paleta, iconos, tipografia).
[RESTRICCIONES] Tono celebratorio profesional. Competencias medibles y reales.
[SALIDA] JSON puro con claves "titulo","descripcion_logro","competencias","firma","diseno_sugerido".""",
    }
    base = t.get(n, "")
    return base + contexto if base else ""


# fmt: off
def prompt_html(n: int, concept: str, data_json: str, contexto_usuario: str = "") -> str:
    contexto = format_contexto_usuario(contexto_usuario)
    estilos = {
        1: "quiz interactivo: preguntas secuenciales con botones de opcion, feedback animado, barra de progreso, pantalla de resultados con repaso",
        2: "rubrica interactiva: tabla de criterios con niveles seleccionables, puntuacion automatica, reflexion segun rango, disenio formulario",
        4: "examen formal: preguntas numeradas radiales, navegacion entre preguntas, pantalla de entrega con puntaje y revision",
        6: "relacionar conceptos: 2 columnas (definiciones + terminos arrastrables), conexiones visuales, contador de aciertos, feedback por pareja",
        7: "crucigrama interactivo: cuadricula SVG, teclado en pantalla, pistas laterales que se iluminan al completar, animacion de completado",
        8: "preguntas de desarrollo: enunciados con campo expandible, criterios como checklist, respuesta modelo oculta tras boton 'Comparar'",
        10: "diploma de logro: certificado estilizado con borde SVG, concepto destacado, competencias en lista, paleta dorada/azul, boton descargar",
    }
    estilo = estilos.get(n, "pagina educativa interactiva moderna")
    return f"""[ROL] Desarrollador front-end experto en recursos educativos interactivos.
[CURSO] {CURSO_CONTEXTO}
[OBJETIVO] Construir un recurso HTML5 de la fase EVALUATE sobre "{concept}" que evalue el aprendizaje.
[DATOS] Usa exactamente este contenido, sin inventar ni omitir datos:
{data_json}
[FORMATO] {estilo}
[REQUISITOS] HTML5 autocontenido: CSS en <style>, JS en <script>. Minimo 300 lineas de calidad. Evaluacion con puntuacion, feedback, navegacion y resultados funcionales. Paleta evaluativa clara.
{DESIGN_SYSTEM}
[SCORM] Al final del <script>: {SCORM_JS}. Llama _scormComplete(puntaje) al finalizar.
[SALIDA] Solo el documento HTML completo desde <!DOCTYPE html>, sin markdown.""" + contexto
# fmt: on
