import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const PHASE_STYLE = {
  engage: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  explore: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const PHASE_EMOJI = { engage: '🎯', explore: '🔍' }

function PhaseGroup({ phase, items }) {
  if (!items.length) return null
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

export function SelectionChips({ engage, explore, onEdit, editable }) {
  const hasAny = engage.length > 0 || explore.length > 0
  if (!hasAny) return null

  const total = engage.length + explore.length

  return (
    <div className="space-y-2">
      <PhaseGroup phase="engage" items={engage} />
      <PhaseGroup phase="explore" items={explore} />
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
