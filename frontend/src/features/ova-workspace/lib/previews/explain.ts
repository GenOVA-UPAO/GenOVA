import { preview, type ResourcePreviewInfo } from "./preview-types";

export const EXPLAIN_PREVIEWS: Record<string, ResourcePreviewInfo> = {
  "1": preview(
    "workspace:video_teorico",
    "workspace:guion_estructurado_y_prompt_para_un_video_explicativo",
    "workspace:guion_prompt_de_video",
    ["workspace:explicacion_estructurada", "workspace:ejemplos_visuales", "workspace:resumen_al_cierre"],
    "storyboard",
  ),
  "2": preview(
    "workspace:lectura_guiada",
    "workspace:texto_didactico_con_secciones_y_preguntas_de__bbf184",
    "workspace:html_narrativo",
    ["workspace:secciones_claras", "workspace:ejemplos_intercalados", "workspace:chequeo_de_comprension"],
    "read",
  ),
  "3": preview(
    "workspace:mapa_conceptual",
    "workspace:diagrama_de_conceptos_y_relaciones_clicables",
    "HTML + CSS/JS",
    ["workspace:conceptos_enlazados", "workspace:relaciones_etiquetadas", "workspace:detalle_al_seleccionar"],
    "graph",
  ),
  "4": preview(
    "workspace:faq_interactivo",
    "workspace:preguntas_frecuentes_expandibles_sobre_el_tema",
    "workspace:html_acordeon",
    ["workspace:lista_de_preguntas", "workspace:respuestas_al_expandir", "workspace:orden_de_lo_basico_a_lo_avanzado"],
    "accordion",
  ),
  "5": preview(
    "workspace:demo_animada",
    "workspace:demostracion_visual_paso_a_paso_del_concepto",
    "workspace:html_animacion",
    ["workspace:pasos_animados", "workspace:controles_play_siguiente", "workspace:nota_conceptual"],
    "demo",
  ),
  "6": preview(
    "workspace:glosario_visual",
    "workspace:tarjetas_de_terminos_con_definicion_e_imagen_icono",
    "workspace:html_tipo_glosario",
    ["workspace:terminos_clave", "workspace:definicion_breve", "workspace:ejemplo_de_uso"],
    "cardGrid",
  ),
  "7": preview(
    "workspace:linea_de_tiempo",
    "workspace:cronologia_del_desarrollo_o_del_proceso_del_concepto",
    "workspace:html_timeline",
    ["workspace:eventos_ordenados", "workspace:detalle_por_hito", "workspace:vision_de_evolucion"],
    "timeline",
  ),
  "8": preview(
    "workspace:diagrama_de_framework",
    "workspace:esquema_de_capas_componentes_del_framework_o_modelo",
    "workspace:html_diagrama",
    ["workspace:bloques_del_framework", "workspace:relaciones_entre_partes", "workspace:leyenda_breve"],
    "graph",
  ),
  "9": preview(
    "workspace:tabla_comparativa",
    "workspace:tabla_que_contrasta_enfoques_modelos_o_tecnicas",
    "workspace:html_tabla",
    ["Filas/columnas claras", "workspace:criterios_de_comparacion", "workspace:conclusion_sugerida"],
    "table",
  ),
  "10": preview(
    "workspace:infografia_interactiva",
    "workspace:infografia_con_zonas_clicables_y_datos_clave",
    "workspace:html_css_interactivo",
    ["workspace:bloques_visuales", "workspace:datos_destacados", "workspace:detalle_al_interactuar"],
    "infographic",
  ),
};
