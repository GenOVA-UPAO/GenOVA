/** Única fuente de verdad de los formatos de exportación (ids fijos, iguales a los del backend). */
export const EXPORT_FORMATS = [
  {
    id: "scorm12",
    label: "SCORM 1.2",
    extension: "zip",
    description: "Compatible con casi cualquier aula virtual (Moodle, Canvas, Blackboard…)",
  },
  {
    id: "scorm2004",
    label: "SCORM 2004",
    extension: "zip",
    description: "Para LMS que piden SCORM 2004 (4.ª edición)",
  },
  {
    id: "ims",
    label: "IMS Content Package",
    extension: "zip",
    description: "Paquete de contenido estándar, sin seguimiento",
  },
  {
    id: "html",
    label: "Web (HTML)",
    extension: "zip",
    description: "Sitio web para abrir en el navegador o subir a un servidor",
  },
  {
    id: "epub",
    label: "EPUB 3",
    extension: "epub",
    description: "Libro digital para lectores EPUB",
  },
  {
    id: "elpx",
    label: "eXeLearning",
    extension: "elpx",
    description: "Para seguir editando en eXeLearning",
  },
  {
    id: "h5p",
    label: "H5P",
    extension: "h5p",
    description: "Actividades editables para Moodle, WordPress o Lumi",
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
