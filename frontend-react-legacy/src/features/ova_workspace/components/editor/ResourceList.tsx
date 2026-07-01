import { Button } from '@/core/components/ui/button'
import { Checkbox } from '@/core/components/ui/checkbox'
import type { ResourceVM } from '@/features/ova_workspace/lib/ovaJobViewModel'
import { groupByPhase } from '@/features/ova_workspace/lib/ovaJobViewModel'

const MARK: Record<string, { icon: string; cls: string }> = {
  check: { icon: '✔', cls: 'text-primary border-primary/20 bg-primary/10' },
  X: {
    icon: '✖',
    cls: 'text-destructive border-destructive/20 bg-destructive/10',
  },
  generando: {
    icon: '…',
    cls: 'text-primary border-primary/20 bg-primary/5 animate-pulse',
  },
  pendiente: { icon: '○', cls: 'text-muted-foreground border-border bg-muted' },
}

const PHASE_EMOJI: Record<string, string> = { engage: '🎯', explore: '🔍' }

interface ResourceRowProps {
  r: ResourceVM
  selected: boolean
  onToggle: (id: string) => void
  onRetry: (id: string) => void
  onPreview: (id: string) => void
  active: boolean
}

function ResourceRow({
  r,
  selected,
  onToggle,
  onRetry,
  onPreview,
  active,
}: ResourceRowProps) {
  const mark = MARK[r.status] || MARK.pendiente
  const isError = r.status === 'X'
  const isDone = r.status === 'check'
  return (
    <li className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="flex items-center gap-2.5">
        {isError ? (
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggle(r.id)}
            aria-label={`Seleccionar ${r.label} para reintentar`}
            className="shrink-0"
          />
        ) : null}
        <span
          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold ${mark.cls}`}
        >
          {mark.icon}
        </span>
        <button
          type="button"
          onClick={isDone ? () => onPreview(r.id) : undefined}
          disabled={!isDone}
          className={`flex-1 min-w-0 truncate text-left text-sm ${
            isDone
              ? 'text-foreground hover:text-primary cursor-pointer'
              : 'text-muted-foreground'
          } ${active ? 'font-semibold text-primary' : ''}`}
        >
          {r.emoji} {r.label}
        </button>
        {isError ? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => onRetry(r.id)}
            className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5"
          >
            Reintentar
          </Button>
        ) : null}
      </div>
      {isError ? (
        <p className="mt-1.5 pl-8 text-xs text-destructive">
          Lo sentimos, hubo un error generando el recurso.
          {r.error_id ? (
            <span className="font-mono"> Error ID: {r.error_id}</span>
          ) : null}
        </p>
      ) : null}
    </li>
  )
}

interface ResourceListProps {
  viewModel: ResourceVM[]
  selectedIds?: string[]
  activeId?: string | null
  onToggle: (id: string) => void
  onRetry: (id: string) => void
  onPreview: (id: string) => void
}

export function ResourceList({
  viewModel,
  selectedIds = [],
  activeId,
  onToggle,
  onRetry,
  onPreview,
}: ResourceListProps) {
  const groups = groupByPhase(viewModel)
  const selectedSet = new Set(selectedIds)
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.phase}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {PHASE_EMOJI[g.phase]} {g.phaseLabel}
          </p>
          <ul className="space-y-1.5">
            {g.items.map((r) => (
              <ResourceRow
                key={r.id}
                r={r}
                selected={selectedSet.has(r.id)}
                active={activeId === r.id}
                onToggle={onToggle}
                onRetry={onRetry}
                onPreview={onPreview}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
