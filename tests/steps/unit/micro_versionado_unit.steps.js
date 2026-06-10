import assert from 'node:assert/strict'
import { Given, When, Then } from '@cucumber/cucumber'

// HU-029 unit coverage — micro-version numbering logic. No browser, no backend.

function nextMinorNumber(existingMvs) {
  if (!existingMvs.length) return 1
  return Math.max(...existingMvs.map((mv) => mv.minor_number)) + 1
}

function sortMvsDesc(mvs) {
  return [...mvs].sort((a, b) => b.minor_number - a.minor_number)
}

// ── Next minor number ────────────────────────────────────────────────────────
Given('un recurso sin micro-versiones previas', function () {
  this.mvs = []
})

Given('un recurso con {int} micro-versiones previas', function (count) {
  this.mvs = Array.from({ length: count }, (_, i) => ({ minor_number: i + 1 }))
})

When('se calcula el siguiente número de micro-versión', function () {
  this.nextMinor = nextMinorNumber(this.mvs)
})

Then('el número de micro-versión es {int}', function (expected) {
  assert.equal(this.nextMinor, expected)
})

// ── Sort desc ────────────────────────────────────────────────────────────────
Given('micro-versiones con números {int}, {int} y {int}', function (a, b, c) {
  this.mvs = [{ minor_number: a }, { minor_number: b }, { minor_number: c }]
})

When('se ordenan las micro-versiones de más reciente a más antigua', function () {
  this.sortedMvs = sortMvsDesc(this.mvs)
})

Then('el primer elemento tiene minor_number {int}', function (expected) {
  assert.equal(this.sortedMvs[0].minor_number, expected)
})
