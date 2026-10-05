/** Licencias admitidas por la API y condiciones resumidas para el docente. */
export const OVA_LICENSES = [
  { value: "CC BY 4.0", description: "Permite compartir y adaptar citando al autor." },
  { value: "CC BY-SA 4.0", description: "Permite compartir y adaptar citando al autor y manteniendo la misma licencia." },
  { value: "CC BY-NC 4.0", description: "Permite compartir y adaptar con atribución, sin uso comercial." },
  { value: "CC BY-NC-SA 4.0", description: "Sin uso comercial; exige atribución y la misma licencia." },
  { value: "CC BY-ND 4.0", description: "Permite compartir con atribución, sin distribuir adaptaciones." },
  { value: "CC BY-NC-ND 4.0", description: "Permite compartir con atribución, sin uso comercial ni adaptaciones." },
  { value: "CC0 1.0", description: "Dedicación al dominio público, sin condiciones de reutilización." },
  { value: "Todos los derechos reservados", description: "La reutilización requiere autorización del titular." },
] as const;

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
