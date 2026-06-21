import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchEngageRecursos } from '@/features/ova_workspace/services/phases/engageService.js'
import { fetchExploreRecursos } from '@/features/ova_workspace/services/phases/exploreService.js'
import { fetchExplainRecursos } from '@/features/ova_workspace/services/phases/explainService.js'
import { fetchElaborateRecursos } from '@/features/ova_workspace/services/phases/elaborateService.js'
import { fetchEvaluateRecursos } from '@/features/ova_workspace/services/phases/evaluateService.js'
import { getAdminNodesConfig } from '@/features/ova_workspace/services/ovaSettingsService.js'
import { isVideoResource } from '@/core/lib/llm/nodesConfigDraft.js'
import { ResourceCard } from '@/features/student/components/engage/ResourceCard.jsx'
import { Dialog, DialogContent } from '@/core/components/ui/dialog'
import { Button } from '@/core/components/ui/button'

const PHASE_CFG = [
  // Espectro 5E on-brand: azul UPAO (engage→explain) → naranja UPAO (elaborate/evaluate).
  { key: 'engage',    emoji: '🎯', label: 'ENGAGE',    fetch: fetchEngageRecursos,
    sub: 'Despierta curiosidad · activa saberes previos',
    color: 'var(--primary)', bg: 'color-mix(in oklch, var(--primary) 8%, transparent)', ring: 'ring-2 ring-primary border-primary/40 bg-primary/5', badge: 'bg-primary' },
  { key: 'explore',   emoji: '🔍', label: 'EXPLORE',   fetch: fetchExploreRecursos,
    sub: 'Descubre patrones · construye hipótesis',
    color: 'var(--primary)', bg: 'color-mix(in oklch, var(--primary) 8%, transparent)', ring: 'ring-2 ring-primary border-primary/40 bg-primary/5', badge: 'bg-primary' },
  { key: 'explain',   emoji: '💡', label: 'EXPLAIN',   fetch: fetchExplainRecursos,
    sub: 'Formaliza conceptos · consolida la teoría',
    color: 'var(--primary)', bg: 'color-mix(in oklch, var(--primary) 8%, transparent)', ring: 'ring-2 ring-primary border-primary/40 bg-primary/5', badge: 'bg-primary' },
  { key: 'elaborate', emoji: '🔧', label: 'ELABORATE', fetch: fetchElaborateRecursos,
    sub: 'Aplica · transfiere a problemas reales',
    color: 'var(--accent-brand)', bg: 'color-mix(in oklch, var(--accent-brand) 8%, transparent)', ring: 'ring-2 ring-accent-brand border-accent-brand/40 bg-accent-brand/5', badge: 'bg-accent-brand' },
  { key: 'evaluate',  emoji: '✅', label: 'EVALUATE',  fetch: fetchEvaluateRecursos,
    sub: 'Verifica aprendizajes · reflexiona el proceso',
    color: 'var(--accent-brand)', bg: 'color-mix(in oklch, var(--accent-brand) 8%, transparent)', ring: 'ring-2 ring-accent-brand border-accent-brand/40 bg-accent-brand/5', badge: 'bg-accent-brand' },
]

export const MAX_PER_PHASE = 4
const EMPTY_PICKS = () => Object.fromEntries(PHASE_CFG.map((p) => [p.key, []]))

function toggleSelection(list, resource) {
  const idx = list.findIndex((r) => r.id === resource.id)
  if (idx >= 0) return list.filter((_, i) => i !== idx)
  if (list.length >= MAX_PER_PHASE) return list
  return [...list, resource]
}

function PhaseStep({ phase, index, step }) {
  const on = index <= step
  const active = index === step
  const cfg = PHASE_CFG[index]
  return (
    <>
      {index > 0 && (
        <div className="flex-1 h-0.5 transition-colors duration-300"
          style={{ backgroundColor: index <= step ? PHASE_CFG[index - 1].color : '#E5E7EB' }} />
      )}
      <div className="flex items-center justify-center w-7 h-7 rounded-full text-sm shrink-0 transition-all duration-200 select-none"
        style={{ backgroundColor: on ? cfg.color : 'transparent', color: on ? 'white' : '#9CA3AF',
          border: `2px solid ${on ? cfg.color : '#D1D5DB'}`, transform: active ? 'scale(1.15)' : 'scale(1)' }}>
        {index < step ? '✓' : phase.emoji}
      </div>
    </>
  )
}

