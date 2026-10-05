import { preview, type ResourcePreviewInfo } from "./preview-types";

const HTML_JS = "workspace:html_js";

export const EVALUATE_PREVIEWS: Record<string, ResourcePreviewInfo> = {
  "1": preview(
    "workspace:quiz_interactivo",
    "workspace:cuestionario_con_feedback_inmediato_y_puntuacion",
    "workspace:html_js_interactivo",
    ["workspace:preguntas_cortas", "workspace:retroalimentacion_inmediata", "workspace:resumen_de_puntaje"],
    "quiz",
  ),
  "2": preview(
    "workspace:rubrica_de_autoevaluacion",
    "workspace:rubrica_para_que_el_estudiante_se_autoevalue",
    "workspace:html_formulario_12",
    ["workspace:criterios_claros", "workspace:niveles_de_logro", "workspace:reflexion_final"],
    "form",
  ),
  "3": preview(
    "workspace:desafio_contrarreloj",
    "workspace:reto_cronometrado_de_aplicacion_del_concepto",
    "workspace:html_timer",
    ["workspace:temporizador", "workspace:items_a_resolver", "workspace:resultado_al_acabar"],
    "quiz",
  ),
  "4": preview(
    "workspace:examen_opcion_multiple",
    "workspace:examen_tipo_test_con_una_respuesta_correcta",
    HTML_JS,
    ["workspace:items_de_opcion_multiple", "workspace:seleccion_unica", "workspace:correccion_al_enviar"],
    "quiz",
  ),
  "5": preview(
    "workspace:completar_espacios",
    "workspace:texto_con_huecos_para_completar_terminos_clave",
    "workspace:html_inputs",
    ["workspace:oraciones_con_huecos", "workspace:validacion_de_respuestas", "workspace:pista_opcional"],
    "form",
  ),
  "6": preview(
    "workspace:relacionar_conceptos",
    "workspace:emparejar_terminos_con_definiciones_o_ejemplos",
    "workspace:html_matching",
    ["workspace:columnas_a_relacionar", "workspace:emparejamiento", "workspace:feedback_de_aciertos"],
    "matching",
  ),
  "7": preview(
    "workspace:crucigrama_conceptual",
    "workspace:crucigrama_con_pistas_del_vocabulario_del_tema",
    HTML_JS,
    ["workspace:cuadricula", "workspace:pistas_por_numero", "workspace:validacion_de_palabras"],
    "crossword",
  ),
  "8": preview(
    "workspace:preguntas_de_desarrollo",
    "workspace:preguntas_abiertas_con_guia_de_respuesta_esperada",
    "workspace:html_textarea",
    ["workspace:enunciados_abiertos", "workspace:espacio_de_respuesta", "workspace:criterios_de_evaluacion"],
    "form",
  ),
  "9": preview(
    "workspace:simulacion_evaluativa",
    "workspace:assessmentSimulatorDescription",
    HTML_JS,
    ["workspace:escenario_de_prueba", "workspace:decisiones_evaluadas", "workspace:puntaje_debrief"],
    "lab",
  ),
  "10": preview(
    "workspace:diploma_de_logro",
    "workspace:pagina_de_cierre_con_logros_y_mensaje_de_completitud",
    "workspace:html_certificado",
    ["workspace:resumen_de_logros", "workspace:mensaje_motivacional", "workspace:sello_diploma_visual"],
    "diploma",
  ),
  "11": preview(
    "Quiz Adaptativo",
    "Cuestionario multinivel con ajuste dinámico de dificultad y reporte de dominio.",
    "HTML + JS interactivo",
    ["3 niveles de dificultad", "Ajuste dinámico", "Reporte final de dominio"],
    "quiz",
  ),
};
