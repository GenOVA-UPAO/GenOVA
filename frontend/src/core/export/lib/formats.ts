import i18n from "i18next";
/** Única fuente de verdad de los formatos de exportación (ids fijos, iguales a los del backend). */
export const EXPORT_FORMATS = [
  {
    id: "scorm12",
    label: "SCORM 1.2",
    extension: "zip",
    get description() { return i18n.t("shared:export.scorm12Description"); },
    descriptionKey: "shared:export.scorm12Description",
  },
  {
    id: "scorm2004",
    label: "SCORM 2004",
    extension: "zip",
    get description() { return i18n.t("shared:para_lms_que_piden_scorm_2004_4_edicion"); },
    descriptionKey: "shared:para_lms_que_piden_scorm_2004_4_edicion",
  },
  {
    id: "ims",
    label: "IMS Content Package",
    extension: "zip",
    get description() { return i18n.t("shared:paquete_de_contenido_estandar_sin_seguimiento"); },
    descriptionKey: "shared:paquete_de_contenido_estandar_sin_seguimiento",
  },
  {
    id: "html",
    get label() { return i18n.t("shared:web_html"); },
    extension: "zip",
    get description() { return i18n.t("shared:export.htmlDescription"); },
    descriptionKey: "shared:export.htmlDescription",
  },
  {
    id: "epub",
    label: "EPUB 3",
    extension: "epub",
    get description() { return i18n.t("shared:libro_digital_para_lectores_epub"); },
    descriptionKey: "shared:libro_digital_para_lectores_epub",
  },
  {
    id: "elpx",
    label: "eXeLearning",
    extension: "elpx",
    get description() { return i18n.t("shared:para_seguir_editando_en_exelearning"); },
    descriptionKey: "shared:para_seguir_editando_en_exelearning",
  },
] as const;

export type ExportFormatId = (typeof EXPORT_FORMATS)[number]["id"];
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const DEFAULT_EXPORT_FORMAT: ExportFormatId = "scorm12";

export function isExportFormatId(value: unknown): value is ExportFormatId {
  return EXPORT_FORMATS.some((f) => f.id === value);
}

export function getExportFormat(id: ExportFormatId): ExportFormat {
  return EXPORT_FORMATS.find((f) => f.id === id) ?? EXPORT_FORMATS[0];
}
