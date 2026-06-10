import assert from 'node:assert/strict'
import { Given, When, Then } from '@cucumber/cucumber'

// HU-030 unit coverage — workspace URL + version label logic (pure, no browser).

function workspaceUrl(ovaId) {
  return `/ova/${ovaId}/workspace`
}

function versionLabel(versionNumber) {
  if (!versionNumber) return null
  return `v${versionNumber}`
}

// ── Workspace URL ────────────────────────────────────────────────────────────
Given('un OVA con id {string}', function (id) {
  this.ovaId = id
})

When('se construye la URL de edición', function () {
  this.url = workspaceUrl(this.ovaId)
})

Then('la URL es {string}', function (expected) {
  assert.equal(this.url, expected)
})

// ── Version label ────────────────────────────────────────────────────────────
Given('un OVA con version_number {int}', function (vn) {
  this.versionNumber = vn
})

Given('un OVA sin version_number', function () {
  this.versionNumber = null
})

When('se renderiza la etiqueta de versión', function () {
  this.label = versionLabel(this.versionNumber)
})

Then('la etiqueta de versión es {string}', function (expected) {
  assert.equal(this.label, expected)
})

Then('no hay etiqueta de versión', function () {
  assert.equal(this.label, null)
})
