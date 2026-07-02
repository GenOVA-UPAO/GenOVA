// @ts-check
import angular from "angular-eslint";
import tseslint from "typescript-eslint";

/**
 * ESLint here lints ONLY Angular templates (.html + inline `template:`).
 * TypeScript linting/formatting stays in Biome (biome.json) — do not add
 * TS rules in this file or the two linters will fight.
 */
export default tseslint.config(
  {
    ignores: ["dist/**", ".angular/**", "node_modules/**", "coverage/**"],
  },
  {
    // No TS rules on purpose — this block only exists so the processor can
    // extract inline templates and feed them to the .html block below.
    files: ["src/**/*.ts"],
    languageOptions: { parser: tseslint.parser },
    processor: angular.processInlineTemplates,
  },
  {
    files: ["src/**/*.html"],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      // `x != null` is the intentional null|undefined check used across the app.
      "@angular-eslint/template/eqeqeq": ["error", { allowNullOrUndefined: true }],
      // Custom form wrappers the rule can't recognize as controls.
      "@angular-eslint/template/label-has-associated-control": [
        "error",
        { controlComponents: ["p-checkbox", "gn-checkbox", "p-select", "gn-select"] },
      ],
    },
  },
);
