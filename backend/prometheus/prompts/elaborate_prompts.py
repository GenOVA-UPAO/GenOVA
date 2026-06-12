"""Prompts for the 10 ELABORATE-phase resources (5E methodology).

Each prompt fixes the resource FORMAT but adapts all scenarios, exercises and
projects to whatever Machine Learning concept is passed in `concept`.
"""

from llm.utils import CURSO_CONTEXTO, DESIGN_SYSTEM, SCORM_JS, format_contexto_usuario

# fmt: off
RECURSOS_META = {
    1: {"tipo": "Estudio de Caso", "duracion": "4–5 min", "interactividad": "Media", "emoji": "📋"},
    2: {"tipo": "Ejercicio Guiado", "duracion": "5–6 min", "interactividad": "Media", "emoji": "✏️"},
    3: {"tipo": "Mini-Proyecto", "duracion": "8–10 min", "interactividad": "Alta", "emoji": "🛠️"},
    4: {"tipo": "Simulación Aplicada", "duracion": "3–4 min", "interactividad": "Alta", "emoji": "🔬"},
    5: {"tipo": "Análisis de Datos", "duracion": "4–5 min", "interactividad": "Alta", "emoji": "📈"},
    6: {"tipo": "Escenario Ramificado", "duracion": "3–4 min", "interactividad": "Media", "emoji": "🌳"},
    7: {"tipo": "Lab de Código", "duracion": "5–7 min", "interactividad": "Alta", "emoji": "💻"},
    8: {"tipo": "Mapa de Problemas", "duracion": "3–4 min", "interactividad": "Media", "emoji": "🧭"},
    9: {"tipo": "Juego de Estrategia", "duracion": "4–5 min", "interactividad": "Alta", "emoji": "♟️"},
    10: {"tipo": "Reto de Diseño", "duracion": "6–8 min", "interactividad": "Media", "emoji": "🏗️"},
}
# fmt: on
CODE_ONLY = {4, 5, 7, 9}


def prompt_codigo(n: int, concept: str, contexto_usuario: str = "", design_system: str | None = None) -> str:
    contexto = format_contexto_usuario(contexto_usuario)
    ds = design_system or DESIGN_SYSTEM
    t = {
        4: f"""[ROL] Desarrollador front-end de simulaciones aplicadas interactivas.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Simulacion HTML5 donde el estudiante aplique "{concept}" en un escenario realista.
[TAREA] Entorno simulado con escenario empresarial concreto, 3-4 parametros ajustables, visualizacion SVG/canvas reactiva, metricas visibles y boton "Aplicar" que ejecuta "{concept}". Iterar al menos 3 veces para descubrir patrones.
[REQUISITOS] HTML5+JS autocontenido. Minimo 300 lineas. Visualizacion <100 ms.
{ds}
[SCORM] Al final del <script>: {SCORM_JS}. Llama _scormComplete() tras 3 iteraciones.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.""",
        5: f"""[ROL] Desarrollador front-end de dashboards de analisis de datos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Dashboard HTML5 donde el estudiante analice datos de "{concept}" y extraiga conclusiones.
[TAREA] Dataset hardcodeado de 15-20 registros, tabla filtrable/ordenable, 2 graficos SVG (scatter/bar/line) que reaccionan a filtros, 3 preguntas con selector, boton "Revelar insight". Graficos SVG reales.
[REQUISITOS] HTML5+JS autocontenido. Minimo 300 lineas.
{ds}
[SCORM] Al final del <script>: {SCORM_JS}. Llama _scormComplete() al responder las 3 preguntas.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.""",
        7: f"""[ROL] Desarrollador front-end de laboratorios de codigo interactivo.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Lab de codigo HTML5 donde el estudiante experimente con "{concept}" escribiendo pseudocodigo.
[TAREA] Editor simplificado (textarea), 3 ejercicios crecientes sobre "{concept}" con codigo inicial incompleto, boton "Ejecutar" que valida contra solucion esperada, feedback visual, "Ver solucion" tras 2 intentos. Validacion JS real.
[REQUISITOS] HTML5+JS autocontenido. Minimo 320 lineas.
{ds}
[SCORM] Al final del <script>: {SCORM_JS}. Llama _scormComplete() al completar los 3 ejercicios.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.""",
        9: f"""[ROL] Desarrollador front-end de juegos de estrategia educativos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Juego de estrategia HTML5 por turnos que modele la logica de "{concept}" como mecanica.
[TAREA] Tablero/escenario con 5-7 turnos de decision, oponente automatico basado en "{concept}", puntuacion que refleje calidad de decisiones, pantalla final con analisis y consejos. IA oponente funcional.
[REQUISITOS] HTML5+JS autocontenido. Minimo 320 lineas.
{ds}
[SCORM] Al final del <script>: {SCORM_JS}. Llama _scormComplete() al terminar la partida.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.""",
    }
    base = t.get(n, "")
    return base + contexto if base else ""


