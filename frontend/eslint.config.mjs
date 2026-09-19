// @ts-check
import js from "@eslint/js";
import angular from "angular-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import boundaries from "eslint-plugin-boundaries";
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
  // Fronteras de arquitectura por features (eslint-plugin-boundaries).
  // Reglas (enforced como error): feature -> core / su propia feature (nunca otra feature);
  //                               core    -> core (nunca feature ni app);
  //                               app     -> app / core / feature.
  {
    files: ["src/**/*.ts"],
    plugins: { boundaries },
    settings: {
      "boundaries/dependency-nodes": ["import"],
      "boundaries/ignore": ["src/main.ts", "src/**/*.spec.ts", "src/**/*.d.ts"],
      "boundaries/elements": [
        { type: "app", pattern: "src/app/**/*" },
        { type: "core", pattern: "src/core/**/*" },
        { type: "feature", pattern: "src/features/*/**/*", capture: ["featureName"] },
      ],
      "import/resolver": {
        typescript: { alwaysTryTypes: true, project: ["./tsconfig.app.json", "./tsconfig.spec.json"] },
      },
    },
    rules: {
      "boundaries/no-unknown": "off",
      "boundaries/no-unknown-files": "off",
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: ["app"], allow: ["app", "core", "feature"] },
            { from: ["core"], allow: ["core"] },
            {
              from: ["feature"],
              allow: ["core", ["feature", { featureName: "${from.featureName}" }]],
            },
          ],
        },
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

      // Convenciones de tamaño (ver readme §Convenciones): lo que importa es cohesión
      // y una sola responsabilidad, no un cap por archivo. Se quedan en "warn" a
      // propósito: los infractores actuales son métodos de 31-40 líneas cohesivos
      // (partirlos en dos de 20 fragmenta sin mejorar) y ficheros de componentes
      // compuestos de Angular (dialog+header+footer, viewer+panel) que agrupan
      // clases estructurales relacionadas — un patrón idiomático, no una violación.
      // El aviso sigue marcando el crecimiento; no rompe el build.
      "max-lines-per-function": [
        "warn",
        { max: 30, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      "max-classes-per-file": ["warn", 1],
      "max-params": ["warn", 4],
      "max-lines": ["warn", { max: 400, skipBlankLines: true, skipComments: true }],

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
      // `||` vs `??`: la pasada dedicada ya se hizo (revisión de los 339 usos
      // en src, fichero a fichero). Criterio aplicado: `??` solo cuando el
      // tipo del operando izquierdo es explícitamente opcional/nullish y ""
      // es imposible (p. ej. link-row `linked ?? { email }`, dashboard-page
      // `created ?? updated`, emails validados). Se quedó con `||` TODO lo que
      // depende a propósito del falsy: condiciones booleanas, mensajes de
      // error donde "" debe caer al fallback, defaults de payload (`|| 0`,
      // `|| []`), normalización de formularios (`"" -> null`) y cadenas de
      // display donde el backend envía "" real (serializadores `x or ""` en
      // full_name/name — con `??` se mostraría una cadena vacía).
      // La regla sigue "off" a conciencia: sin `strictNullChecks` el
      // type-checker considera nullables TODOS los tipos, así que la regla
      // marca también los fallbacks intencionales (136 flags: p. ej.
      // `http.ts` "body?.message || body?.detail", `layout-helpers`
      // "full_name || email") — activarla exigiría 130+ `eslint-disable`
      // que entrenan a ignorar los disables. Se revisita si algún día se
      // activa `strictNullChecks` en el frontend.
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
      // Los tests quedan fuera de las convenciones de tamaño (fixtures, arrange largo).
      "max-lines": "off",
      "max-lines-per-function": "off",
      "max-classes-per-file": "off",
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
