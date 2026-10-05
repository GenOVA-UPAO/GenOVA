import i18n from "i18next";
export type EducationLevelId =
  "universitario-inicial" | "universitario-avanzado" | "posgrado" | "secundaria";

export interface EducationLevel {
  id: EducationLevelId;
  label: string;
  labelKey: string;
  /** Texto que se añade al prompt: `Nivel educativo: <promptText>.` */
  promptText: string;
}

export const EDUCATION_LEVELS: readonly EducationLevel[] = [
  {
    id: "universitario-inicial",
    labelKey: "workspace:universitario_ciclos_iniciales",
    get label() { return i18n.t(this.labelKey); },
    promptText: "universitario (ciclos iniciales)",
  },
  {
    id: "universitario-avanzado",
    labelKey: "workspace:universitario_ciclos_avanzados",
    get label() { return i18n.t(this.labelKey); },
    promptText: "universitario (ciclos avanzados)",
  },
  { id: "posgrado", labelKey: "workspace:posgrado", get label() { return i18n.t(this.labelKey); }, promptText: "posgrado" },
  { id: "secundaria", labelKey: "workspace:secundaria", get label() { return i18n.t(this.labelKey); }, promptText: "secundaria" },
];

export const DEFAULT_EDUCATION_LEVEL: EducationLevelId = "universitario-inicial";

export const NIVEL_STORAGE_KEY = "genova.ova.nivel";

export function educationLevel(id: string): EducationLevel {
  return EDUCATION_LEVELS.find((level) => level.id === id) ?? EDUCATION_LEVELS[0];
}

export function loadEducationLevel(storage: Pick<Storage, "getItem">): EducationLevelId {
  const saved = storage.getItem(NIVEL_STORAGE_KEY);
  const match = saved === null ? undefined : EDUCATION_LEVELS.find((level) => level.id === saved);
  return match?.id ?? DEFAULT_EDUCATION_LEVEL;
}

/**
 * Añade la línea de nivel al final del prompt, salvo que el usuario ya la haya
 * escrito (comparación sin distinción de mayúsculas). Va al final porque el
 * backend titula el OVA con el inicio del prompt: antepuesta, todos los OVAs
 * nuevos se llamaban «Nivel educativo: universitario (ciclos iniciales)…».
 */
export function promptWithLevel(prompt: string, level: EducationLevelId): string {
  const text = prompt.trim();
  if (/nivel educativo/i.test(text)) return text;
  const line = `Nivel educativo: ${educationLevel(level).promptText}.`;
  return text.length > 0 ? `${text}\n\n${line}` : line;
}
