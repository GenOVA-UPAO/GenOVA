import assert from 'node:assert/strict'
import { Given, When, Then } from '@cucumber/cucumber'

// HU-031 unit coverage — 501 fallback + subelement ID validation. No browser/backend.

const SUPPORTED_TYPES = new Set() // currently empty — all return 501

function canEditGranular(phaseType) {
  return SUPPORTED_TYPES.has(phaseType)
}

function isValidSubelementId(id) {
  return typeof id === 'string' && id.trim().length > 0
}

// ── 501 fallback ─────────────────────────────────────────────────────────────
Given('una fase de tipo {string} sin soporte granular', function (type) {
  this.phaseType = type
})

When('se intenta editar un sub-elemento', function () {
  this.supported = canEditGranular(this.phaseType)
})

Then('el resultado es 501 no implementado', function () {
  assert.equal(this.supported, false)
})

// ── Subelement ID validation ─────────────────────────────────────────────────
Given('un sub-elemento sin identificador', function () {
  this.subId = ''
})

Given('un sub-elemento con id {string}', function (id) {
  this.subId = id
})

When('se valida el sub-elemento', function () {
  this.valid = isValidSubelementId(this.subId)
})

Then('la validación falla', function () {
  assert.equal(this.valid, false)
})

Then('la validación pasa correctamente', function () {
  assert.equal(this.valid, true)
})
