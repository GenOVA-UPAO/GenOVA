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
import { PhaseTabNav } from './PhaseTabNav.jsx'
import { ResourcePreviewPanel } from './ResourcePreviewPanel.jsx'
import { Target, MagnifyingGlass, Lightbulb, Hammer, CheckCircle } from '@phosphor-icons/react'
import { Dialog, DialogContent } from '@/core/components/ui/dialog'
import { Button } from '@/core/components/ui/button'
import { getSchema, getDefaultConfig } from '@/features/ova_library/lib/resourceConfigSchema.js'
import { ResourceConfigModal } from './ResourceConfigModal.jsx'

const mk = (key, Icon, label, sub, color, fetch) =>
  ({ key, Icon, label, sub, color, fetch, bg: `color-mix(in oklch, ${color} 8%, transparent)` })
const PHASE_CFG = [
  mk('engage',    Target,         'ENGAGE',    'Despierta curiosidad · activa saberes previos',       '#EF4444', fetchEngageRecursos),
  mk('explore',   MagnifyingGlass,'EXPLORE',   'Descubre patrones · construye hipótesis',             '#3B82F6', fetchExploreRecursos),
  mk('explain',   Lightbulb,      'EXPLAIN',   'Formaliza conceptos · consolida la teoría',           '#F59E0B', fetchExplainRecursos),
  mk('elaborate', Hammer,         'ELABORATE', 'Aplica · transfiere a problemas reales',              '#8B5CF6', fetchElaborateRecursos),
  mk('evaluate',  CheckCircle,    'EVALUATE',  'Verifica aprendizajes · reflexiona el proceso',       '#10B981', fetchEvaluateRecursos),
]

const MAX_PER_PHASE = 4
const EMPTY_PICKS = () => Object.fromEntries(PHASE_CFG.map((p) => [p.key, []]))

function toggleSelection(list, resource) {
  const idx = list.findIndex((r) => r.id === resource.id)
  if (idx >= 0) return list.filter((_, i) => i !== idx)
  if (list.length >= MAX_PER_PHASE) return list
  return [...list, resource]
}

