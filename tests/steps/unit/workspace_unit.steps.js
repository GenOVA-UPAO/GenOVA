import assert from 'node:assert/strict'
import { Given, When, Then } from '@cucumber/cucumber'

// HU-025 unit coverage — split ratio clamping logic (pure, no browser).
// Mirrors the clamping logic in WorkspaceResizableDivider.jsx.

const MIN_RATIO = 0.2
const MAX_RATIO = 0.8

function clampRatio(r) {
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, r))
}

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
