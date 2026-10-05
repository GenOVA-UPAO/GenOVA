/** Idiomas de la interfaz. Para añadir uno: agrega su código aquí y la carpeta `locales/<código>/`. */
export const SUPPORTED_LANGUAGES = ["es", "en"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "es";
export const LANGUAGE_STORAGE_KEY = "genova.lang";

/** Nombre de cada idioma en el propio idioma (no se traduce: así se reconoce al cambiar). */
export const LANGUAGE_NAMES: Record<Language, string> = {
  es: "Español",
  en: "English",
};

export function isSupportedLanguage(value: unknown): value is Language {
  return typeof value === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/** `en-US` → `en`. Devuelve `null` si el idioma no está soportado. */
export function normalizeLanguage(tag: string | null | undefined): Language | null {
  const base = tag?.trim().toLowerCase().split(/[-_]/)[0];
  return isSupportedLanguage(base) ? base : null;
}

export function readStoredLanguage(): Language | null {
  try {
    return normalizeLanguage(globalThis.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function storeLanguage(language: Language): void {
  try {
    globalThis.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Almacenamiento bloqueado (modo privado): la preferencia vale solo para la sesión.
  }
}

/** Preferencia guardada → idioma del navegador → español. */
function readBrowserLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return [];
  return navigator.languages.length > 0 ? navigator.languages : [navigator.language];
}

export function detectLanguage(
  stored: Language | null = readStoredLanguage(),
  browserLanguages: readonly string[] = readBrowserLanguages(),
): Language {
  if (stored) return stored;
  for (const tag of browserLanguages) {
    const match = normalizeLanguage(tag);
    if (match) return match;
  }
  return DEFAULT_LANGUAGE;
}
