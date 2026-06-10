import assert from 'node:assert/strict'
import { Given, When, Then } from '@cucumber/cucumber'

// HU-027 unit coverage — pure resource selection logic. No browser, no backend.

function toggleSelection(ids, phaseId) {
  return ids.includes(phaseId) ? ids.filter((id) => id !== phaseId) : [...ids, phaseId]
}

function buildFaseIds(selected) {
  return selected.length > 0 ? [...selected] : []
}

// ── Toggle selection ─────────────────────────────────────────────────────────
Given('no hay recursos seleccionados', function () {
  this.selected = []
})

Given('el recurso {string} está seleccionado', function (id) {
  this.selected = [id]
})

Given('los recursos {string} y {string} están seleccionados', function (a, b) {
  this.selected = [a, b]
})

When('el usuario marca el recurso {string}', function (id) {
  this.selected = toggleSelection(this.selected, id)
})

When('el usuario desmarca el recurso {string}', function (id) {
  this.selected = toggleSelection(this.selected, id)
})

Then('{string} está en la lista de seleccionados', function (id) {
  assert.ok(this.selected.includes(id))
})

Then('la lista de seleccionados está vacía', function () {
  assert.equal(this.selected.length, 0)
})

// ── Regen call ───────────────────────────────────────────────────────────────
When('se construye la llamada al regen', function () {
  this.faseIds = buildFaseIds(this.selected)
})

Then('fase_ids está vacío', function () {
  assert.equal(this.faseIds.length, 0)
})

Then('fase_ids contiene {string} y {string}', function (a, b) {
  assert.ok(this.faseIds.includes(a))
  assert.ok(this.faseIds.includes(b))
})
