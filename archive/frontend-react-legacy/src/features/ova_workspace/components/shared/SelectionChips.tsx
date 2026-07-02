import { Badge } from '@/core/components/ui/badge'
import { Button } from '@/core/components/ui/button'
import type { Selections } from '@/features/ova_workspace/lib/types'

const PHASE_STYLE: Record<string, string> = {
  engage: 'bg-primary/10 text-primary border-primary/20',
  explore: 'bg-primary/10 text-primary border-primary/20',
  explain: 'bg-primary/10 text-primary border-primary/20',
  elaborate: 'bg-accent-brand/10 text-accent-brand border-accent-brand/25',
  evaluate: 'bg-accent-brand/10 text-accent-brand border-accent-brand/25',
}

const PHASE_EMOJI: Record<string, string> = {
  engage: '🎯',
  explore: '🔍',
  explain: '💡',
  elaborate: '🔧',
  evaluate: '✅',
}

const PHASE_ORDER = ['engage', 'explore', 'explain', 'elaborate', 'evaluate']

interface SelectionItem {
  id: string
  emoji?: string
  tipo?: string
}

interface PhaseGroupProps {
  phase: string
  items?: SelectionItem[]
}

function PhaseGroup({ phase, items }: PhaseGroupProps) {
  if (!items?.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {PHASE_EMOJI[phase]} {phase}
      </span>
      {items.map((r, i) => (
        <Badge
          key={`${phase}-${r.id}`}
          className={`rounded-full gap-1.5 ${PHASE_STYLE[phase] ?? ''}`}
        >
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-background/70 text-[10px] font-bold">
            {i + 1}
          </span>
          {r.emoji} {r.tipo}
        </Badge>
      ))}
    </div>
  )
}

interface SelectionChipsProps {
  selections?: Selections
  onEdit?: () => void
  editable?: boolean
}

export function SelectionChips({
  selections = {},
  onEdit,
  editable,
}: SelectionChipsProps) {
  const total = PHASE_ORDER.reduce(
    (s, p) => s + ((selections[p] as SelectionItem[])?.length ?? 0),
    0,
  )
  if (total === 0) return null

  return (
    <div className="space-y-2">
      {PHASE_ORDER.map((p) => (
        <PhaseGroup
          key={p}
          phase={p}
          items={selections[p] as SelectionItem[] | undefined}
        />
      ))}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>
          Total: <b className="text-foreground">{total}</b> recurso
          {total === 1 ? '' : 's'}
        </span>
        {editable ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={onEdit}
            className="h-auto p-0 text-xs"
          >
            Editar selección
          </Button>
        ) : null}
      </div>
    </div>
  )
}
