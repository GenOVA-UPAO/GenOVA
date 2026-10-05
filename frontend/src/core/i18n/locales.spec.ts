import { describe, expect, it } from "vitest";

import { SUPPORTED_LANGUAGES } from "./languages";

const BUNDLES = import.meta.glob<unknown>("./locales/*/*.json", { eager: true, import: "default" });

/** `{ es: { common: bundle, … }, en: … }` */
function groupByLanguage(): Map<string, Map<string, unknown>> {
  const grouped = new Map<string, Map<string, unknown>>();
  for (const [file, bundle] of Object.entries(BUNDLES)) {
    const [, language = "", name = ""] = /\.\/locales\/([^/]+)\/([^/.]+)\.json$/.exec(file) ?? [];
    const namespaces = grouped.get(language) ?? new Map<string, unknown>();
    namespaces.set(name, bundle);
    grouped.set(language, namespaces);
  }
  return grouped;
}
const byLanguage = groupByLanguage();

const sorted = (values: Iterable<string>) => [...values].sort((a, b) => a.localeCompare(b));
const namespaces = (language: string) => sorted(byLanguage.get(language)?.keys() ?? []);

function flatten(node: unknown, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof node === "string") out.set(prefix, node);
  else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      for (const [k, v] of flatten(value, prefix ? `${prefix}.${key}` : key)) out.set(k, v);
    }
  }
  return out;
}

function load(language: string, namespace: string): Map<string, string> {
  return flatten(byLanguage.get(language)?.get(namespace));
}

const placeholders = (text: string) =>
  sorted([...text.matchAll(/\{\{\s*([\w.]+)/g)].map((m) => m[1]));
// Claves plurales (`_one`, `_other`…) pueden variar por idioma; se comparan por su base.
const base = (key: string) => key.replace(/_(?:zero|one|two|few|many|other)$/, "");
const baseKeys = (map: Map<string, string>) => sorted(new Set([...map.keys()].map(base)));

describe("recursos de traducción", () => {
  const files = namespaces("es");

  it("cada idioma tiene los mismos namespaces", () => {
    for (const language of SUPPORTED_LANGUAGES) {
      expect(namespaces(language)).toEqual(files);
    }
  });

  it.each(files)("%s: mismas claves y mismos {{parámetros}} en todos los idiomas", (file) => {
    const reference = load("es", file);
    for (const language of SUPPORTED_LANGUAGES.filter((l) => l !== "es")) {
      const other = load(language, file);
      expect(baseKeys(other)).toEqual(baseKeys(reference));
      for (const [key, text] of other) {
        expect(text.trim(), `${language}/${file}:${key} vacío`).not.toBe("");
        const ref = reference.get(key);
        if (ref !== undefined) {
          expect(placeholders(text), `${language}/${file}:${key}`).toEqual(placeholders(ref));
        }
      }
    }
  });
});
