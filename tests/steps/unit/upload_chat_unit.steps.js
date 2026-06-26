import assert from 'node:assert/strict'
import { Given, When, Then } from '@cucumber/cucumber'
import {
  validateFileAdd,
  chipStatusLabel,
  toChipEntry,
} from '../../../frontend/src/features/ova_workspace/lib/uploadChipViewModel'

// HU-024 unit coverage — pure upload chip viewmodel logic. No browser, no backend.

// ── Scenario: adjuntar crea chip "subiendo" ──────────────────────────────────
Given('un estudiante sin archivos adjuntos', function () {
  this.existingCount = 0
})

When('adjunta un archivo llamado {string} de {int} bytes', function (name, size) {
  this.validationError = validateFileAdd(this.existingCount, 1)
  this.chip = this.validationError ? null : toChipEntry({ name, size })
})

Then('aparece un chip con nombre {string}', function (name) {
  assert.ok(this.chip, 'chip debe existir')
  assert.equal(this.chip.filename, name)
})

Then('el estado del chip se describe como {string}', function (label) {
  assert.equal(chipStatusLabel(this.chip.status), label)
})

// ── Scenario: chip "listo" tras éxito ───────────────────────────────────────
Given('un chip con estado {string}', function (status) {
  this.chipStatus = status
})

When('se obtiene su etiqueta de estado', function () {
  this.label = chipStatusLabel(this.chipStatus)
})

Then('la etiqueta de estado es {string}', function (expected) {
  assert.equal(this.label, expected)
})

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
