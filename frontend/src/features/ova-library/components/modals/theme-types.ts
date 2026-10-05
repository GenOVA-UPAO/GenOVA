import i18n from "i18next";

import type { Palette } from "@/core/lib/ova-palettes";

export interface ThemeState {
  colorMode: string;
  designMode: string;
  palette: Palette | null;
}

export const COLOR_MODES = [
  {
    key: "ai",
    get label() {
      return i18n.t("ova-library:aiChooses");
    },
    get desc() {
      return i18n.t("ova-library:la_ia_elige_los_colores_segun_el_tema_del_ova");
    },
  },
  {
    key: "upao",
    get label() {
      return i18n.t("ova-library:paleta_upao");
    },
    get desc() {
      return i18n.t("ova-library:azul_institucional_y_naranja_de_la_upao");
    },
  },
  {
    key: "custom",
    get label() {
      return i18n.t("ova-library:personalizado");
    },
    get desc() {
      return i18n.t("ova-library:elige_una_de_las_combinaciones_de_colores");
    },
  },
] as const;

export const DESIGN_MODES = [
  {
    key: "ai",
    get label() {
      return i18n.t("ova-library:aiChooses");
    },
    get desc() {
      return i18n.t("ova-library:la_ia_decide_la_disposicion_la_tipografia_y_la_estructura");
    },
  },
  {
    key: "upao",
    get label() {
      return i18n.t("ova-library:plantilla_upao");
    },
    get desc() {
      return i18n.t("ova-library:estructura_academica_con_las_fases_5e_en_pestanas");
    },
  },
] as const;
