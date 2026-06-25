// HU-022 — pure mapping from a job's backend resources to a UI viewmodel.
// No React, no fetch: fully testable in the cucumber-js unit suite.
//
// Backend resource status → UI status:
//   running → 'generando' · error → 'X' · done → 'check' · pending → 'pendiente'
// Anything unknown falls back to 'pendiente'.

const STATUS_MAP = {
  pending: 'pendiente',
  running: 'generando',
  done: 'check',
  error: 'X',
}

const PHASE_LABEL = {
  engage: 'ENGAGE', explore: 'EXPLORE', explain: 'EXPLAIN',
  elaborate: 'ELABORATE', evaluate: 'EVALUATE',
}

export function mapResourceStatus(backendStatus) {
  return STATUS_MAP[backendStatus] || 'pendiente'
}

// Build a label index keyed by `${phase}:${resource_type}` from the modal
// selections so the viewmodel can show a friendly name + emoji per resource.
function buildLabelIndex(selections) {
  const index = new Map()
  for (const phase of Object.keys(PHASE_LABEL)) {
    for (const r of selections[phase] || []) {
      index.set(`${phase}:${String(r.id)}`, { tipo: r.tipo, emoji: r.emoji })
    }
  }
  return index
}

// Map the raw `resources` array from GET /jobs/{id} into the per-resource
// viewmodel: { id, phase, phaseLabel, label, emoji, status, error_id, selectable }.
// `selectable` is true only for resources in `error` (the ones the user may retry).
export function toResourceViewModel(resources = [], selections = {}) {
  const labels = buildLabelIndex(selections)
  return resources
    .slice()
    .sort((a, b) => (a.phase_order - b.phase_order) || (a.resource_order - b.resource_order))
    .map((r) => {
      const phase = r.phase_type
      const meta = labels.get(`${phase}:${String(r.resource_type)}`) || {}
      const status = mapResourceStatus(r.status)
      return {
        id: String(r.id),
        phase,
        phaseLabel: PHASE_LABEL[phase] || phase,
        label: meta.tipo || `Recurso ${r.resource_type ?? ''}`.trim(),
        emoji: meta.emoji || '',
        status,
        error_id: r.error_id || null,
        selectable: status === 'X',
      }
    })
}

// Ids of resources currently in error (the retryable set).
export function failedResourceIds(viewModel = []) {
  return viewModel.filter((r) => r.status === 'X').map((r) => r.id)
}

// Keep a selection in sync with the failed set: drop ids that are no longer
// failed (e.g. they succeeded after a retry). Returns a new array.
export function pruneSelection(selectedIds = [], viewModel = []) {
  const failed = new Set(failedResourceIds(viewModel))
  return selectedIds.filter((id) => failed.has(id))
}

// Group the viewmodel by phase, preserving order, for rendering the resource list.
export function groupByPhase(viewModel = []) {
  const groups = new Map()
  for (const r of viewModel) {
    if (!groups.has(r.phase)) groups.set(r.phase, { phase: r.phase, phaseLabel: r.phaseLabel, items: [] })
    groups.get(r.phase).items.push(r)
  }
  return [...groups.values()]
}

// Overall outcome derived from the job + its resources (no React).
// Returns { isTerminal, anyDone, totalFail } so callers avoid recomputing.
const TERMINAL = new Set(['done', 'error', 'interrupted', 'canceled'])

export function jobOutcome(job, viewModel = []) {
  const status = job?.status || 'queued'
  const anyDone = viewModel.some((r) => r.status === 'check')
  return {
    isTerminal: TERMINAL.has(status),
    anyDone,
    totalFail: TERMINAL.has(status) && !anyDone,
  }
}
