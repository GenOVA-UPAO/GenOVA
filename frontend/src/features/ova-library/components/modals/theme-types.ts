import type { Palette } from "@/core/lib/ova-palettes";

export interface ThemeState {
  colorMode: string;
  designMode: string;
  palette: Palette | null;
}

export const COLOR_MODES = [
  {
    key: "ai",
    labelKey: "ova-library:aiChooses",
    descKey: "ova-library:la_ia_elige_los_colores_segun_el_tema_del_ova",
  },
  {
    key: "upao",
    labelKey: "ova-library:paleta_upao",
    descKey: "ova-library:azul_institucional_y_naranja_de_la_upao",
  },
  {
    key: "custom",
    labelKey: "ova-library:personalizado",
    descKey: "ova-library:elige_una_de_las_combinaciones_de_colores",
  },
] as const;

export const DESIGN_MODES = [
  {
    key: "ai",
    labelKey: "ova-library:aiChooses",
    descKey: "ova-library:la_ia_decide_la_disposicion_la_tipografia_y_la_estructura",
  },
  {
    key: "upao",
    labelKey: "ova-library:plantilla_upao",
    descKey: "ova-library:estructura_academica_con_las_fases_5e_en_pestanas",
  },
] as const;
