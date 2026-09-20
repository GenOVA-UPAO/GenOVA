// Reglas adaptadas de GestVet (frontend/eslint.config.js). Diferencias con el
// original, todas por la forma de GenOVA:
// - Nombres en kebab-case para todo src: el refactor hexagonal ya los dejo asi y
//   los tests de cucumber (tests/steps/unit) importan esas rutas.
// - Capas: app (composicion) -> features/* -> core (compartido).
// - Se conservan jsx-a11y y simple-import-sort, que GenOVA ya aplicaba.
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import boundaries from "eslint-plugin-boundaries";
import checkFile from "eslint-plugin-check-file";
import jsxA11y from "eslint-plugin-jsx-a11y";
import noBarrelFiles from "eslint-plugin-no-barrel-files";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import sonarjs from "eslint-plugin-sonarjs";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "coverage/**", "node_modules/**"] },

  // ---------------------------------------------------------------------
  // Base: correccion del lenguaje y tipos.
  // ---------------------------------------------------------------------
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },

  // ---------------------------------------------------------------------
  // React y accesibilidad.
  // ---------------------------------------------------------------------
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { react, "react-hooks": reactHooks, "react-refresh": reactRefresh },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // SOLID, responsabilidad unica: un archivo describe un componente.
      "react/no-multi-comp": ["error", { ignoreStateless: false }],
      "react/jsx-no-useless-fragment": "error",
      "react/self-closing-comp": "error",
    },
  },
  { files: ["**/*.tsx"], ...jsxA11y.flatConfigs.recommended },

  // ---------------------------------------------------------------------
  // KISS y DRY: limites de tamano, complejidad y duplicacion.
  // ---------------------------------------------------------------------
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { sonarjs, "simple-import-sort": simpleImportSort },
    rules: {
      ...sonarjs.configs.recommended.rules,
      "sonarjs/no-identical-functions": "error",
      "sonarjs/no-duplicate-string": ["error", { threshold: 3 }],
      "sonarjs/no-collapsible-if": "error",
      "sonarjs/cognitive-complexity": ["error", 15],
      complexity: ["error", 10],
      "max-depth": ["error", 3],
      "max-lines": ["error", { max: 250, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true }],
      "max-params": ["error", 4],
      "max-nested-callbacks": ["error", 3],
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": ["error", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
    },
  },

  // ---------------------------------------------------------------------
  // Primitivas de UI (shadcn/Radix): cada archivo agrupa una familia de
  // componentes y exporta sus variantes junto al componente.
  // ---------------------------------------------------------------------
  {
    files: ["src/core/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react/no-multi-comp": "off",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true, allowExportNames: ["buttonVariants", "badgeVariants"] },
      ],
    },
  },

  // ---------------------------------------------------------------------
  // Fuentes unicas de iconos y de primitivas. Radix y Phosphor solo se usan
  // dentro de src/core/components; el resto usa <Icon name="..." /> y los
  // componentes de ui ya tematizados.
  // ---------------------------------------------------------------------
  {
    files: ["src/{app,features}/**/*.{ts,tsx}", "src/core/{auth,lib,theme}/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@phosphor-icons/react",
              message:
                'Los iconos salen del registro unico: usa <Icon name="..." /> y agrega el glifo en src/core/components/icon.tsx.',
            },
            {
              name: "radix-ui",
              message:
                "Usa el componente de src/core/components/ui, que ya envuelve la primitiva con el tema.",
            },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------
  // Nombrado de carpetas y archivos: kebab-case en todo src.
  // ---------------------------------------------------------------------
  {
    files: ["src/**/*"],
    plugins: { "check-file": checkFile },
    rules: {
      "check-file/folder-naming-convention": ["error", { "src/**/": "KEBAB_CASE" }],
      "check-file/filename-naming-convention": [
        "error",
        { "src/**/*.{ts,tsx}": "KEBAB_CASE" },
        { ignoreMiddleExtensions: true },
      ],
    },
  },

  // ---------------------------------------------------------------------
  // Limites de arquitectura. La composicion conoce a las features, las
  // features no se conocen entre si y core no conoce el dominio.
  // ---------------------------------------------------------------------
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "import/resolver": { typescript: { project: "./tsconfig.app.json" } },
      "boundaries/include": ["src/**/*.{ts,tsx}"],
      "boundaries/files": [
        { pattern: "src/main.tsx", category: "composition" },
        { pattern: "src/test-setup.ts", category: "composition" },
      ],
      "boundaries/elements": [
        { type: "app", pattern: "src/app" },
        { type: "features", pattern: "src/features/*", capture: ["feature"] },
        { type: "core", pattern: "src/core" },
      ],
    },
    rules: {
      "boundaries/no-unknown-dependencies": "error",
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          message:
            'La capa "{{from.element.types.[0]}}" no puede depender de "{{to.element.types.[0]}}". Sube lo compartido a src/core.',
          policies: [
            {
              from: [{ file: { categories: "composition" } }],
              allow: [
                { to: { element: { type: "app" } } },
                { to: { element: { type: "core" } } },
              ],
            },
            {
              from: [{ element: { type: "app" } }],
              allow: [
                { to: { element: { type: "app" } } },
                { to: { element: { type: "features" } } },
                { to: { element: { type: "core" } } },
              ],
            },
            {
              from: [{ element: { type: "features" } }],
              allow: [
                {
                  to: {
                    element: { type: "features", captured: { feature: "{{from.feature}}" } },
                  },
                },
                { to: { element: { type: "core" } } },
              ],
            },
            {
              from: [{ element: { type: "core" } }],
              allow: [{ to: { element: { type: "core" } } }],
            },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------
  // Comentarios: un comentario solo se gana su lugar si dice algo que el
  // codigo no puede decir. El linter cubre la higiene.
  // ---------------------------------------------------------------------
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-inline-comments": "error",
      "spaced-comment": ["error", "always", { markers: ["/"] }],
      "multiline-comment-style": ["error", "separate-lines", { checkJSDoc: false }],
      "no-warning-comments": ["error", { terms: ["fixme", "xxx", "hack"], location: "start" }],
    },
  },

  // Directivas que desactivan reglas: permitidas, pero estrechas y con motivo.
  comments.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: { "@eslint-community/eslint-comments/require-description": ["error", { ignore: [] }] },
  },

  // Sin barrel files: cada modulo se importa por su ruta real.
  ...noBarrelFiles.configs["flat/recommended"],

  // ---------------------------------------------------------------------
  // Tests: se permiten archivos largos y afirmaciones no nulas.
  // ---------------------------------------------------------------------
  {
    files: ["src/**/*.spec.{ts,tsx}", "src/test-setup.ts"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "max-lines": "off",
      "max-lines-per-function": "off",
      "max-nested-callbacks": "off",
      "sonarjs/no-duplicate-string": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },

  // Archivos de configuracion.
  {
    files: ["*.config.{js,ts}", "eslint.config.js"],
    languageOptions: { globals: globals.node },
    extends: [tseslint.configs.disableTypeChecked],
    rules: { "check-file/filename-naming-convention": "off" },
  },

  prettier,
);
