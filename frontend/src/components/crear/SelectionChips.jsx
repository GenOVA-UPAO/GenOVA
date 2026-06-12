import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const PHASE_STYLE = {
  engage:    'bg-indigo-100 text-indigo-700 border-indigo-200',
  explore:   'bg-emerald-100 text-emerald-700 border-emerald-200',
  explain:   'bg-blue-100 text-blue-700 border-blue-200',
  elaborate: 'bg-amber-100 text-amber-700 border-amber-200',
  evaluate:  'bg-violet-100 text-violet-700 border-violet-200',
}

const PHASE_EMOJI = {
  engage: '🎯', explore: '🔍', explain: '💡', elaborate: '🔧', evaluate: '✅',
}

const PHASE_ORDER = ['engage', 'explore', 'explain', 'elaborate', 'evaluate']

function PhaseGroup({ phase, items }) {
  if (!items?.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {PHASE_EMOJI[phase]} {phase}
      </span>
      {items.map((r, i) => (
        <Badge
          key={`${phase}-${r.id}`}
          className={`rounded-full gap-1.5 ${PHASE_STYLE[phase]}`}
        >
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/70 text-[10px] font-bold">
            {i + 1}
          </span>
          {r.emoji} {r.tipo}
        </Badge>
      ))}
    </div>
  )
}

export function SelectionChips({ selections = {}, onEdit, editable }) {
  const total = PHASE_ORDER.reduce((s, p) => s + (selections[p]?.length ?? 0), 0)
  if (total === 0) return null

  return (
    <div className="space-y-2">
      {PHASE_ORDER.map((p) => (
        <PhaseGroup key={p} phase={p} items={selections[p]} />
      ))}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>
          Total: <b className="text-foreground">{total}</b> recurso{total === 1 ? '' : 's'}
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