export function PhaseSelectModal({ onClose, onConfirm, initialSelections, initialResourceConfigs }) {
  const [step, setStep] = useState(0)
  const [recursos, setRecursos] = useState(EMPTY_PICKS())
  const [failedPhases, setFailedPhases] = useState(() => Object.fromEntries(PHASE_CFG.map((p) => [p.key, false])))
  const [retryTick, setRetryTick] = useState(0)
  const [loading, setLoading] = useState(true)
  const [picks, setPicks] = useState(() => ({ ...EMPTY_PICKS(), ...(initialSelections ?? {}) }))
  const [hovered, setHovered] = useState(null)
  const [resourceConfigs, setResourceConfigs] = useState(() => initialResourceConfigs ?? {})
  const [configTarget, setConfigTarget] = useState(null)

  const { data: nodesData } = useQuery({
    queryKey: ['admin', 'nodes-config'],
    queryFn: getAdminNodesConfig,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  const videoKeyConfigured = nodesData?.video_api_key_configured ?? true

  useEffect(() => {
    setLoading(true)
    Promise.allSettled(PHASE_CFG.map((p) => p.fetch()))
      .then((results) => {
        const next = {}, failed = {}
        PHASE_CFG.forEach((p, i) => {
          const r = results[i]
          next[p.key] = r.status === 'fulfilled' ? (r.value.recursos ?? []) : []
          failed[p.key] = r.status === 'rejected'
        })
        setRecursos(next)
        setFailedPhases(failed)
      })
      .finally(() => setLoading(false))
  }, [retryTick])

  const phase = PHASE_CFG[step]
  const currentPicks = picks[phase.key]
  const currentList = recursos[phase.key]
  const currentFailed = failedPhases[phase.key]
  const limitReached = currentPicks.length >= MAX_PER_PHASE
  const totalPhasesSelected = PHASE_CFG.filter((p) => picks[p.key].length > 0).length
  const total = PHASE_CFG.reduce((s, p) => s + picks[p.key].length, 0)
  const canConfirm = totalPhasesSelected >= 2

  const selectResource = (r) => setPicks((prev) => ({ ...prev, [phase.key]: toggleSelection(prev[phase.key], r) }))
  const handleConfigSave = (phaseKey, resource, values) => setResourceConfigs((prev) => ({ ...prev, [`${phaseKey}:${resource.id}`]: values }))

  const previewResource = hovered ?? (currentPicks.length > 0 ? currentPicks[currentPicks.length - 1] : null)

  return (
    <>
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="top-auto bottom-0 left-0 right-0 w-full max-w-full translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none sm:top-[50%] sm:bottom-auto sm:left-[50%] sm:right-auto sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-5xl sm:rounded-2xl max-h-[92vh] sm:max-h-[88vh] p-0 gap-0 flex flex-col overflow-hidden">

        {/* Phase tabs */}
        <PhaseTabNav phases={PHASE_CFG} step={step} picks={picks} onStepChange={setStep} />

        {/* Body: main grid + preview panel */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* Left — phase header + resource grid */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="relative overflow-hidden px-5 pt-4 pb-4 border-b border-black/5 transition-colors duration-300 shrink-0"
              style={{ backgroundColor: phase.bg, borderLeft: `4px solid ${phase.color}` }}>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-heading leading-none select-none pointer-events-none"
                style={{ color: phase.color, opacity: 0.09, fontSize: '4.5rem', fontWeight: 900 }} aria-hidden="true">
                {String(step + 1).padStart(2, '0')}
              </span>
              <div className="flex items-center justify-between gap-4 pr-16">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: phase.color }}>
                    {phase.label} · hasta {MAX_PER_PHASE} recursos
                  </p>
                  <h2 className="font-heading text-xl font-semibold text-foreground leading-tight">{phase.sub}</h2>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {Array.from({ length: MAX_PER_PHASE }, (_, i) => (
                    <span key={i} className="inline-block w-2 h-2 rounded-full transition-all duration-200"
                      style={{ backgroundColor: i < currentPicks.length ? phase.color : '#E5E7EB',
                        transform: i < currentPicks.length ? 'scale(1.15)' : 'scale(1)' }} />
                  ))}
                  <span className="text-[10px] font-semibold ml-1" style={{ color: limitReached ? '#D97706' : phase.color }}>{currentPicks.length}/{MAX_PER_PHASE}</span>
                </div>
              </div>
            </header>

            {/* Resource grid */}
            <div key={step} className="flex-1 overflow-y-auto p-4 sm:p-5 animate-in fade-in duration-200">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="h-6 w-6 animate-spin rounded-full border-2"
                    style={{ borderColor: `${phase.color}30`, borderTopColor: phase.color }} />
                </div>
              ) : currentFailed ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <p className="text-sm text-muted-foreground">No se pudieron cargar los recursos de esta fase.</p>
                  <button type="button" className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors" style={{ color: phase.color }} onClick={() => setRetryTick((t) => t + 1)}>Reintentar</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentList.map((r) => {
                    const orderIdx = currentPicks.findIndex((p) => p.id === r.id)
                    const selected = orderIdx >= 0
                    return (
                      <ResourceCard key={r.id} resource={r} selected={selected}
                        selectionIndex={selected ? orderIdx + 1 : null}
                        disabled={!selected && limitReached}
                        onClick={selectResource}
                        onHover={setHovered}
                        phaseKey={phase.key}
                        phaseColor={phase.color}
                        showVideoHint={isVideoResource(phase.key, r.id) && !videoKeyConfigured}
                        hasConfig={getSchema(phase.key, r.id).length > 0}
                        onConfigClick={(r) => setConfigTarget({ resource: r, phaseKey: phase.key })}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <ResourcePreviewPanel resource={previewResource} phaseKey={phase.key} phaseColor={phase.color}
            className="hidden sm:flex flex-col w-72 border-l border-border bg-muted/20 shrink-0 overflow-y-auto" />
        </div>

        {/* Footer */}
        <footer className="flex justify-between items-center gap-3 p-4 sm:p-5 border-t border-border bg-background shrink-0">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <div className="flex items-center gap-3">
            {!canConfirm
              ? <span className="text-xs text-muted-foreground hidden sm:block">Selecciona al menos 2 fases</span>
              : <span className="text-xs text-muted-foreground hidden sm:block">{total} recurso{total !== 1 ? 's' : ''} · {totalPhasesSelected} fases</span>
            }
            <Button onClick={() => canConfirm && onConfirm(picks, resourceConfigs)} disabled={!canConfirm}
              style={canConfirm ? { backgroundColor: phase.color, borderColor: phase.color } : undefined}>
              Confirmar ({total}) ✓
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>

    {configTarget && (
      <ResourceConfigModal
        resource={configTarget.resource}
        phaseKey={configTarget.phaseKey}
        phaseColor={PHASE_CFG.find((p) => p.key === configTarget.phaseKey)?.color ?? '#3B82F6'}
        videoKeyConfigured={videoKeyConfigured}
        config={resourceConfigs[`${configTarget.phaseKey}:${configTarget.resource.id}`] ?? getDefaultConfig(configTarget.phaseKey, configTarget.resource.id)}
        onSave={handleConfigSave}
        onClose={() => setConfigTarget(null)}
      />
    )}
    </>
  )
}