export function PhaseSelectModal({ onClose, onConfirm, initialSelections }) {
  const [step, setStep] = useState(0)
  const [recursos, setRecursos] = useState(EMPTY_PICKS())
  const [loading, setLoading] = useState(true)
  const [picks, setPicks] = useState(() => ({ ...EMPTY_PICKS(), ...(initialSelections ?? {}) }))

  const { data: nodesData } = useQuery({
    queryKey: ['admin', 'nodes-config'],
    queryFn: getAdminNodesConfig,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  const videoKeyConfigured = nodesData?.video_api_key_configured ?? true

  useEffect(() => {
    Promise.all(PHASE_CFG.map((p) => p.fetch()))
      .then((results) => {
        const next = {}
        PHASE_CFG.forEach((p, i) => { next[p.key] = results[i].recursos ?? [] })
        setRecursos(next)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const phase = PHASE_CFG[step]
  const currentPicks = picks[phase.key]
  const currentList = recursos[phase.key]
  const isLast = step === PHASE_CFG.length - 1
  const totalPhasesSelected = PHASE_CFG.filter((p) => picks[p.key].length > 0).length
  const canAdvance = isLast ? totalPhasesSelected >= 2 : true
  const limitReached = currentPicks.length >= MAX_PER_PHASE

  function selectResource(r) {
    setPicks((prev) => ({ ...prev, [phase.key]: toggleSelection(prev[phase.key], r) }))
  }

  function handleNext() {
    if (!isLast) { setStep((s) => s + 1); return }
    if (totalPhasesSelected >= 2) onConfirm(picks)
  }

  const total = PHASE_CFG.reduce((s, p) => s + picks[p.key].length, 0)
  const chNum = String(step + 1).padStart(2, '0')

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="top-auto bottom-0 left-0 right-0 w-full max-w-full translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none sm:top-[50%] sm:bottom-auto sm:left-[50%] sm:right-auto sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-3xl sm:rounded-2xl max-h-[92vh] sm:max-h-[88vh] p-0 gap-0 flex flex-col overflow-hidden">

        {/* Phase header — tinted bg + left accent bar shift per phase */}
        <header className="relative overflow-hidden px-5 pt-4 pb-5 border-b border-black/5 transition-colors duration-300"
          style={{ backgroundColor: phase.bg, borderLeft: `4px solid ${phase.color}` }}>

          {/* Editorial chapter number — faint typographic anchor */}
          <span className="absolute right-5 top-1/2 -translate-y-1/2 font-heading leading-none select-none pointer-events-none"
            style={{ color: phase.color, opacity: 0.09, fontSize: '5.5rem', fontWeight: 900 }} aria-hidden="true">
            {chNum}
          </span>

          {/* Stepper */}
          <div className="flex items-center gap-1.5 mb-4 pr-20">
            {PHASE_CFG.map((p, i) => <PhaseStep key={p.key} phase={p} index={i} step={step} />)}
          </div>

          {/* Phase identity + selection dots */}
          <div className="flex items-end justify-between gap-4 pr-20">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: phase.color }}>
                Fase {step + 1} de {PHASE_CFG.length} · hasta {MAX_PER_PHASE} recursos
              </p>
              <h2 className="font-heading text-2xl font-semibold text-foreground leading-tight">
                {phase.emoji} {phase.label}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">{phase.sub}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0 pb-0.5">
              <div className="flex items-center gap-1">
                {Array.from({ length: MAX_PER_PHASE }, (_, i) => (
                  <span key={i} className="inline-block w-2.5 h-2.5 rounded-full transition-all duration-200"
                    style={{ backgroundColor: i < currentPicks.length ? phase.color : '#E5E7EB',
                      transform: i < currentPicks.length ? 'scale(1.1)' : 'scale(1)' }} />
                ))}
              </div>
              <span className="text-[10px] font-semibold" style={{ color: limitReached ? '#D97706' : phase.color }}>
                {currentPicks.length}/{MAX_PER_PHASE}
              </span>
            </div>
          </div>
        </header>

        {/* Resource grid — key triggers fade-in on phase change */}
        <div key={step} className="flex-1 overflow-y-auto p-4 sm:p-5 animate-in fade-in duration-200">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2"
                style={{ borderColor: `${phase.color}30`, borderTopColor: phase.color }} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentList.map((r) => {
                const orderIdx = currentPicks.findIndex((p) => p.id === r.id)
                const selected = orderIdx >= 0
                const isVideo = isVideoResource(phase.key, r.id)
                return (
                  <ResourceCard key={r.id} resource={r} selected={selected}
                    selectionIndex={selected ? orderIdx + 1 : null}
                    disabled={!selected && limitReached}
                    onClick={selectResource}
                    selectedRingCls={phase.ring}
                    selectedBadgeCls={phase.badge}
                    showVideoHint={isVideo && !videoKeyConfigured}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex justify-between items-center gap-3 p-4 sm:p-5 border-t border-border bg-background">
          <Button variant="ghost" onClick={step === 0 ? onClose : () => setStep((s) => s - 1)}>
            {step === 0 ? 'Cancelar' : '← Atrás'}
          </Button>
          <div className="flex items-center gap-3">
            {isLast && totalPhasesSelected < 2 && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                Selecciona recursos en al menos 2 fases
              </span>
            )}
            {(isLast ? totalPhasesSelected >= 2 : total > 0) && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                {total} recurso{total !== 1 ? 's' : ''} · {totalPhasesSelected} fase{totalPhasesSelected !== 1 ? 's' : ''}
              </span>
            )}
            <Button onClick={handleNext} disabled={!canAdvance}
              style={canAdvance ? { backgroundColor: phase.color, borderColor: phase.color } : undefined}>
              {isLast ? `Confirmar (${total}) ✓` : currentPicks.length === 0 ? 'Saltar →' : 'Siguiente →'}
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
