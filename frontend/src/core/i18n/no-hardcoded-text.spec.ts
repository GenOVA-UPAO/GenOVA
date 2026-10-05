/**
 * Guardia contra textos en duro: recorre los .ts/.tsx de producción y falla si encuentra
 * texto visible escrito directamente en el código (JSX, atributos accesibles) o literales en
 * español en cualquier módulo. Todo texto visible va en `locales/<idioma>/<namespace>.json`.
 *
 * Depuración: `VITE_I18N_SCAN=src/features/auth pnpm vitest run src/core/i18n/no-hardcoded-text.spec.ts`
 * limita el análisis a una ruta.
 */
import ts from "typescript";
import { describe, expect, it } from "vitest";

/** Fuente de producción como texto (sin APIs de Node: el tsconfig de la app no las tipa). */
const SOURCES = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
});

/** Atributos JSX cuyo valor lee el usuario (o un lector de pantalla). */
const TEXT_ATTRIBUTES = new Set([
  "title",
  "aria-label",
  "aria-description",
  "aria-placeholder",
  "aria-roledescription",
  "aria-valuetext",
  "placeholder",
  "alt",
  "label",
  "description",
  "tooltip",
  "content",
]);

/** Literales que no son texto traducible (marcas, siglas, unidades, símbolos). */
const ALLOWED_LITERALS = new Set(["GenOVA", "UPAO", "SCORM", "HTML", "PDF", "EPUB", "ELPX"]);

/** Archivos con texto en duro justificado (cada entrada necesita un motivo). */
const ALLOWED_FILES: Record<string, string> = {};

const SPANISH_MARKS = /[áéíóúñ¿¡ÁÉÍÓÚÑ]/;
const SPANISH_WORDS = new Set(
  "de del la las el los lo para por con sin un una que es está no se su sus al más tu tus este esta".split(" "),
);
const HAS_LETTERS = /\p{L}{2,}/u;

function isTestFile(file: string): boolean {
  return /\.(test|spec)\.tsx?$/.test(file) || file.endsWith(".d.ts");
}

function looksSpanish(text: string): boolean {
  if (SPANISH_MARKS.test(text)) return true;
  if (!/^\p{Lu}/u.test(text) || !text.includes(" ")) return false;
  return text.toLowerCase().split(/[^\p{L}]+/u).some((word) => SPANISH_WORDS.has(word));
}

interface Found { node: ts.Node; value: string; why: string }

function isTemplatePart(node: ts.Node): node is ts.TemplateLiteralLikeNode {
  return (
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node)
  );
}

function inspectAttribute(node: ts.JsxAttribute, source: ts.SourceFile): Found | null {
  if (!node.initializer || !ts.isStringLiteral(node.initializer)) return null;
  const name = node.name.getText(source);
  const value = node.initializer.text;
  if (!TEXT_ATTRIBUTES.has(name) || !HAS_LETTERS.test(value) || ALLOWED_LITERALS.has(value)) {
    return null;
  }
  return { node, value, why: `atributo ${name}` };
}

function inspect(node: ts.Node, source: ts.SourceFile): Found | null {
  if (ts.isJsxText(node)) {
    const value = node.text.replaceAll(/\s+/g, " ").trim();
    const flagged = HAS_LETTERS.test(value) && !ALLOWED_LITERALS.has(value);
    return flagged ? { node, value, why: "texto JSX" } : null;
  }
  if (ts.isJsxAttribute(node)) return inspectAttribute(node, source);
  if (ts.isStringLiteral(node) || isTemplatePart(node)) {
    const flagged = looksSpanish(node.text) && !ALLOWED_LITERALS.has(node.text);
    return flagged ? { node, value: node.text, why: "literal en español" } : null;
  }
  return null;
}

function findProblems(file: string, text: string): string[] {
  const kind = file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const problems: string[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    const found = inspect(node, source);
    if (found) {
      const { line } = source.getLineAndCharacterOfPosition(found.node.getStart(source));
      const shown = JSON.stringify(found.value.trim().slice(0, 60));
      problems.push(`${file.slice(1)}:${String(line + 1)} ${found.why}: ${shown}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return [...new Set(problems)];
}

describe("textos visibles", () => {
  it("no hay texto de interfaz escrito en duro (usa t('namespace:clave'))", () => {
    const scope = `/${(import.meta.env.VITE_I18N_SCAN as string | undefined) ?? "src"}`;
    const problems = Object.entries(SOURCES)
      .filter(([file]) => file.startsWith(scope) && !isTestFile(file) && !(file.slice(1) in ALLOWED_FILES))
      .flatMap(([file, text]) => findProblems(file, text));
    expect(problems.join("\n")).toBe("");
  });
});
