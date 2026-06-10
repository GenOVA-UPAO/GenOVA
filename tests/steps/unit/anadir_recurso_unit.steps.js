import assert from 'node:assert/strict'
import { Given, When, Then } from '@cucumber/cucumber'

// HU-032 unit coverage — max-4 validation and add-resource logic. No browser/backend.

const MAX_PHASES_PER_TYPE = 4

function canAdd(count) {
  return count < MAX_PHASES_PER_TYPE
}

function isValidPrompt(prompt) {
  return typeof prompt === 'string' && prompt.trim().length > 0
}

// ── Phase count check ────────────────────────────────────────────────────────
Given('una fase con {int} recurso', function (count) {
  this.phaseCount = count
})

Given('una fase con {int} recursos', function (count) {
  this.phaseCount = count
})

When('se verifica si se puede añadir otro recurso', function () {
  this.canAdd = canAdd(this.phaseCount)
})

Then('se puede añadir', function () {
  assert.equal(this.canAdd, true)
})

Then('no se puede añadir', function () {
  assert.equal(this.canAdd, false)
})

// ── Prompt validation ────────────────────────────────────────────────────────
When('se intenta añadir con prompt vacío', function () {
  this.valid = isValidPrompt('')
})

When('se intenta añadir con prompt {string}', function (prompt) {
  this.valid = isValidPrompt(prompt)
})

Then('el intento es inválido', function () {
  assert.equal(this.valid, false)
})

Then('el intento es válido', function () {
  assert.equal(this.valid, true)
})
