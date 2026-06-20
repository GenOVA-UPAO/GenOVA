import assert from 'node:assert/strict'
import { Given, When, Then } from '@cucumber/cucumber'
import { clampRatio } from '../../../frontend/src/core/lib/workspaceUtils.js'

// HU-025 unit coverage — split ratio clamping (importa el código real de
// workspaceUtils, usado por WorkspaceResizableDivider; sin browser).

// ── Ratio clamping ───────────────────────────────────────────────────────────
Given('un drag hasta una posición de ratio {float}', function (ratio) {
  this.inputRatio = ratio
})

When('se clampea el ratio', function () {
  this.clampedRatio = clampRatio(this.inputRatio)
})

Then('el ratio resultante es {float}', function (expected) {
  assert.ok(
    Math.abs(this.clampedRatio - expected) < 0.001,
    `expected ${expected}, got ${this.clampedRatio}`
  )
})

// ── OVA title display ────────────────────────────────────────────────────────
Given('un OVA con título {string}', function (title) {
  this.ova = { title, status: 'listo' }
})

When('se carga el workspace', function () {
  this.displayTitle = this.ova?.title ?? 'Cargando…'
})

Then('el título visible es {string}', function (expected) {
  assert.equal(this.displayTitle, expected)
})
