"""Structured prompts for all 10 EXPLORE phase resources (5E methodology)."""
from agents.utils import SCORM_JS

RECURSOS_META = {
    1: {"tipo": "Simulador Virtual Lab", "duracion": "3–4 min", "interactividad": "Alta", "emoji": "🧪"},
    2: {"tipo": "Agente Socrático", "duracion": "5–6 min", "interactividad": "Alta", "emoji": "🤔"},
    3: {"tipo": "Juego Drag & Drop", "duracion": "2–3 min", "interactividad": "Media", "emoji": "🎮"},
    4: {"tipo": "Video con Pausa Activa", "duracion": "2–3 min", "interactividad": "Media", "emoji": "🎬"},
    5: {"tipo": "Lectura Interactiva", "duracion": "3–4 min", "interactividad": "Media", "emoji": "📖"},
    6: {"tipo": "Simulador de Slider", "duracion": "4–5 min", "interactividad": "Alta", "emoji": "🎛️"},
    7: {"tipo": "Experimento Guiado", "duracion": "5–6 min", "interactividad": "Media", "emoji": "🔬"},
    8: {"tipo": "Juego de Roles", "duracion": "4–5 min", "interactividad": "Media", "emoji": "🎭"},
    9: {"tipo": "Mapa Mental", "duracion": "5–6 min", "interactividad": "Alta", "emoji": "🗺️"},
    10: {"tipo": "Lab de Hipótesis", "duracion": "5–7 min", "interactividad": "Alta", "emoji": "💡"},
}

CODE_ONLY = {1, 6, 10}


def prompt_codigo(n: int, concept: str) -> str:
    t = {
        1: f"""Genera HTML5+JS autocontenido: plano cartesiano 600x400px para explorar "{concept}".
Funcionalidades: (1) clic para colocar ≤20 puntos de datos, (2) arrastrar 3 centroides de colores distintos, (3) botón "Iterar" ejecuta 1 paso K-Means: asigna cada punto al centroide más cercano y recalcula centroides con distancia euclidiana.
Sin librerías externas. ≤120 líneas. SCORM al final del script: {SCORM_JS}. Llama _scormComplete() en la 5ta iteración.
SALIDA: Solo HTML completo desde <!DOCTYPE html>, sin markdown.""",

        6: f"""Genera HTML5+JS autocontenido: simulador Learning Rate para explorar "{concept}".
Funcionalidades: (1) slider LR 0.001–2.0, (2) gráfico SVG 500x300 de curva de pérdida que se actualiza en tiempo real (<100ms), (3) zonas coloreadas: rojo LR<0.01 (lento), verde 0.01-0.1 (óptimo), naranja LR>0.5 (divergente), (4) campo hipótesis del alumno, (5) botón "Revelar zona óptima".
Sin librerías. Un solo HTML. SCORM al final del script: {SCORM_JS}. Llama _scormComplete() al revelar.
SALIDA: Solo HTML completo desde <!DOCTYPE html>, sin markdown.""",

        10: f"""Genera HTML5+JS autocontenido: laboratorio regresión polinomial para explorar "{concept}".
Funcionalidades: (1) scatter SVG con 25 puntos (función cuadrática + ruido), datos hardcodeados como array JS, (2) selector grado polinomial 1-10, (3) curva de regresión en tiempo real (aproximación visual aceptable), (4) métricas visibles: Error Entrenamiento y Error Test estimado, (5) campo hipótesis + botón "Revelar" que muestra zona óptima (grado 3-4) y menciona Underfitting/Overfitting.
Sin librerías. Un solo HTML. SCORM al final del script: {SCORM_JS}. Llama _scormComplete() al revelar.
SALIDA: Solo HTML completo desde <!DOCTYPE html>, sin markdown.""",
    }
    return t.get(n, "")


