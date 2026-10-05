import { preview, type ResourcePreviewInfo } from "./preview-types";

const INTERACTIVE_HTML = "workspace:html_js_interactivo";

export const EXPLORE_PREVIEWS: Record<string, ResourcePreviewInfo> = {
  "1": preview(
    "workspace:simulador_virtual_lab",
    "workspace:laboratorio_html_donde_se_manipulan_variables_b973eb",
    INTERACTIVE_HTML,
    ["workspace:variables_controlables", "workspace:registro_de_resultados", "workspace:analisis_guiado"],
    "lab",
  ),
  "2": preview(
    "workspace:agente_socratico",
    "workspace:chat_que_guia_con_preguntas_no_da_la_respuesta_directa",
    "workspace:html_js_chat",
    ["workspace:dialogo_mayeutico", "workspace:preguntas_guia", "workspace:retroalimentacion_contextual"],
    "chat",
  ),
  "3": preview(
    "workspace:juego_drag_drop",
    "workspace:actividad_de_arrastrar_elementos_a_categorias_4166b5",
    INTERACTIVE_HTML,
    ["workspace:piezas_arrastrables", "workspace:zonas_de_destino", "workspace:feedback_al_soltar"],
    "dragdrop",
  ),
  "4": preview(
    "workspace:video_con_pausa_activa",
    "workspace:guion_video_con_pausas_para_responder_preguntas",
    "workspace:guion_prompt_html",
    ["workspace:segmentos_de_video", "workspace:pregunta_en_la_pausa", "workspace:continua_tras_responder"],
    "storyboard",
  ),
  "5": preview(
    "workspace:lectura_interactiva",
    "workspace:texto_con_hotspots_o_revelaciones_al_hacer_clic",
    "workspace:html_interactivo",
    ["workspace:pasajes_clave", "workspace:notas_al_expandir", "workspace:comprobacion_breve"],
    "read",
  ),
  "6": preview(
    "workspace:simulador_de_slider",
    "workspace:sliders_que_cambian_un_modelo_o_grafico_en_vivo",
    INTERACTIVE_HTML,
    ["workspace:uno_o_mas_sliders", "workspace:visualizacion_dinamica", "workspace:conclusion_guiada"],
    "lab",
  ),
  "7": preview(
    "workspace:experimento_guiado",
    "workspace:pasos_de_experimento_con_observacion_y_registro",
    "workspace:html_guiado",
    ["workspace:pasos_numerados", "workspace:espacio_de_observacion", "workspace:conclusion_del_ensayo"],
    "lab",
  ),
  "8": preview(
    "workspace:juego_de_roles",
    "workspace:simulacion_de_roles_para_explorar_el_concepto_5d7ac9",
    "workspace:html_decisiones",
    ["workspace:contexto_del_rol", "workspace:decisiones_del_estudiante", "workspace:debrief_del_rol"],
    "decisions",
  ),
  "9": preview(
    "workspace:mapa_mental",
    "workspace:mapa_de_nodos_expandible_alrededor_del_concep_bcd919",
    "HTML + CSS/JS",
    ["workspace:nodo_central", "workspace:ramas_clicables", "workspace:detalle_por_nodo"],
    "matching",
  ),
  "10": preview(
    "workspace:lab_de_hipotesis",
    "workspace:formulario_para_plantear_hipotesis_y_contrastarlas",
    "workspace:html_js",
    ["workspace:plantea_hipotesis", "workspace:prueba_evidencia", "workspace:validacion_o_rechazo"],
    "lab",
  ),
};
