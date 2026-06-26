import assert from 'node:assert/strict'
import { Given, When, Then } from '@cucumber/cucumber'
import {
  addFallback,
  moveFallback,
  removeFallback,
  toPayload,
} from '../../../frontend/src/core/lib/llm/llmConfigDraft'

// Lógica del panel admin de modelos LLM (sin browser/backend).
// Importa el código real de frontend/src/lib/llmConfigDraft.js.

// "provider:model_id" → entry ; "" → entry vacía
function parseEntry(token) {
  const [provider = '', model_id = ''] = token.split(':')
  return { provider, model_id, extra: {} }
}
function parseList(csv) {
  return csv ? csv.split(',').map(parseEntry) : []
}
function fmtList(list) {
  return list.map((e) => `${e.provider}:${e.model_id}`).join(',')
}

Given('una cadena de fallback {string}', function (csv) {
  this.list = parseList(csv)
})

When('muevo el fallback en índice {int} con dirección {int}', function (i, dir) {
  this.list = moveFallback(this.list, i, dir)
})

When('agrego un fallback vacío', function () {
  this.list = addFallback(this.list)
})

When('quito el fallback en índice {int}', function (i) {
  this.list = removeFallback(this.list, i)
})

Then('la cadena resultante es {string}', function (expected) {
  assert.equal(fmtList(this.list), expected)
})

Then('la cadena tiene {int} elementos', function (n) {
  assert.equal(this.list.length, n)
})

Given(
  'un draft de tarea {string} con primario {string} y fallbacks {string}',
  function (task, primary, fallbacksCsv) {
    this.task = task
    this.draft = {
      [task]: { default: parseEntry(primary), fallbacks: parseList(fallbacksCsv) },
    }
  },
)

When('construyo el payload', function () {
  this.payload = toPayload(this.draft, [this.task])
})

Then('el payload tiene default {string} para {string}', function (expected, task) {
  const d = this.payload.defaults[task]
  assert.equal(`${d.provider}:${d.model_id}`, expected)
})

Then('el payload tiene {int} fallback para {string}', function (n, task) {
  assert.equal((this.payload.fallbacks[task] ?? []).length, n)
})

Then('el payload no incluye {string} en defaults', function (task) {
  assert.equal(task in this.payload.defaults, false)
})
