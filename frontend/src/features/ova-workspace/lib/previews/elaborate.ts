import { preview, type ResourcePreviewInfo } from "./preview-types";

const HTML_JS = "workspace:html_js";

export const ELABORATE_PREVIEWS: Record<string, ResourcePreviewInfo> = {
  "1": preview(
    "workspace:estudio_de_caso",
    "workspace:caso_real_narrado_con_analisis_y_propuesta_de_solucion",
    "workspace:html_narrativo",
    ["workspace:situacion_real", "workspace:analisis_guiado", "workspace:propuesta_de_solucion"],
    "read",
  ),
  "2": preview(
    "workspace:ejercicio_guiado",
    "workspace:ejercicio_paso_a_paso_con_pistas_y_solucion_revelable",
    HTML_JS,
    ["workspace:enunciado_claro", "workspace:pasos_con_pistas", "workspace:solucion_al_final"],
    "steps",
  ),
  "3": preview(
    "workspace:mini_proyecto",
    "workspace:reto_de_entrega_corta_aplicando_el_concepto",
    "workspace:html_checklist",
    ["workspace:objetivo_del_proyecto", "workspace:entregables", "workspace:criterios_de_exito"],
    "steps",
  ),
  "4": preview(
    "workspace:simulacion_aplicada",
    "workspace:simulador_de_un_escenario_practico_del_dominio",
    "workspace:html_js_interactivo",
    ["workspace:escenario_realista", "workspace:decisiones_del_usuario", "workspace:resultado_simulado"],
    "lab",
  ),
  "5": preview(
    "workspace:analisis_de_datos",
    "workspace:dataset_pequeno_preguntas_de_interpretacion",
    "workspace:html_tabla_grafico",
    ["workspace:datos_de_ejemplo", "workspace:preguntas_de_analisis", "workspace:conclusion_esperada"],
    "dashboard",
  ),
  "6": preview(
    "workspace:escenario_ramificado",
    "workspace:historia_con_ramas_segun_las_decisiones_del_estudiante",
    "workspace:html_decisiones",
    ["workspace:nodos_de_decision", "workspace:caminos_alternativos", "workspace:cierre_segun_ruta"],
    "decisions",
  ),
  "7": preview(
    "workspace:lab_de_codigo",
    "workspace:editor_ejercicio_de_codigo_con_salida_esperada",
    HTML_JS,
    ["workspace:enunciado_tecnico", "workspace:area_de_codigo", "workspace:validacion_de_salida"],
    "code",
  ),
  "8": preview(
    "workspace:mapa_de_problemas",
    "workspace:mapa_para_descomponer_un_problema_en_partes",
    "workspace:html_nodos",
    ["workspace:problema_central", "workspace:subproblemas", "workspace:priorizacion"],
    "cardGrid",
  ),
  "9": preview(
    "workspace:juego_de_estrategia",
    "workspace:juego_de_turnos_decisiones_estrategicas_sobre_el_tema",
    HTML_JS,
    ["workspace:objetivo_estrategico", "workspace:turnos_o_jugadas", "workspace:puntuacion_resultado"],
    "game",
  ),
  "10": preview(
    "workspace:reto_de_diseno",
    "workspace:brief_de_diseno_con_restricciones_y_rubrica_breve",
    "workspace:html_formulario",
    ["workspace:brief_del_reto", "workspace:restricciones", "workspace:espacio_de_propuesta"],
    "form",
  ),
};
