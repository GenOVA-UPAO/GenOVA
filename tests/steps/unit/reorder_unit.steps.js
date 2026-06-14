import assert from 'node:assert/strict'
import { Given, When, Then } from '@cucumber/cucumber'
import { allSamePhaseType, applyReorder } from '../../../frontend/src/lib/resourceReorder.js'

// HU-033 unit coverage — importa la lógica real de resourceReorder (usada por
// WorkspaceResourceList). Sin browser/backend.

// ── Reorder within phase ─────────────────────────────────────────────────────
Given('una fase con recursos en el orden {string}', function (csv) {
  this.items = csv.split(',').map((name) => ({ name: name.trim() }))
})

When('el estudiante arrastra el recurso del índice {int} al índice {int}', function (from, to) {
  this.result = applyReorder(this.items, from, to)
})

Then('el orden resultante es {string}', function (expected) {
  const actual = this.result.map((i) => i.name).join(',')
  assert.equal(actual, expected)
})

// ── Cross-phase validation ───────────────────────────────────────────────────
Given('reorders con phase_types {string} y {string}', function (t1, t2) {
  this.phaseTypes = [t1, t2]
})

When('se valida que todos pertenecen a la misma fase', function () {
  this.valid = allSamePhaseType(this.phaseTypes)
})

Then('la validación falla por tipos distintos', function () {
  assert.equal(this.valid, false)
})

Then('la validación pasa', function () {
  assert.equal(this.valid, true)
})
