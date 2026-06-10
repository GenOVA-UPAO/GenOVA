import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'max-lines': [
        'error',
        {
          max: 200,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
  {
    // shadcn/ui generated files export both components and CVA variant constants
    files: ['**/components/ui/*.{js,jsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['**/AdminUsersPage.jsx', '**/useUsersAdmin.js'],
    rules: {
      'max-lines': 'off',
    },
  },
  {
    // Wireframes temporales (implementer FASE 0): exentos de max-lines.
    // Se eliminan tras la implementación real; no llegan a producción.
    files: ['**/wireframes/**/*.jsx'],
    rules: {
      'max-lines': 'off',
    },
  },
])

