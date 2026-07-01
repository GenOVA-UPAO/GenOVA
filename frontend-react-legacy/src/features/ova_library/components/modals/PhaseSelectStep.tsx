// Columna central del PhaseSelectModal: cabecera de la fase + grilla de
// recursos. Extraído del modal para mantener archivos ≤200 líneas.
import { isVideoResource } from '@/core/settings/lib/nodesConfigDraft'
import { getSchema } from '@/features/ova_library/lib/resourceConfigSchema'
import { ResourceCard } from '@/features/student/components/engage/ResourceCard'
import type { Resource } from '@/features/student/lib/types'
import { MAX_PER_PHASE, type PhaseCfg } from './phaseSelectConfig'

interface PhaseSelectStepProps {
  phase: PhaseCfg
  step: number
  currentPicks: Resource[]
  currentList: Resource[]
  currentFailed: boolean
  loading: boolean
  limitReached: boolean
  videoKeyConfigured: boolean
  selectResource: (r: Resource) => void
  setHovered: (r: Resource | null) => void
  setConfigTarget: (target: { resource: Resource; phaseKey: string }) => void
  setRetryTick: (updater: (t: number) => number) => void
}

export function PhaseSelectStep({
  phase,
  step,
  currentPicks,
  currentList,
  currentFailed,
  loading,
  limitReached,
  videoKeyConfigured,
  selectResource,
  setHovered,
  setConfigTarget,
  setRetryTick,
}: PhaseSelectStepProps) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header
        className="relative overflow-hidden px-5 pt-4 pb-4 border-b border-black/5 transition-colors duration-300 shrink-0"
        style={{
          backgroundColor: phase.bg,
          borderLeft: `4px solid ${phase.color}`,
        }}
      >
        <span
          className="absolute right-4 top-1/2 -translate-y-1/2 font-heading leading-none select-none pointer-events-none"
          style={{
            color: phase.color,
            opacity: 0.09,
            fontSize: '4.5rem',
            fontWeight: 900,
          }}
          aria-hidden="true"
        >
          {String(step + 1).padStart(2, '0')}
        </span>
        <div className="flex items-center justify-between gap-4 pr-16">
          <div className="min-w-0">
            <p
              className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
              style={{ color: phase.color }}
            >
              {phase.label} · hasta {MAX_PER_PHASE} recursos
            </p>
            <h2 className="font-heading text-xl font-semibold text-foreground leading-tight">
              {phase.sub}
            </h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {Array.from({ length: MAX_PER_PHASE }, (_, i) => (
              <span
                key={i}
                className="inline-block w-2 h-2 rounded-full transition duration-200"
                style={{
                  backgroundColor:
                    i < currentPicks.length ? phase.color : '#E5E7EB',
                  transform:
                    i < currentPicks.length ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
            <span
              className="text-[10px] font-semibold ml-1"
              style={{ color: limitReached ? '#D97706' : phase.color }}
            >
              {currentPicks.length}/{MAX_PER_PHASE}
            </span>
          </div>
        </div>
      </header>

      <div
        key={step}
        className="flex-1 overflow-y-auto p-4 sm:p-5 animate-in fade-in duration-200"
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2"
              style={{
                borderColor: `${phase.color}30`,
                borderTopColor: phase.color,
              }}
            />
          </div>
        ) : currentFailed ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              No se pudieron cargar los recursos de esta fase.
            </p>
            <button
              type="button"
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors"
              style={{ color: phase.color }}
              onClick={() => setRetryTick((t) => t + 1)}
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentList.map((r) => {
              const orderIdx = currentPicks.findIndex((p) => p.id === r.id)
              const selected = orderIdx >= 0
              return (
                <ResourceCard
                  key={r.id}
                  resource={r}
                  selected={selected}
                  selectionIndex={selected ? orderIdx + 1 : null}
                  disabled={!selected && limitReached}
                  onClick={selectResource}
                  onHover={setHovered}
                  phaseKey={phase.key}
                  phaseColor={phase.color}
                  showVideoHint={
                    isVideoResource(phase.key, String(r.id)) &&
                    !videoKeyConfigured
                  }
                  hasConfig={getSchema(phase.key, String(r.id)).length > 0}
                  onConfigClick={() =>
                    setConfigTarget({ resource: r, phaseKey: phase.key })
                  }
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
