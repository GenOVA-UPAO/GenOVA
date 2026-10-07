import i18n, { type TFunction } from "i18next";

/**
 * Schemas de configuración por recurso de las 5 fases (clave `fase:recurso`).
 * Las factories N/V son detalle interno; la interfaz pública es ConfigField,
 * getSchema y getDefaultConfig.
 */
export interface ConfigField {
  key: string;
  label: string;
  labelKey?: string;
  descriptionKey?: string;
  type: "number";
  min: number;
  max: number;
  default: number;
  requiresVideo?: boolean;
  description: string;
}

type FieldArgs = [key: string, label: string, min: number, max: number, def: number, desc?: string];

const N = (...[key, label, min, max, def, desc = ""]: FieldArgs): ConfigField => ({
  key,
  labelKey: label,
  descriptionKey: desc,
  get label() { return i18n.t(label); },
  type: "number",
  min,
  max,
  default: def,
  get description() { return desc ? i18n.t(desc) : ""; },
});

const V = (...args: FieldArgs): ConfigField => {
  const field = N(...args);
  field.requiresVideo = true;
  return field;
};

const STEPS = "workspace:pasos";
const QUESTIONS = "workspace:preguntas";

export const RESOURCE_CONFIG_SCHEMA: Record<string, ConfigField[]> = {
  // engage
  "engage:1": [N("num_panels", "workspace:vinetas", 3, 8, 5, "workspace:numero_de_vinetas_del_comic_generado")],
  "engage:2": [
    N("num_scenes", "workspace:escenas_del_guion", 3, 5, 4, "workspace:escenas_temporales_del_guion_de_video_de_apertura"),
  ],
  "engage:3": [N("word_count", "workspace:palabras", 80, 150, 110, "workspace:extension_del_monologo_narrativo")],
  "engage:4": [N("num_rounds", "workspace:rondas", 2, 6, 3, "workspace:rondas_de_deteccion_en_el_minijuego")],
  "engage:5": [N("num_options", "workspace:opciones", 2, 4, 3, "workspace:opciones_de_posicion_en_el_dilema_etico")],
  "engage:6": [
    N("body_words", "workspace:palabras_cuerpo", 60, 130, 90, "workspace:extension_del_cuerpo_de_la_noticia_ficticia"),
  ],
  "engage:7": [
    N(
      "context_words",
      "workspace:palabras_contexto",
      50,
      100,
      70,
      "workspace:extension_del_contexto_del_escenario_de_rol",
    ),
  ],
  "engage:8": [N("num_milestones", "workspace:hitos", 3, 6, 4, "workspace:hitos_historicos_en_el_timeline")],
  "engage:9": [N("num_puzzles", "workspace:acertijos", 2, 5, 3, "workspace:acertijos_encadenados_en_el_escape_room")],
  "engage:10": [N("num_controls", "workspace:controles", 1, 3, 1, "workspace:controles_manipulables_en_el_simulador")],
  // explore
  "explore:1": [
    N("num_iterations", "workspace:iteraciones", 2, 5, 3, "workspace:iteraciones_requeridas_para_completar_el_lab"),
  ],
  "explore:2": [N("num_turns", "workspace:turnos", 4, 8, 6, "workspace:turnos_de_la_sesion_socratica")],
  "explore:3": [N("num_rounds", "workspace:rondas", 3, 8, 6, "workspace:rondas_del_juego_de_clasificacion")],
  "explore:4": [
    V("num_pauses", "workspace:pausas_activas", 1, 5, 3, "workspace:preguntas_de_pausa_activa_en_el_video"),
  ],
  "explore:5": [N("num_records", "workspace:registros", 6, 15, 8, "workspace:registros_en_el_dataset_de_exploracion")],
  "explore:6": [
    N("num_zones", "workspace:zonas_estados", 2, 4, 3, "workspace:zonas_de_comportamiento_en_el_simulador_parametrico"),
  ],
   "explore:7": [N("num_steps", STEPS, 3, 6, 4, "workspace:pasos_del_experimento_guiado")],
  "explore:8": [N("num_scenarios", "workspace:escenarios", 2, 6, 4, "workspace:escenarios_de_negocio_a_resolver")],
  "explore:9": [N("num_cards", "workspace:tarjetas", 4, 8, 6, "workspace:tarjetas_de_emparejamiento_conceptual")],
  "explore:10": [
    N("num_trials", "workspace:pruebas", 2, 5, 3, "workspace:pruebas_antes_de_revelar_la_solucion_optima"),
  ],
  // explain
  "explain:1": [
    V("num_markers", "workspace:marcadores", 2, 5, 4, "workspace:marcadores_temporales_en_el_video_teorico"),
  ],
  "explain:2": [N("num_sections", "workspace:secciones", 2, 5, 3, "workspace:ideas_centrales_con_ejemplo_y_pregunta")],
  "explain:3": [N("num_nodes", "workspace:nodos", 5, 10, 7, "workspace:nodos_del_mapa_conceptual_interactivo")],
  "explain:4": [N("num_questions", QUESTIONS, 4, 10, 6, "workspace:preguntas_del_faq_interactivo")],
  "explain:5": [N("num_steps", STEPS, 3, 6, 5, "workspace:pasos_de_la_animacion_demostrativa")],
  "explain:6": [N("num_terms", "workspace:terminos", 5, 12, 8, "workspace:terminos_del_glosario_visual")],
  "explain:7": [N("num_milestones", "workspace:hitos", 3, 6, 5, "workspace:hitos_del_timeline_historico")],
  "explain:8": [N("num_blocks", "workspace:bloques", 3, 8, 5, "workspace:bloques_del_diagrama_de_framework")],
  "explain:9": [N("num_dimensions", "workspace:dimensiones", 3, 6, 4, "workspace:dimensiones_de_la_tabla_comparativa")],
  "explain:10": [N("num_sections", "workspace:secciones", 4, 8, 5, "workspace:secciones_de_la_infografia_interactiva")],
  // elaborate
  "elaborate:1": [
    N("num_questions", QUESTIONS, 3, 6, 4, "workspace:preguntas_progresivas_del_caso_de_estudio"),
  ],
  "elaborate:2": [N("num_steps", STEPS, 3, 7, 5, "workspace:pasos_del_ejercicio_guiado_de_aplicacion")],
  "elaborate:3": [
    N("num_deliverables", "workspace:entregables", 2, 5, 3, "workspace:entregables_evaluables_del_mini_proyecto"),
  ],
  "elaborate:4": [N("num_params", "workspace:parametros", 2, 5, 3, "workspace:parametros_ajustables_de_la_simulacion")],
  "elaborate:5": [
    N("num_questions", QUESTIONS, 2, 5, 3, "workspace:preguntas_de_exploracion_en_el_dashboard"),
  ],
  "elaborate:6": [
    N("num_decisions", "workspace:decisiones", 2, 4, 3, "workspace:niveles_de_decision_en_el_escenario_ramificado"),
  ],
  "elaborate:7": [
    N("num_exercises", "workspace:ejercicios", 2, 5, 3, "workspace:ejercicios_de_pseudocodigo_en_el_lab"),
  ],
  "elaborate:8": [N("num_problems", "workspace:problemas", 2, 5, 4, "workspace:problemas_del_mapa_de_aplicacion")],
  "elaborate:9": [N("num_turns", "workspace:turnos", 4, 8, 6, "workspace:turnos_del_juego_de_estrategia")],
  "elaborate:10": [N("num_criteria", "workspace:criterios", 3, 6, 4, "workspace:criterios_de_diseno_del_reto")],
  // evaluate
  "evaluate:1": [N("num_questions", QUESTIONS, 4, 10, 6, "workspace:preguntas_del_quiz_interactivo")],
  "evaluate:2": [
    N("num_criteria", "workspace:criterios", 3, 6, 5, "workspace:criterios_de_la_rubrica_de_autoevaluacion"),
  ],
  "evaluate:3": [
    N("num_questions", QUESTIONS, 4, 10, 8, "workspace:preguntas_del_desafio_contrarreloj"),
    N("time_seconds", "workspace:segundos", 30, 120, 90, "workspace:tiempo_total_del_contador_regresivo"),
  ],
  "evaluate:4": [
    N("num_questions", QUESTIONS, 5, 12, 8, "workspace:preguntas_del_examen_de_opcion_multiple"),
  ],
  "evaluate:5": [N("num_sentences", "workspace:oraciones", 4, 12, 8, "workspace:oraciones_con_espacio_en_blanco")],
  "evaluate:6": [N("num_pairs", "workspace:pares", 4, 8, 6, "workspace:pares_de_la_actividad_de_relacionar")],
  "evaluate:7": [N("num_terms", "workspace:terminos", 5, 12, 8, "workspace:terminos_del_crucigrama_conceptual")],
  "evaluate:8": [N("num_questions", QUESTIONS, 2, 5, 3, "workspace:preguntas_de_desarrollo_abiertas")],
  "evaluate:9": [
    N("num_decisions", "workspace:decisiones", 2, 5, 3, "workspace:decisiones_evaluables_en_la_simulacion"),
  ],
  "evaluate:10": [
    N("num_competencias", "workspace:competencias", 2, 5, 3, "workspace:competencias_adquiridas_en_el_diploma"),
  ],
  "evaluate:11": [N("max_questions", QUESTIONS, 4, 10, 6, "workspace:preguntas_maximas_del_quiz_adaptativo")],
};

export function getDefaultConfig(phaseKey: string, resourceId: string): Record<string, number> {
  const schema = RESOURCE_CONFIG_SCHEMA[`${phaseKey}:${resourceId}`] ?? [];
  return Object.fromEntries(schema.map((f) => [f.key, f.default]));
}

export function getSchema(phaseKey: string, resourceId: string, t?: TFunction): ConfigField[] {
  const fields = RESOURCE_CONFIG_SCHEMA[`${phaseKey}:${resourceId}`] ?? [];
  return t ? fields.map((field) => ({ ...field, label: field.labelKey ? t(field.labelKey) : field.label, description: field.descriptionKey ? t(field.descriptionKey) : "" })) : fields;
}
