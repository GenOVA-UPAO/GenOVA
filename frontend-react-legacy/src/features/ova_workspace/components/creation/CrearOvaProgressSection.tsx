// Sección de progreso/resultado del panel de creación (barra de generación,
// fallo total, "crear otro"). Extraído de CrearOvaChatPanel para ≤200 líneas.
import { ProgressPanel } from '@/features/ova_workspace/components/creation/ProgressPanel'
import { TotalFailurePanel } from '@/features/ova_workspace/components/creation/TotalFailurePanel'
import { Button } from '@/core/components/ui/button'
import type {
  JobLike,
  ResourceVM,
} from '@/features/ova_workspace/lib/ovaJobViewModel'

interface CrearOvaProgressSectionProps {
  hasJob: boolean
  isDone: boolean
  viewModel: ResourceVM[]
  jobData: JobLike | null
  selectedFailedIds: string[]
  activeId: string | null
  outcome?: { totalFail?: boolean } | null
  jobToggleFailed: (id: string) => void
  jobRetryOne: (id: string) => void
  onPreviewPin: (id: string) => void
  jobSelectAllFailed: () => void
  jobRetrySelected: () => void
  reset: () => void
}

export function CrearOvaProgressSection({
  hasJob,
  isDone,
  viewModel,
  jobData,
  selectedFailedIds,
  activeId,
  outcome,
  jobToggleFailed,
  jobRetryOne,
  onPreviewPin,
  jobSelectAllFailed,
  jobRetrySelected,
  reset,
}: CrearOvaProgressSectionProps) {
  return (
    <>
      {hasJob && viewModel.length > 0 ? (
        <div className="border-t border-border px-4 pt-3 pb-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Generación
          </p>
          <ProgressPanel
            job={jobData}
            viewModel={viewModel}
            selectedIds={selectedFailedIds}
            activeId={activeId}
            onToggle={jobToggleFailed}
            onRetryOne={jobRetryOne}
            onPreview={onPreviewPin}
            onSelectAll={jobSelectAllFailed}
            onRetrySelected={jobRetrySelected}
          />
        </div>
      ) : null}

      {isDone && outcome?.totalFail ? (
        <div className="border-t border-border px-4 pt-3 pb-4">
          <TotalFailurePanel viewModel={viewModel} onRetryAll={reset} />
        </div>
      ) : null}

      {isDone && !outcome?.totalFail ? (
        <div className="border-t border-border px-4 pt-3 pb-4">
          <Button
            type="button"
            variant="link"
            size="sm"
            className="p-0 h-auto text-xs"
            onClick={reset}
          >
            ← Crear otro OVA
          </Button>
        </div>
      ) : null}
    </>
  )
}
