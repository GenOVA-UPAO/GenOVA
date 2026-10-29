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

const ISO_DURATION = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i;
const CLOCK = /^(\d{1,3}):([0-5]\d)$/;
const HOURS_AND_MINUTES = /^(?:(\d{1,3})h)?(?:(\d{1,4})m?)?$/;

function isoFrom(hours: number, minutes: number): string {
  const total = hours * 60 + minutes;
  const h = Math.floor(total / 60);
  const m = total % 60;
  const hPart = h ? `${String(h)}H` : "";
  const mPart = m || !h ? `${String(m)}M` : "";
  return `PT${hPart}${mPart}`;
}

/** «1 hora y 30 minutos» → «1h30m»: unidades abreviadas y sin separadores. */
function compact(text: string): string {
  return text
    .toLowerCase()
    .replaceAll(/horas?|hrs?/g, "h")
    .replaceAll(/minutos?|mins?/g, "m")
    .replaceAll(/\sy\s/g, " ")
    .replaceAll(/[\s.]/g, "");
}

/**
 * Convierte lo que escribe el docente a ISO 8601 (`PT45M`, `PT1H30M`): acepta
 * minutos sueltos («45»), «45 min», «1 h 30 min», «1:30» y el ISO ya escrito.
 * `""` si está vacío y `null` si no se entiende o es cero.
 */
export function parseLearningTime(text: string): string | null {
  const value = text.trim();
  if (!value) return "";
  if (value.toUpperCase() !== "PT" && ISO_DURATION.test(value)) return value.toUpperCase();
  const clock = CLOCK.exec(value);
  if (clock) return isoFrom(Number(clock[1]), Number(clock[2]));
  const parts = HOURS_AND_MINUTES.exec(compact(value));
  if (!parts) return null;
  const hours = Number(parts[1] || 0);
  const minutes = Number(parts[2] || 0);
  return hours + minutes > 0 ? isoFrom(hours, minutes) : null;
}

function minutesOf(match: RegExpExecArray): number {
  return Number(match[1] || 0) * 60 + Number(match[2] || 0) + Math.round(Number(match[3] || 0) / 60);
}

/** ISO 8601 → texto que lee un docente («45 min», «1 h 30 min»); lo que no sea ISO se deja igual. */
export function formatLearningTime(iso: string | undefined): string {
  const value = iso ?? "";
  const match = ISO_DURATION.exec(value);
  if (!match || value.toUpperCase() === "PT") return value;
  const total = minutesOf(match);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return [h ? `${String(h)} h` : "", m || !h ? `${String(m)} min` : ""].filter(Boolean).join(" ");
}