def prompt_texto(n: int, concept: str, contexto_usuario: str = "") -> str:
    contexto = format_contexto_usuario(contexto_usuario)
    t = {
        1: f"""[ROL] Redactor de casos de estudio para ciencias de datos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Caso de estudio: narrativa 180 palabras (empresa ficticia, problema concreto, datos), 4 preguntas progresivas (observar->diagnosticar->proponer->evaluar), respuesta_modelo <=50 palabras cada una con razonamiento.
[RESTRICCIONES] Sector reconocible. Datos plausibles. Preguntas que guien razonamiento.
[SALIDA] JSON puro con claves "narrativa","preguntas" (array de 4 con pregunta,respuesta_modelo).""",
        2: f"""[ROL] Instructor de ejercicios practicos de ML.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Ejercicio guiado de 5 pasos para aplicar "{concept}". Cada paso: instruccion <=35 palabras, pista opcional, resultado_esperado, validacion de logro.
[RESTRICCIONES] Pasos incrementales, sin saltos logicos. Completables sin frustracion.
[SALIDA] JSON puro con clave "pasos": array de 5 objetos con "numero","instruccion","pista","resultado_esperado","validacion".""",
        3: f"""[ROL] Diseniador de mini-proyectos de ML aplicado.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Mini-proyecto: objetivo 50 palabras, 3 entregables evaluables, dataset_sugerido 80 palabras (al menos 8 variables, 50 registros), rubrica con 4 criterios y 3 niveles cada uno (basico/competente/avanzado).
[RESTRICCIONES] Entregables en 8-10 min. Dataset realista y descriptivo.
[SALIDA] JSON puro con claves "objetivo","entregables" (array de 3),"dataset_sugerido","rubrica".""",
        6: f"""[ROL] Diseniador de escenarios de decision ramificados.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Escenario ramificado de 3 niveles aplicando "{concept}". Nivel 1: situacion 60 palabras + 2 opciones -> cada una lleva a nivel 2 con nueva situacion + 2 opciones mas. Cada rama final: desenlace 40 palabras + leccion_aprendida conectada con "{concept}".
[RESTRICCIONES] Decisiones no triviales. Todas las ramas pedagogicamente valiosas.
[SALIDA] JSON puro con estructura de arbol: "nodo_raiz" con situacion,opciones (array de 2 con siguiente_nodo,desenlace,leccion_aprendida).""",
        8: f"""[ROL] Facilitador de resolucion de problemas de ML.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Mapa de 4 problemas donde "{concept}" es la solucion. Cada uno: contexto 40 palabras (sector+situacion), 3 sintomas observables, diagnostico (por que "{concept}"), solucion_recomendada 50 palabras.
[RESTRICCIONES] Sectores diversos (salud, finanzas, retail, industria). Sintomas sin jerga experta.
[SALIDA] JSON puro con clave "problemas": array de 4 con "contexto","sintomas" (array de 3),"diagnostico","solucion_recomendada".""",
        10: f"""[ROL] Diseniador de retos de arquitectura de soluciones ML.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Reto de disenio: enunciado 80 palabras (cliente realista, problema, restricciones), 4 criterios de disenio, guia_evaluacion con 3 niveles, solucion_referencia 100 palabras.
[RESTRICCIONES] Fuerza trade-offs reales de "{concept}". Sin respuesta unica obvia.
[SALIDA] JSON puro con claves "enunciado","criterios" (array de 4),"guia_evaluacion","solucion_referencia".""",
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
        1: "estudio de caso: narrativa destacada, preguntas secuenciales con campo de respuesta y toggle de modelo, barra de progreso, disenio periodistico",
        2: "ejercicio guiado: pasos numerados, cada uno expandible con pista y validacion, indicador de paso actual, boton siguiente",
        3: "mini-proyecto: panel de objetivo, tarjetas de entregables con checklist, dataset colapsable, rubrica interactiva con niveles desplegables",
        6: "escenario ramificado: tarjeta de situacion con 2 botones, transicion animada entre niveles, desenlace con leccion destacada",
        8: "mapa de problemas: grid de 4 tarjetas por sector, expandibles con sintomas+diagnostico+solucion, iconos coloreados",
        10: "reto de disenio: enunciado en panel, criterios en checklist, rubrica en acordeon, solucion oculta tras boton con delay",
    }
    estilo = estilos.get(n, "pagina educativa interactiva moderna")
    return f"""[ROL] Desarrollador front-end experto en recursos educativos interactivos.
[CURSO] {CURSO_CONTEXTO}
[OBJETIVO] Construir un recurso HTML5 de la fase ELABORATE sobre "{concept}" para aplicar y practicar.
[DATOS] Usa exactamente este contenido, sin inventar ni omitir datos:
{data_json}
[FORMATO] {estilo}
[REQUISITOS] HTML5 autocontenido: CSS en <style>, JS en <script>. Minimo 300 lineas de calidad. Checklists, revelaciones, navegacion y feedback funcionales. Paleta con acentos de accion.
{ds}
[SCORM] Al final del <script>: {SCORM_JS}. Llama _scormComplete() al completar la actividad principal.
[SALIDA] Solo el documento HTML completo desde <!DOCTYPE html>, sin markdown.""" + contexto
# fmt: on
