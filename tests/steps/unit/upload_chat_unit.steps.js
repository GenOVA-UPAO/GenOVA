import assert from 'node:assert/strict'
import { Given, When, Then } from '@cucumber/cucumber'
import { validateFileAdd } from '../../../frontend/src/features/ova-workspace/lib/upload-chip-view-model'

// HU-024 unit coverage — pure upload chip viewmodel logic. No browser, no backend.

// ── Scenario: rechazo por límite ─────────────────────────────────────────────
Given('un estudiante con {int} archivos adjuntos', function (count) {
  this.existingCount = count
})

When('intenta adjuntar {int} archivo más', function (incoming) {
  this.validationError = validateFileAdd(this.existingCount, incoming)
})

Then('se produce un error indicando el límite de {int} archivos', function (limit) {
  assert.ok(this.validationError, 'debe haber error')
  assert.ok(this.validationError.includes(String(limit)), `error debe mencionar ${limit}`)
})

Then('el archivo no se adjunta', function () {
  assert.ok(this.validationError, 'validationError no nulo → no se adjunta')
})

// ── Scenario: sin error si no se supera límite ───────────────────────────────
When('intenta adjuntar {int} archivos más', function (incoming) {
  this.validationError = validateFileAdd(this.existingCount, incoming)
})

Then('no hay error de validación', function () {
  assert.equal(this.validationError, null)
})
