import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { DEFAULT_LANGUAGE, detectLanguage, type Language, storeLanguage } from "./languages";

type Bundle = Record<string, unknown>;

/**
 * Recursos de todos los idiomas, un JSON por namespace: `locales/<idioma>/<namespace>.json`.
 * Carga ansiosa: el idioma se resuelve de forma síncrona y no hay parpadeo de claves.
 */
const files = import.meta.glob<Bundle>("./locales/*/*.json", {
  eager: true,
  import: "default",
});

function buildResources(): Record<string, Record<string, Bundle>> {
  const resources: Record<string, Record<string, Bundle>> = {};
  for (const [path, bundle] of Object.entries(files)) {
    const [, language, file] = /\.\/locales\/([^/]+)\/([^/]+)\.json$/.exec(path) ?? [];
    if (!language || !file) continue;
    resources[language] ??= {};
    resources[language][file] = bundle;
  }
  return resources;
}

void i18n.use(initReactI18next).init({
  resources: buildResources(),
  lng: detectLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: "common",
  // React ya escapa los valores.
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
});

/** Cambia el idioma de la interfaz y recuerda la elección. */
export async function setLanguage(language: Language): Promise<void> {
  storeLanguage(language);
  await i18n.changeLanguage(language);
}

i18n.on("languageChanged", (language) => {
  if (typeof document !== "undefined") document.documentElement.lang = language;
});
if (typeof document !== "undefined") document.documentElement.lang = i18n.language;
