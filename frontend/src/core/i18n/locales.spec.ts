import { describe, expect, it } from "vitest";

import { SUPPORTED_LANGUAGES } from "./languages";

const BUNDLES = import.meta.glob<unknown>("./locales/*/*.json", { eager: true, import: "default" });
const SOURCES = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  eager: true, query: "?raw", import: "default",
});

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

function missingReferences(file: string, source: string): string[] {
  const defaultNamespace = /useTranslation\(\s*["']([^"']+)["']/.exec(source)?.[1] ?? "common";
  const references = new Set([
    ...[...source.matchAll(/\bt\(\s*["']([^"']+)["']/g)].map((match) => match[1]),
    // Incluye claves de catálogos, metadatos y helpers resueltas con t(key).
    ...[...source.matchAll(/["']((?:workspace|workspace-versioning):[^"']+)["']/g)].map((match) => match[1]),
  ]);
  return [...references].flatMap((reference) => {
    const separator = reference.indexOf(":");
    const namespace = separator === -1 ? defaultNamespace : reference.slice(0, separator);
    const key = separator === -1 ? reference : reference.slice(separator + 1);
    return SUPPORTED_LANGUAGES
      .filter((language) => !baseKeys(load(language, namespace)).includes(base(key)))
      .map((language) => `${file}: ${language}/${reference}`);
  });
}

describe("recursos de traducción", () => {
  const files = namespaces("es");

  it("cada idioma tiene los mismos namespaces", () => {
    for (const language of SUPPORTED_LANGUAGES) {
      expect(namespaces(language)).toEqual(files);
    }
  });

  it.each(files)("%s: mismas claves y mismos {{parámetros}} en todos los idiomas", (file) => {
    const reference = load("es", file);
    for (const [key, text] of reference) {
      expect(text.trim(), `es/${file}:${key} vacío`).not.toBe("");
    }
    for (const language of SUPPORTED_LANGUAGES.filter((l) => l !== "es")) {
      const other = load(language, file);
      expect(baseKeys(other)).toEqual(baseKeys(reference));
      // Español e inglés usan las mismas formas cardinales: no basta con la base.
      expect(sorted(other.keys())).toEqual(sorted(reference.keys()));
      for (const [key, text] of other) {
        expect(text.trim(), `${language}/${file}:${key} vacío`).not.toBe("");
        const ref = reference.get(key);
        if (ref !== undefined) {
          expect(placeholders(text), `${language}/${file}:${key}`).toEqual(placeholders(ref));
        }
      }
    }
  });

  it("las claves literales usadas por app, core, biblioteca y workspace existen en ambos idiomas", () => {
    const problems = Object.entries(SOURCES)
      .filter(([file]) => /^\/src\/(app|core|features\/(ova-library|ova-workspace))\//.test(file) && !/\.(spec|test)\.tsx?$/.test(file))
      .flatMap(([file, source]) => missingReferences(file, source));
    expect(problems).toEqual([]);
  });

  it("workspace no conserva claves autogeneradas con hash", () => {
    for (const language of SUPPORTED_LANGUAGES) {
      for (const namespace of namespaces(language).filter((name) => name.startsWith("workspace"))) {
        expect([...load(language, namespace).keys()].filter((key) => /_[a-f\d]{6}$/.test(key))).toEqual([]);
      }
    }
  });
});
