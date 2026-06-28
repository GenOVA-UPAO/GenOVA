import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Button } from '@/core/components/ui/button'
import { Dialog, DialogContent } from '@/core/components/ui/dialog'
import { getDefaultConfig } from '@/features/ova_library/lib/resourceConfigSchema'
import { getAdminNodesConfig } from '@/features/admin/services/adminSettingsService'
import type { Resource } from '@/features/student/lib/types'
import {
  EMPTY_PICKS,
  MAX_PER_PHASE,
  PHASE_CFG,
  type Picks,
  type ResourceConfigs,
  toggleSelection,
} from './phaseSelectConfig'
import { PhaseSelectStep } from './PhaseSelectStep'
import { PhaseTabNav } from './PhaseTabNav'
import { ResourceConfigModal } from './ResourceConfigModal'
import { ResourcePreviewPanel } from './ResourcePreviewPanel'

interface PhaseSelectModalProps {
  onClose: () => void
  onConfirm: (picks: Picks, configs: ResourceConfigs) => void
  initialSelections?: Picks
  initialResourceConfigs?: ResourceConfigs
}

interface ConfigTarget {
  resource: Resource
  phaseKey: string
}


export function PhaseSelectModal({
  onClose,
  onConfirm,
  initialSelections,
  initialResourceConfigs,
}: PhaseSelectModalProps) {
  const [step, setStep] = useState(0)
  const [recursos, setRecursos] = useState<Picks>(EMPTY_PICKS())
  const [failedPhases, setFailedPhases] = useState<Record<string, boolean>>(
    () => Object.fromEntries(PHASE_CFG.map((p) => [p.key, false])),
  )
  const [retryTick, setRetryTick] = useState(0)
  const [loading, setLoading] = useState(true)
  const [picks, setPicks] = useState<Picks>(() => ({
    ...EMPTY_PICKS(),
    ...(initialSelections ?? {}),
  }))
  const [hovered, setHovered] = useState<Resource | null>(null)
  const [resourceConfigs, setResourceConfigs] = useState<ResourceConfigs>(
    () => initialResourceConfigs ?? {},
  )
  const [configTarget, setConfigTarget] = useState<ConfigTarget | null>(null)

  const { data: nodesData } = useQuery({
    queryKey: ['admin', 'nodes-config'],
    queryFn: getAdminNodesConfig,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  const videoKeyConfigured =
    (nodesData as { video_api_key_configured?: boolean } | undefined)
      ?.video_api_key_configured ?? true

  useEffect(() => {
    setLoading(true)
    Promise.allSettled(PHASE_CFG.map((p) => p.fetch()))
      .then((results) => {
        const next: Picks = {}
        const failed: Record<string, boolean> = {}
        PHASE_CFG.forEach((p, i) => {
          const r = results[i]
          next[p.key] =
            r.status === 'fulfilled'
              ? ((r.value as { recursos?: Resource[] }).recursos ?? [])
              : []
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
  const totalPhasesSelected = PHASE_CFG.filter(
    (p) => picks[p.key].length > 0,
  ).length
  const total = PHASE_CFG.reduce((s, p) => s + picks[p.key].length, 0)
  const canConfirm = totalPhasesSelected >= 2

  const selectResource = (r: Resource) =>
    setPicks((prev) => ({
      ...prev,
      [phase.key]: toggleSelection(prev[phase.key], r),
    }))
  const handleConfigSave = (
    phaseKey: string,
    resource: Resource,
    values: Record<string, number>,
  ) =>
    setResourceConfigs((prev) => ({
      ...prev,
      [`${phaseKey}:${resource.id}`]: values,
    }))

  const previewResource: Resource | null =
    hovered ??
    (currentPicks.length > 0 ? currentPicks[currentPicks.length - 1] : null)

  return (
    <>
      <Dialog
        open={true}
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
      >
        <DialogContent className="top-auto bottom-0 left-0 right-0 w-full max-w-full translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none sm:top-[50%] sm:bottom-auto sm:left-[50%] sm:right-auto sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-5xl sm:rounded-2xl max-h-[92vh] sm:max-h-[88vh] p-0 gap-0 flex flex-col overflow-hidden">
          <PhaseTabNav
            phases={PHASE_CFG}
            step={step}
            picks={picks}
            onStepChange={setStep}
          />

          <div className="flex flex-1 overflow-hidden min-h-0">
            <PhaseSelectStep
              phase={phase}
              step={step}
              currentPicks={currentPicks}
              currentList={currentList}
              currentFailed={currentFailed}
              loading={loading}
              limitReached={limitReached}
              videoKeyConfigured={videoKeyConfigured}
              selectResource={selectResource}
              setHovered={setHovered}
              setConfigTarget={setConfigTarget}
              setRetryTick={setRetryTick}
            />

            <ResourcePreviewPanel
              resource={previewResource}
              phaseKey={phase.key}
              phaseColor={phase.color}
              className="hidden sm:flex flex-col w-72 border-l border-border bg-muted/20 shrink-0 overflow-y-auto"
            />
          </div>

          <footer className="flex justify-between items-center gap-3 p-4 sm:p-5 border-t border-border bg-background shrink-0">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <div className="flex items-center gap-3">
              {!canConfirm ? (
                <span className="text-xs text-muted-foreground hidden sm:block">
                  Selecciona al menos 2 fases
                </span>
              ) : (
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {total} recurso{total !== 1 ? 's' : ''} ·{' '}
                  {totalPhasesSelected} fases
                </span>
              )}
              <Button
                onClick={() => canConfirm && onConfirm(picks, resourceConfigs)}
                disabled={!canConfirm}
                style={
                  canConfirm
                    ? { backgroundColor: phase.color, borderColor: phase.color }
                    : undefined
                }
              >
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
          phaseColor={
            PHASE_CFG.find((p) => p.key === configTarget.phaseKey)?.color ??
            '#3B82F6'
          }
          videoKeyConfigured={videoKeyConfigured}
          config={
            resourceConfigs[
              `${configTarget.phaseKey}:${configTarget.resource.id}`
            ] ??
            getDefaultConfig(configTarget.phaseKey, String(configTarget.resource.id))
          }
          onSave={handleConfigSave}
          onClose={() => setConfigTarget(null)}
        />
      )}
    </>
  )
}
