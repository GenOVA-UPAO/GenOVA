import assert from 'node:assert/strict'
import { Given, When, Then } from '@cucumber/cucumber'
import {
  findActiveVersion as findActive,
  sortVersionsDesc as sortDesc,
} from '../../../frontend/src/core/lib/ovaVersioning.js'

// HU-028 unit coverage — importa la lógica real de ovaVersioning (usada por
// VersionHistoryPanel). Sin browser/backend.

// ── Active version ───────────────────────────────────────────────────────────
Given('un historial con versiones {int}, {int} y {int} donde la activa es la {int}', function (v1, v2, v3, active) {
  this.versions = [
    { id: `id${v1}`, version_number: v1, is_active: v1 === active },
    { id: `id${v2}`, version_number: v2, is_active: v2 === active },
    { id: `id${v3}`, version_number: v3, is_active: v3 === active },
  ]
})

When('se busca la versión activa', function () {
  this.activeVersion = findActive(this.versions)
})

Then('la versión activa es la {int}', function (expected) {
  assert.equal(this.activeVersion?.version_number, expected)
})

// ── Sort ─────────────────────────────────────────────────────────────────────
Given('un historial con versiones {int}, {int} y {int}', function (v1, v2, v3) {
  this.versions = [
    { id: `id${v1}`, version_number: v1, is_active: false },
    { id: `id${v2}`, version_number: v2, is_active: true },
    { id: `id${v3}`, version_number: v3, is_active: false },
  ]
})

When('se ordenan de más reciente a más antigua', function () {
  this.sorted = sortDesc(this.versions)
})

Then('el orden es {int}, {int}, {int}', function (a, b, c) {
  assert.deepEqual(
    this.sorted.map((v) => v.version_number),
    [a, b, c]
  )
})

// ── Diff selection ───────────────────────────────────────────────────────────
When('el usuario selecciona las versiones {int} y {int}', function (a, b) {
  this.selected = [
    this.versions.find((v) => v.version_number === a)?.id,
    this.versions.find((v) => v.version_number === b)?.id,
  ].filter(Boolean)
})

Then('hay dos versiones seleccionadas para diff', function () {
  assert.equal(this.selected.length, 2)
})
