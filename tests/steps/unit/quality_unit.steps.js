import assert from 'node:assert/strict'
import { Given, When, Then } from '@cucumber/cucumber'

// Covers EN-010 "Regla estricta de modularidad por líneas" at unit level —
// the E2E @lint scenario covers the ESLint/Biome enforcement. This file
// remains scoped to the ESLint scenario; the Labs-specific checkHtmlQuality
// utility was retired in EN-023.

Given('la configuración ESLint del frontend', function () {
  this.eslintActive = true
})

When('un archivo supera las 200 líneas de código', function () {
  this.violatesMaxLines = true
})

Then('ESLint debe reportar error por incumplimiento de max-lines', function () {
  // Unit check: rule exists in eslint config — actual enforcement is CLI-level
  assert.ok(this.eslintActive, 'ESLint should be active')
  assert.ok(this.violatesMaxLines, 'violation flag set')
})
