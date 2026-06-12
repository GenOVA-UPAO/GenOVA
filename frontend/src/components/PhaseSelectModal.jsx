import { useEffect, useState } from 'react'
import { fetchEngageRecursos } from '../services/engageService.js'
import { fetchExploreRecursos } from '../services/exploreService.js'
import { fetchExplainRecursos } from '../services/explainService.js'
import { fetchElaborateRecursos } from '../services/elaborateService.js'
import { fetchEvaluateRecursos } from '../services/evaluateService.js'
import { ResourceCard } from './engage/ResourceCard.jsx'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const PHASES = [
  { key: 'engage',    emoji: '🎯', label: 'ENGAGE',    fetch: fetchEngageRecursos },
  { key: 'explore',   emoji: '🔍', label: 'EXPLORE',   fetch: fetchExploreRecursos },
  { key: 'explain',   emoji: '💡', label: 'EXPLAIN',   fetch: fetchExplainRecursos },
  { key: 'elaborate', emoji: '🔧', label: 'ELABORATE', fetch: fetchElaborateRecursos },
  { key: 'evaluate',  emoji: '✅', label: 'EVALUATE',  fetch: fetchEvaluateRecursos },
]

export const MAX_PER_PHASE = 4

const EMPTY_PICKS = () =>
  Object.fromEntries(PHASES.map((p) => [p.key, []]))

function toggleSelection(list, resource) {
  const idx = list.findIndex((r) => r.id === resource.id)
  if (idx >= 0) return list.filter((_, i) => i !== idx)
  if (list.length >= MAX_PER_PHASE) return list
  return [...list, resource]
}

export function PhaseSelectModal({ onClose, onConfirm, initialSelections }) {
  const [step, setStep] = useState(0)
  const [recursos, setRecursos] = useState(EMPTY_PICKS())
  const [loading, setLoading] = useState(true)
  const [picks, setPicks] = useState(() => ({
    ...EMPTY_PICKS(),
    ...(initialSelections ?? {}),
  }))

  useEffect(() => {
    Promise.all(PHASES.map((p) => p.fetch()))
      .then((results) => {
        const next = {}
        PHASES.forEach((p, i) => { next[p.key] = results[i].recursos ?? [] })
        setRecursos(next)
      })
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
    } else if (PHASES.every((p) => picks[p.key].length > 0)) {
      onConfirm(picks)
    }
  }

  const total = PHASES.reduce((s, p) => s + picks[p.key].length, 0)

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="top-auto bottom-0 left-0 right-0 w-full max-w-full translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none sm:top-[50%] sm:bottom-auto sm:left-[50%] sm:right-auto sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-3xl sm:rounded-2xl max-h-[92vh] sm:max-h-[88vh] p-0 gap-0 flex flex-col overflow-hidden">
        <header className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-border">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">
              Paso {step + 1} de {PHASES.length}
            </p>
            <h2 className="text-base sm:text-lg font-semibold truncate">
              {phase.emoji} Fase {phase.label}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Elige <b>1 a {MAX_PER_PHASE}</b> recursos · seleccionados{' '}
              <span className={limitReached ? 'text-amber-600 font-semibold' : 'text-primary font-semibold'}>
                {currentPicks.length}/{MAX_PER_PHASE}
              </span>
            </p>
          </div>
        </header>

        <div className="flex gap-2 px-4 sm:px-5 pt-3 pb-1">
          {PHASES.map((p, i) => (
            <div
              key={p.key}
              className={`flex-1 h-1.5 rounded-full transition-colors duration-300 ${i <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
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

        <footer className="flex justify-between items-center gap-3 p-4 sm:p-5 border-t border-border">
          <Button
            variant="ghost"
            onClick={step === 0 ? onClose : () => setStep((s) => s - 1)}
          >
            {step === 0 ? 'Cancelar' : '← Atrás'}
          </Button>
          <Button onClick={handleNext} disabled={!canAdvance}>
            {isLast ? `Confirmar (${total}) ✓` : 'Siguiente →'}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
