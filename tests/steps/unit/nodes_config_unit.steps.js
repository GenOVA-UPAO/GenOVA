import assert from 'node:assert/strict'
import { Given, When, Then } from '@cucumber/cucumber'
import {
  criticRoundsVisible,
  hasUnsavedChanges,
  isVideoResource,
} from '../../../frontend/src/core/lib/nodesConfigDraft.js'

// Draft state helpers for PlatformNodesCard (no browser/backend).

Given('un draft de nodos con ova_critic {string}', function (val) {
  this.draft = { ova_critic: val, ova_images: '1', ova_refine: '1', ova_editor: '0' }
})

Then('criticRoundsVisible retorna true', function () {
  assert.equal(criticRoundsVisible(this.draft), true)
})

Then('criticRoundsVisible retorna false', function () {
  assert.equal(criticRoundsVisible(this.draft), false)
})

Given('un config server con ova_critic {string}', function (val) {
  this.serverConfig = {
    ova_critic: val,
    ova_images: '1',
    ova_refine: '1',
    ova_editor: '0',
    ova_reflection_rounds: 1,
  }
})

Given('un draft modificado con ova_critic {string}', function (val) {
  this.draft = { ...this.serverConfig, ova_critic: val }
})

Given('un draft sin cambios de flags', function () {
  this.draft = { ...this.serverConfig }
})

When('comparo draft con config server y rounds {int}', function (rounds) {
  this.result = hasUnsavedChanges(this.draft, this.serverConfig, rounds)
})

Then('hasUnsavedChanges retorna true', function () {
  assert.equal(this.result, true)
})

When('verifico si {word} recurso id {int} es video', function (phase, id) {
  this.result = isVideoResource(phase, id)
})

Then('isVideoResource retorna true', function () {
  assert.equal(this.result, true)
})

Then('isVideoResource retorna false', function () {
  assert.equal(this.result, false)
})
