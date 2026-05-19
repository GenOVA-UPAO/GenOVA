import { useEffect, useState } from 'react'
import { fetchEngageRecursos } from '../services/engageService.js'
import { fetchExploreRecursos } from '../services/exploreService.js'
import { ResourceCard } from './engage/ResourceCard.jsx'

const PHASES = [
  { key: 'engage', emoji: '🎯', label: 'ENGAGE', fetch: fetchEngageRecursos },
  { key: 'explore', emoji: '🔍', label: 'EXPLORE', fetch: fetchExploreRecursos },
]

export function PhaseSelectModal({ isOpen, onClose, onConfirm, initialEngage, initialExplore }) {
  const [step, setStep] = useState(0)
  const [recursos, setRecursos] = useState({ engage: [], explore: [] })
  const [loading, setLoading] = useState(true)
  const [picks, setPicks] = useState({ engage: null, explore: null })

  useEffect(() => {
    if (!isOpen) return
    setStep(0)
    setPicks({ engage: initialEngage ?? null, explore: initialExplore ?? null })
    setLoading(true)
    Promise.all([fetchEngageRecursos(), fetchExploreRecursos()])
      .then(([e, ex]) => setRecursos({ engage: e.recursos ?? [], explore: ex.recursos ?? [] }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null

  const phase = PHASES[step]
  const currentPick = picks[phase.key]
  const currentList = recursos[phase.key]
  const isLast = step === PHASES.length - 1

  function selectResource(r) {
    setPicks(prev => ({ ...prev, [phase.key]: r }))
  }

  function handleNext() {
    if (!isLast) {
      setStep(s => s + 1)
    } else if (picks.engage && picks.explore) {
      onConfirm({ engage: picks.engage, explore: picks.explore })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-0.5">
              Paso {step + 1} de {PHASES.length}
            </p>
            <h2 className="text-lg font-semibold text-slate-900">
              {phase.emoji} Fase {phase.label}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl leading-none"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Stepper bar */}
        <div className="flex gap-2 px-5 pt-4 pb-1">
          {PHASES.map((p, i) => (
            <div
              key={p.key}
              className={`flex-1 h-1.5 rounded-full transition-colors duration-300 ${
                i <= step ? 'bg-indigo-500' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Resource grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentList.map(r => (
                <ResourceCard
                  key={r.id}
                  resource={r}
                  selected={currentPick?.id === r.id}
                  onClick={selectResource}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 p-5 border-t border-slate-200">
          <button
            onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            {step === 0 ? 'Cancelar' : '← Atrás'}
          </button>
          <button
            onClick={handleNext}
            disabled={!currentPick}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLast ? 'Confirmar ✓' : 'Siguiente →'}
          </button>
        </div>

      </div>
    </div>
  )
}
