import { XCircle } from '@phosphor-icons/react'
import { Button } from '@/core/components/ui/button'
import { ResourceList } from '@/features/ova_workspace/components/editor/ResourceList'
import type {
  JobLike,
  ResourceVM,
} from '@/features/ova_workspace/lib/ovaJobViewModel'

const STATUS_LABEL: Record<string, string> = {
  queued: 'En cola…',
  running: 'Generando recursos…',
  interrupted: 'Generación interrumpida',
  error: 'La generación terminó con errores',
  done: '¡OVA generado!',
  canceled: 'Generación cancelada',
}

interface RetryHeaderProps {
  failedCount: number
  selectedCount: number
  onSelectAll: () => void
  onRetrySelected: () => void
}

function RetryHeader({
  failedCount,
  selectedCount,
  onSelectAll,
  onRetrySelected,
}: RetryHeaderProps) {
  if (failedCount === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
      <Button type="button" variant="outline" size="sm" onClick={onSelectAll}>
        Seleccionar todos los fallidos
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onRetrySelected}
        disabled={selectedCount === 0}
      >
        Reintentar seleccionados ({selectedCount})
      </Button>
    </div>
  )
}

interface ProgressPanelProps {
  job: JobLike | null
  viewModel: ResourceVM[]
  selectedIds: string[]
  activeId: string | null
  onToggle: (id: string) => void
  onRetryOne: (id: string) => void
  onPreview: (id: string) => void
  onSelectAll: () => void
  onRetrySelected: () => void
  onCancel?: () => void
}

const _TERMINAL = new Set(['done', 'error', 'canceled', 'interrupted'])

export function ProgressPanel({
  job,
  viewModel,
  selectedIds,
  activeId,
  onToggle,
  onRetryOne,
  onPreview,
  onSelectAll,
  onRetrySelected,
  onCancel,
}: ProgressPanelProps) {
  const status = (job?.status as string) || 'queued'
  const isTerminal = _TERMINAL.has(status)
  const failedCount = viewModel.filter((r) => r.status === 'X').length
  const doneCount = viewModel.filter((r) => r.status === 'check').length
  const total = viewModel.length || 1
  const pct = Math.round((doneCount / total) * 100)

  return (
    <div className="rounded-xl border border-border bg-background p-4 sm:p-5 shadow-sm space-y-4">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-medium text-foreground">
            {STATUS_LABEL[status] || status}
          </span>
          <div className="flex items-center gap-2">
            {!isTerminal && onCancel && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                <XCircle className="size-3.5 mr-1" />
                Cancelar
              </Button>
            )}
            <span className="text-xs font-semibold text-muted-foreground">
              {doneCount}/{viewModel.length} listos
            </span>
          </div>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              failedCount ? 'bg-accent-brand' : 'bg-primary'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ResourceList
        viewModel={viewModel}
        selectedIds={selectedIds}
        activeId={activeId}
        onToggle={onToggle}
        onRetry={onRetryOne}
        onPreview={onPreview}
      />

      <RetryHeader
        failedCount={failedCount}
        selectedCount={selectedIds.length}
        onSelectAll={onSelectAll}
        onRetrySelected={onRetrySelected}
      />
    </div>
  )
}
