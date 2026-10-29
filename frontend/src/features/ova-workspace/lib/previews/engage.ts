import { preview, type ResourcePreviewInfo } from "./preview-types";

const INTERACTIVE_HTML = "workspace:html_js_interactivo";

export const ENGAGE_PREVIEWS: Record<string, ResourcePreviewInfo> = {
  "1": preview(
    "workspace:comic_interactivo",
    "workspace:pagina_html_con_vinetas_clicables_y_una_pregunta_final",
    "workspace:html_css_interactivo",
    ["workspace:de_3_a_5_vinetas_en_secuencia", "workspace:narracion_del_concepto", "workspace:pregunta_de_reflexion_al_cierre"],
    "comic",
  ),
  "2": preview(
    "workspace:storyboard_de_video",
    "workspace:storyboardDescription",
    "workspace:guion_prompt_de_video",
    ["workspace:escenas_con_indicaciones", "workspace:dialogos_por_escena", "workspace:prompt_copiable_de_video"],
    "storyboard",
  ),
  "3": preview(
    "workspace:micro_podcast",
    "workspace:podcastDescription",
    "workspace:audio_guion_narrado",
    ["workspace:hook_de_apertura", "workspace:explicacion_breve", "workspace:cierre_con_pregunta"],
    "audio",
  ),
  "4": preview(
    "workspace:juego_de_gamificacion",
    "workspace:mini_juego_html_con_puntos_o_retos_sobre_el_concepto",
    INTERACTIVE_HTML,
    ["workspace:meta_clara_del_juego", "workspace:feedback_al_acertar_fallar", "workspace:puntuacion_o_progreso"],
    "game",
  ),
  "5": preview(
    "workspace:dilema_etico",
    "workspace:escenario_con_opciones_de_decision_y_consecuencias",
    "workspace:html_narrativo_eleccion",
    ["workspace:situacion_conflictiva", "workspace:2_o_3_opciones_de_accion", "workspace:reflexion_segun_la_eleccion"],
    "decisions",
  ),
  "6": preview(
    "workspace:noticia_de_impacto",
    "workspace:newsDescription",
    "workspace:html_tipo_articulo",
    ["workspace:titular_impactante", "workspace:cuerpo_de_la_noticia", "workspace:conexion_con_el_concepto"],
    "read",
  ),
  "7": preview(
    "workspace:juego_de_roles",
    "workspace:escenario_donde_el_estudiante_asume_un_rol_y_responde",
    "workspace:html_decisiones",
    ["workspace:rol_asignado", "workspace:situacion_a_resolver", "workspace:retroalimentacion_del_rol"],
    "decisions",
  ),
  "8": preview(
    "workspace:timeline_interactivo",
    "workspace:linea_de_tiempo_clicable_con_hitos_del_concepto",
    "workspace:html_css_interactivo",
    ["workspace:hitos_ordenados", "workspace:detalle_al_seleccionar", "workspace:vision_global_del_proceso"],
    "timeline",
  ),
  "9": preview(
    "workspace:escape_room_virtual",
    "workspace:retos_encadenados_para_escapar_aplicando_el_concepto",
    INTERACTIVE_HTML,
    ["workspace:pistas_y_acertijos", "workspace:progreso_por_salas", "workspace:desbloqueo_final"],
    "decisions",
  ),
  "10": preview(
    "workspace:simulador_intuitivo",
    "workspace:intuitiveSimulatorDescription",
    INTERACTIVE_HTML,
    ["workspace:controles_ajustables", "workspace:resultado_visual_inmediato", "workspace:insight_guiado"],
    "lab",
  ),
};
