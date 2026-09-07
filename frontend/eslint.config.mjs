// @ts-check
import js from "@eslint/js";
import angular from "angular-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import noBarrelFiles from "eslint-plugin-no-barrel-files";
import eslintPluginPrettier from "eslint-plugin-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

/**
 * Single linter for the whole frontend (TS + Angular templates). Replaces
 * Biome — this is now also the source of truth for formatting via
 * eslint-plugin-prettier (`pnpm lint --fix` fixes both logic and style).
 */
export default tseslint.config(
  {
    ignores: ["dist/**", ".angular/**", "node_modules/**", "coverage/**", "libs/ui/**"],
  },
  // Prohíbe barrel files (re-export index.ts) y fuerza importar del módulo fuente.
  // configs["flat/recommended"] activa no-barrel-files/no-barrel-files +
  // no-barrel-files/prefer-source-imports (ambas "error").
  ...noBarrelFiles.configs["flat/recommended"],
  {
    // Los subpath de @spartan-ng/helm (`@spartan-ng/helm/button`, …) son la API
    // pública de la librería, no barrels internos — no los "corrijas" a deep imports.
    rules: {
      "no-barrel-files/prefer-source-imports": [
        "error",
        { ignore: ["@spartan-ng/helm/*", "@spartan-ng/*"] },
      ],
    },
  },
  {
    files: ["src/**/*.ts"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.app.json", "./tsconfig.spec.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "unused-imports": unusedImports,
      "simple-import-sort": simpleImportSort,
      prettier: eslintPluginPrettier,
    },
    rules: {
      ...eslintConfigPrettier.rules,
      "prettier/prettier": "error",

      // Import hygiene (replaces Biome's noUnusedImports + organizeImports assist).
      "unused-imports/no-unused-imports": "error",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-vars": [
        "error",
        { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" },
      ],
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "sort-imports": "off",

      // File-size cap (frontend convention, carried over from biome.json).
      "max-lines": ["error", { max: 250, skipBlankLines: true, skipComments: false }],

      // Deliberate project conventions (previously set in biome.json):
      // heavy `any` usage at API/DOM boundaries, `!` for narrowed-but-provable state.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/dot-notation": "off",
      // Angular DI / templates read many fields dynamically (form models, API payloads).
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      // Renaming onSave/onClose/onEdit/... across the whole public API + every
      // template consumer is a repo-wide rename, not a lint fix — established
      // convention, out of scope here.
      "@angular-eslint/no-output-on-prefix": "off",
      // Many "dumb" structural components (dialog sub-parts, layout shells,
      // table cells) are intentionally empty classes — all behavior lives in
      // the template/decorator. Standard Angular pattern.
      "@typescript-eslint/no-extraneous-class": "off",
      // `||` vs `??`: 140+ call sites, several rely on falsy-string/zero
      // fallback behavior that `??` would silently change. Needs a dedicated
      // pass, not a blanket lint-config flip.
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      // Mostly noise from optional chaining against loosely-typed API
      // response shapes (backend contracts aren't statically verified);
      // real dead-code conditions are rare enough here to not justify the
      // false-positive volume.
      "@typescript-eslint/no-unnecessary-condition": "off",
      // number / string|undefined in template literals are safe and common
      // here (formatting counts, sizes, optional labels) — only flag the
      // genuinely risky case (stringifying an object/any).
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true, allowNullish: true, allowBoolean: true },
      ],
      // CVA no-op placeholders (onChange/onTouched overwritten by
      // registerOnChange) and reset callbacks are idiomatically empty.
      "@typescript-eslint/no-empty-function": ["error", { allow: ["arrowFunctions", "methods"] }],
      // `delete record[dynamicKey]` on plain Record<string, T> maps is safe
      // and idiomatic; this rule targets a narrower unsafe-index-signature
      // case that doesn't apply to our usage.
      "@typescript-eslint/no-dynamic-delete": "off",
      // Angular lifecycle hooks (OnInit.ngOnInit etc.) are commonly `async`
      // in this codebase — that's an accepted Angular idiom, not a misuse.
      // Other void-return misuse (passing async fns to sync callbacks) stays
      // enforced.
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { inheritedMethods: false } },
      ],
      // `catch {}` is a deliberate ignore-this-error pattern (best-effort JSON
      // parse of an empty/malformed body, non-critical cleanup failures).
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["src/**/*.spec.ts"],
    rules: {
      // 200/250-line rule excludes tests (project convention).
      "max-lines": "off",
    },
  },
  {
    files: ["src/**/*.html"],
    ignores: ["src/index.html"],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      // `x != null` is the intentional null|undefined check used across the app.
      "@angular-eslint/template/eqeqeq": ["error", { allowNullOrUndefined: true }],
      // Custom form wrappers the rule can't recognize as controls.
      "@angular-eslint/template/label-has-associated-control": [
        "error",
        { controlComponents: ["gn-checkbox", "hlm-checkbox", "hlm-select"] },
      ],
    },
  },
);
