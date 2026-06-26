import assert from 'node:assert/strict'
import { Given, When, Then } from '@cucumber/cucumber'
import {
  toResourceViewModel,
  failedResourceIds,
  pruneSelection,
  jobOutcome,
} from '../../../frontend/src/features/ova_workspace/lib/ovaJobViewModel'

// HU-022 unit coverage for the pure job→viewmodel mapping + failed selection
// (frontend/src/lib/ovaJobViewModel.js). No browser, no backend.

function res(id, phase, rtype, status, extra = {}) {
  return {
    id,
    phase_type: phase,
    phase_order: phase === 'engage' ? 1 : 2,
    resource_type: rtype,
    resource_order: extra.order ?? 0,
    status,
    error_id: extra.error_id ?? null,
  }
}

// ── Scenario: estados backend → UI ───────────────────────────────────────────
Given('un job con recursos en estados {string}', function (statuses) {
  const list = statuses.split(',').map((s) => s.trim())
  this.resources = list.map((st, i) => res(`r${i}`, 'engage', String(i + 1), st, { order: i }))
  this.selections = { engage: [], explore: [] }
})

When('se construye el viewmodel de recursos', function () {
  this.viewModel = toResourceViewModel(this.resources, this.selections)
})

Then('los estados de UI son {string} en orden', function (expected) {
  const want = expected.split(',').map((s) => s.trim())
  const got = this.viewModel.map((r) => r.status)
  assert.deepEqual(got, want)
})

Then('solo el recurso en error es seleccionable', function () {
  const selectable = this.viewModel.filter((r) => r.selectable)
  assert.equal(selectable.length, 1)
  assert.equal(selectable[0].status, 'X')
})

// ── Scenario: error_id + etiqueta del catálogo ───────────────────────────────
Given('un recurso {string} con error_id {string} del tipo {string}', function (status, errId, tipo) {
  this.resources = [res('rx', 'explore', '5', status, { error_id: errId })]
  this.selections = { engage: [], explore: [{ id: '5', tipo, emoji: '📊' }] }
})

Then('ese recurso muestra la etiqueta {string} y el error_id {string}', function (tipo, errId) {
  const vm = this.viewModel[0]
  assert.equal(vm.label, tipo)
  assert.equal(vm.error_id, errId)
})

// ── Scenario: seleccionar todos los fallidos ─────────────────────────────────
Given('un job con dos recursos en error y uno done', function () {
  this.resources = [
    res('e1', 'engage', '1', 'error', { order: 0 }),
    res('e2', 'engage', '2', 'error', { order: 1 }),
    res('d1', 'explore', '3', 'done', { order: 0 }),
  ]
  this.selections = { engage: [], explore: [] }
  this.viewModel = toResourceViewModel(this.resources, this.selections)
})

When('se piden los ids de los recursos fallidos', function () {
  this.failed = failedResourceIds(this.viewModel)
})

Then('se obtienen exactamente los dos recursos en error', function () {
  assert.deepEqual([...this.failed].sort(), ['e1', 'e2'])
})

// ── Scenario: depurar selección cuando un fallido pasa a done ─────────────────
Given('una selección con un id que ya quedó en estado done', function () {
  this.resources = [
    res('a', 'engage', '1', 'done', { order: 0 }),
    res('b', 'engage', '2', 'error', { order: 1 }),
  ]
  this.viewModel = toResourceViewModel(this.resources, { engage: [], explore: [] })
  this.selection = ['a', 'b']
})

When('se depura la selección contra el viewmodel', function () {
  this.pruned = pruneSelection(this.selection, this.viewModel)
})

Then('ese id ya no está en la selección', function () {
  assert.ok(!this.pruned.includes('a'))
  assert.deepEqual(this.pruned, ['b'])
})

// ── Scenario: fallo total ─────────────────────────────────────────────────────
Given('un job terminado en error sin recursos done', function () {
  this.job = { status: 'error' }
  this.resources = [
    res('a', 'engage', '1', 'error', { order: 0 }),
    res('b', 'explore', '2', 'error', { order: 0 }),
  ]
  this.viewModel = toResourceViewModel(this.resources, { engage: [], explore: [] })
})

When('se evalúa el resultado del job', function () {
  this.outcome = jobOutcome(this.job, this.viewModel)
})

Then('el resultado indica fallo total', function () {
  assert.equal(this.outcome.isTerminal, true)
  assert.equal(this.outcome.totalFail, true)
})

Then('no hay recursos done para previsualizar', function () {
  assert.equal(this.outcome.anyDone, false)
  assert.equal(this.viewModel.some((r) => r.status === 'check'), false)
})
