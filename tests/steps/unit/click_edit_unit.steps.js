import assert from 'node:assert/strict'
import { Given, When, Then } from '@cucumber/cucumber'

// HU-026 unit coverage — pure validation logic. No browser, no backend.

function canDelete(phases) {
  return phases.length > 1
}

function removePhase(phases, idx) {
  return phases.filter((_, i) => i !== idx)
}

function isValidContent(content) {
  return typeof content === 'string' && content.trim().length > 0
}

// ── Delete validation ────────────────────────────────────────────────────────
Given('una versión con {int} fase', function (count) {
  this.phases = Array.from({ length: count }, (_, i) => ({ id: `p${i}` }))
})

Given('una versión con {int} fases', function (count) {
  this.phases = Array.from({ length: count }, (_, i) => ({ id: `p${i}` }))
})

When('se intenta eliminar la única fase', function () {
  this.canDelete = canDelete(this.phases)
})

When('se elimina la fase del índice {int}', function (idx) {
  this.result = removePhase(this.phases, idx)
})

Then('la eliminación es rechazada por ser la última', function () {
  assert.equal(this.canDelete, false)
})

Then('quedan {int} fases', function (expected) {
  assert.equal(this.result.length, expected)
})

// ── Content validation ───────────────────────────────────────────────────────
Given('un recurso con contenido {string}', function (content) {
  this.content = content
})

When('se edita con contenido vacío', function () {
  this.valid = isValidContent('')
})

When('se edita con contenido {string}', function (content) {
  this.valid = isValidContent(content)
})

Then('la edición es inválida', function () {
  assert.equal(this.valid, false)
})

Then('la edición es válida', function () {
  assert.equal(this.valid, true)
})
