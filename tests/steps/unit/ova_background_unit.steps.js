import assert from 'node:assert/strict'
import { Given, When, Then } from '@cucumber/cucumber'

// HU-023 unit coverage — job progress logic (pure functions, no browser/backend).
// Tests the same computation that useJobByOva.js performs.

const TERMINAL = new Set(['done', 'error', 'interrupted'])

function calcProgress(resources) {
  if (!resources?.length) return null
  const total = resources.length
  const done = resources.filter((r) => r.status === 'done').length
  return { done, total }
}

function needsPolling(status) {
  return !TERMINAL.has(status)
}

// ── Scenario: progreso N de M ────────────────────────────────────────────────
Given('un job con {int} recursos donde {int} están {string}', function (total, done, doneStatus) {
  this.resources = Array.from({ length: total }, (_, i) => ({
    id: `r${i}`,
    status: i < done ? doneStatus : 'pending',
  }))
})

When('se calcula el progreso del job', function () {
  this.progress = calcProgress(this.resources)
})

Then('el progreso muestra {int} de {int}', function (done, total) {
  assert.equal(this.progress.done, done)
  assert.equal(this.progress.total, total)
})

// ── Scenario: terminal no hace polling ───────────────────────────────────────
Given('un job con status {string}', function (status) {
  this.jobStatus = status
})

When('se evalúa si el job requiere polling', function () {
  this.requiresPolling = needsPolling(this.jobStatus)
})

Then('el job no requiere polling', function () {
  assert.equal(this.requiresPolling, false)
})

Then('el job requiere polling', function () {
  assert.equal(this.requiresPolling, true)
})

// ── Scenario: job interrumpido ───────────────────────────────────────────────
When('se evalúa si el job está interrumpido', function () {
  this.isInterrupted = this.jobStatus === 'interrupted'
})

Then('el job está interrumpido', function () {
  assert.equal(this.isInterrupted, true)
})