def prompt_texto(n: int, concept: str) -> str:
    t = {
        2: f"""[ROL] Agente Pedagógico Socrático "DataGuide". Guías, nunca revelas respuestas.
[CONTEXTO] Estudiante explora dataset de ventas con errores (nulos, outlier, duplicado) relacionado con "{concept}".
[TAREA] Sesión socrática de 5 turnos. Cada turno: dato_mostrado (fila del dataset con el error), pregunta (≤25 palabras, abierta, guía al descubrimiento), respuesta_correcta (seguimiento si acertó), respuesta_incorrecta (pista adicional sin revelar).
[RESTRICCIONES] Sin "la respuesta es". Tono de mentor curioso, no evaluador. Sin código ni pandas.
[SALIDA] JSON puro: {{"turnos":[{{"turno":1,"dato_mostrado":"...","pregunta":"...","respuesta_correcta":"...","respuesta_incorrecta":"..."}}]}}""",

        3: f"""[ROL] Diseñador de minijuegos educativos para ciencia de datos.
[CONTEXTO] Estudiante explora Feature Engineering clasificando variables de "{concept}".
[TAREA] 5 rondas progresivas (obvia→ambigua). Cada ronda: variable, contexto (1 línea), respuesta ("Numérica" o "Categórica"), feedback_correcto (≤15 palabras motivador), feedback_incorrecto (≤15 palabras). Incluye ≥1 caso ambiguo (ej. "Código Postal").
[RESTRICCIONES] Sin repetir variables. Sin jerga técnica.
[SALIDA] JSON puro: array 5 objetos con "ronda","variable","contexto","respuesta","feedback_correcto","feedback_incorrecto".""",

        4: f"""[ROL] Guionista pedagógico de visualización de ML.
[CONTEXTO] Estudiante explora "{concept}" por primera vez sin teoría previa.
[TAREA] guion de 90s con marcadores de tiempo cada 30s usando metáforas cotidianas (puntos, plano, caja), y 3 preguntas de pausa activa en segundos 30, 60 y 85 que provoquen predicción sin revelar la teoría.
[RESTRICCIONES] Sin fórmulas. Máximo 3 cortes de escena por 30s. Preguntas abiertas (no opción múltiple).
[SALIDA] JSON puro: {{"guion":"...[0:00]...[0:30]...","pausas":[{{"segundo":30,"pregunta":"..."}}]}}""",

        5: f"""[ROL] Redactor de materiales de análisis exploratorio para universitarios.
[CONTEXTO] Estudiante explora patrones en datos de compras relacionados con "{concept}" sin conocer algoritmos.
[TAREA] lectura 180 palabras (tono periodístico intrigante) + dataset ficticio de 8 transacciones (≤5 productos distintos, formato lista de productos por transacción) + pregunta de exploración visual + revelacion 40 palabras que conecta con "{concept}".
[RESTRICCIONES] Sin terminología técnica de "{concept}" en la lectura inicial. Patrón debe ser identificable visualmente.
[SALIDA] JSON puro: {{"lectura":"...","transacciones":[{{"id":1,"productos":["A","B"]}}],"pregunta":"...","revelacion":"..."}}""",

        7: f"""[ROL] Instructor de EDA que diseña experimentos guiados para novatos.
[CONTEXTO] Estudiante explora "{concept}" para descubrir patrones antes de usar algoritmos.
[TAREA] Experimento de 4 pasos: descripcion_dataset (primeras 10 filas del dataset como texto), puntos para gráfico scatter (25 puntos en 2-3 grupos naturales sin etiquetas de clase, con coordenadas x/y/grupo), 3 preguntas de exploración progresivas, revelacion 50 palabras conectando con clasificación supervisada.
[RESTRICCIONES] Sin código Python visible. Preguntas son guías, no evaluación. Tono científico curioso.
[SALIDA] JSON puro: {{"descripcion_dataset":"...","puntos":[{{"x":1.2,"y":0.8,"grupo":0}}],"preguntas":["..."],"revelacion":"..."}}""",

        8: f"""[ROL] Diseñador de Role-Based Learning para Científico de Datos Junior.
[CONTEXTO] Estudiante asume rol junior explorando "{concept}" para tomar decisiones intuitivas.
[TAREA] 3 escenarios de negocio (e-commerce, salud, finanzas) con problema ≤40 palabras en lenguaje cotidiano. Cada uno: opcion_A, opcion_B, respuesta_correcta, feedback_A y feedback_B (20 palabras, no condescendiente). Mensajes finales por puntaje (0, "1-2", "3").
[RESTRICCIONES] Sin jerga técnica en enunciados. Respuesta objetivamente correcta.
[SALIDA] JSON puro: {{"escenarios":[{{"id":1,"problema":"...","opcion_A":"...","opcion_B":"...","respuesta_correcta":"A","feedback_A":"...","feedback_B":"..."}}],"mensajes_finales":{{"0":"...","1-2":"...","3":"..."}}}}""",

        9: f"""[ROL] Facilitador de aprendizaje activo en técnicas de mapa mental para ML.
[CONTEXTO] Estudiante construye mapa mental de "{concept}" desde pistas cotidianas hacia terminología formal.
[TAREA] 6 tarjetas (pista_cotidiana ↔ nodo_tecnico, relación 1:1). Cada tarjeta: feedback_correcto (✓ + 1 línea de contexto), feedback_incorrecto (✗ + pista adicional sin revelar). Revelación final 80 palabras del marco conceptual completo.
[RESTRICCIONES] Pistas comprensibles sin conocimiento previo. Tono celebratorio en la revelación.
[SALIDA] JSON puro: {{"tarjetas":[{{"id":1,"pista_cotidiana":"...","nodo_tecnico":"...","feedback_correcto":"...","feedback_incorrecto":"..."}}],"revelacion":"..."}}""",
    }
    return t.get(n, "")


def prompt_html(n: int, concept: str, data_json: str) -> str:
    estilos = {
        2: "chat educativo: mensajes de DataGuide en burbujas azules, campo de texto para el estudiante, feedback revelado tras cada respuesta, progreso de turnos",
        3: "minijuego drag & drop: variables arrastrables, 2 zonas destino (Numérica/Categórica), animación de arrastre CSS, feedback inmediato, puntuación final",
        4: "storyboard interactivo: guion por secciones, reproductor simulado con barra de progreso, overlay de pregunta de pausa, campo para respuesta del estudiante",
        5: "lectura interactiva: texto periodístico + tabla HTML de transacciones, pregunta de hipótesis destacada, botón 'Revelar patrón' con revelación animada",
        7: "laboratorio EDA: tabla del dataset, gráfico scatter SVG sin etiquetas de clase (puntos grises), 3 preguntas secuenciales, botón 'Revelar clases' que colorea grupos",
        8: "escenario ejecutivo: 3 problemas secuenciales, 2 botones de decisión, feedback animado, pantalla de resultados con puntaje 0-3 y mensaje motivacional",
        9: "mapa mental drag & drop: 6 tarjetas de pista + 6 nodos técnicos, conexión por arrastre, feedback por conexión, revelación expandida al completar el mapa",
    }
    estilo = estilos.get(n, "página educativa interactiva moderna")
    return f"""Genera HTML5 interactivo completo para recurso EXPLORE sobre "{concept}".
DATOS JSON: {data_json}
DISEÑO: {estilo}
REQUISITOS: HTML autocontenido (CSS en <style>, JS en <script>, sin CDN). Responsive. Inicia con <!DOCTYPE html>.
SCORM al final del script: {SCORM_JS}. Llama _scormComplete() al completar la actividad principal.
SALIDA: Solo el HTML, sin markdown."""
