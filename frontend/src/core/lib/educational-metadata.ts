import type { TFunction } from "i18next";

/** Los valores son identificadores de la API; solo se traducen las etiquetas. */
export const OVA_LICENSES = [
  { value: "CC BY 4.0", descriptionKey: "metadata:licenses.by" },
  { value: "CC BY-SA 4.0", descriptionKey: "metadata:licenses.bySa" },
  { value: "CC BY-NC 4.0", descriptionKey: "metadata:licenses.byNc" },
  { value: "CC BY-NC-SA 4.0", descriptionKey: "metadata:licenses.byNcSa" },
  { value: "CC BY-ND 4.0", descriptionKey: "metadata:licenses.byNd" },
  { value: "CC BY-NC-ND 4.0", descriptionKey: "metadata:licenses.byNcNd" },
  { value: "CC0 1.0", descriptionKey: "metadata:licenses.cc0" },
  { value: "Todos los derechos reservados", descriptionKey: "metadata:licenses.reserved", labelKey: "metadata:licenses.reservedLabel" },
] as const;

export function licenseLabel(value: string, t: TFunction): string {
  const license = OVA_LICENSES.find((item) => item.value === value);
  return license && "labelKey" in license ? t(license.labelKey) : value;
}

export type OvaLicense = (typeof OVA_LICENSES)[number]["value"];

export interface EducationalMetadata {
  license?: OvaLicense;
  language?: string;
  keywords?: string[];
  educational_level?: string;
  audience?: string;
  typical_learning_time?: string;
  author?: string;
}
