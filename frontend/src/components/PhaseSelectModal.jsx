import { useEffect, useState } from 'react'
import { fetchEngageRecursos } from '../services/engageService.js'
import { fetchExploreRecursos } from '../services/exploreService.js'
import { ResourceCard } from './engage/ResourceCard.jsx'

const PHASES = [
  { key: 'engage', emoji: '🎯', label: 'ENGAGE', fetch: fetchEngageRecursos },
  { key: 'explore', emoji: '🔍', label: 'EXPLORE', fetch: fetchExploreRecursos },
]

export const MAX_PER_PHASE = 4

function toggleSelection(list, resource) {
  const idx = list.findIndex((r) => r.id === resource.id)
  if (idx >= 0) {
    return list.filter((_, i) => i !== idx)
  }
  if (list.length >= MAX_PER_PHASE) return list
  return [...list, resource]
}

export function PhaseSelectModal({ onClose, onConfirm, initialEngage, initialExplore }) {
  const [step, setStep] = useState(0)
  const [recursos, setRecursos] = useState({ engage: [], explore: [] })
  const [loading, setLoading] = useState(true)
  const [picks, setPicks] = useState({
    engage: Array.isArray(initialEngage) ? initialEngage : [],
    explore: Array.isArray(initialExplore) ? initialExplore : [],
  })

  useEffect(() => {
    Promise.all([fetchEngageRecursos(), fetchExploreRecursos()])
      .then(([e, ex]) => setRecursos({ engage: e.recursos ?? [], explore: ex.recursos ?? [] }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const phase = PHASES[step]
  const currentPicks = picks[phase.key]
  const currentList = recursos[phase.key]
  const isLast = step === PHASES.length - 1
  const canAdvance = currentPicks.length > 0
  const limitReached = currentPicks.length >= MAX_PER_PHASE

  function selectResource(r) {
    setPicks((prev) => ({ ...prev, [phase.key]: toggleSelection(prev[phase.key], r) }))
  }

  function handleNext() {
    if (!isLast) {
      setStep((s) => s + 1)
    } else if (picks.engage.length && picks.explore.length) {
      onConfirm({ engage: picks.engage, explore: picks.explore })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full max-w-3xl sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col">
        <header className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-slate-200">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-slate-500 uppercase tracking-wide font-medium mb-0.5">
              Paso {step + 1} de {PHASES.length}
            </p>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate">
              {phase.emoji} Fase {phase.label}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Elige <b>1 a {MAX_PER_PHASE}</b> recursos · seleccionados{' '}
              <span className={limitReached ? 'text-amber-600 font-semibold' : 'text-indigo-600 font-semibold'}>
                {currentPicks.length}/{MAX_PER_PHASE}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>

        <div className="flex gap-2 px-4 sm:px-5 pt-3 pb-1">
          {PHASES.map((p, i) => (
            <div
              key={p.key}
              className={`flex-1 h-1.5 rounded-full transition-colors duration-300 ${
                i <= step ? 'bg-indigo-500' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentList.map((r) => {
                const orderIdx = currentPicks.findIndex((p) => p.id === r.id)
                const selected = orderIdx >= 0
                const disabled = !selected && limitReached
                return (
                  <ResourceCard
                    key={r.id}
                    resource={r}
                    selected={selected}
                    selectionIndex={selected ? orderIdx + 1 : null}
                    disabled={disabled}
                    onClick={selectResource}
                  />
                )
              })}
            </div>
          )}
        </div>

        <footer className="flex justify-between items-center gap-3 p-4 sm:p-5 border-t border-slate-200">
          <button
            onClick={step === 0 ? onClose : () => setStep((s) => s - 1)}
            className="px-3 sm:px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            {step === 0 ? 'Cancelar' : '← Atrás'}
          </button>
          <button
            onClick={handleNext}
            disabled={!canAdvance}
            className="px-4 sm:px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLast ? `Confirmar (${picks.engage.length}+${picks.explore.length}) ✓` : 'Siguiente →'}
          </button>
        </footer>
      </div>
    </div>
  )
}
