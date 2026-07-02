import type { IconProps } from '@phosphor-icons/react'
import type { Selections } from '@/features/ova_workspace/lib/types'

const PHASES = ['engage', 'explore', 'explain', 'elaborate', 'evaluate']
const P_EMOJI: Record<string, string> = {
  engage: '🎯',
  explore: '🔍',
  explain: '💡',
  elaborate: '🔧',
  evaluate: '✅',
}
const P_DOT: Record<string, string> = {
  engage: 'bg-primary',
  explore: 'bg-primary/70',
  explain: 'bg-primary/45',
  elaborate: 'bg-accent-brand/80',
  evaluate: 'bg-accent-brand',
}

interface PhaseRowProps {
  selections: Selections
}

export function PhaseRow({ selections }: PhaseRowProps) {
  return (
    <div className="flex items-center gap-2">
      {PHASES.map((p) => {
        const n = (selections[p] as unknown[])?.length ?? 0
        return (
          <span
            key={p}
            title={`${p}: ${n} recurso${n !== 1 ? 's' : ''}`}
            className={`flex items-center gap-0.5 text-xs transition-opacity duration-200 ${n > 0 ? 'opacity-100' : 'opacity-25'}`}
          >
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${n > 0 ? P_DOT[p] : 'bg-foreground'}`}
            />
            {P_EMOJI[p]}
          </span>
        )
      })}
    </div>
  )
}

interface SectionLabelProps {
  num: string
  title: string
  Icon?: React.ComponentType<IconProps>
}

export function SectionLabel({ num, title, Icon }: SectionLabelProps) {
  return (
    <div className="flex items-center gap-2 mb-2">
      {Icon && (
        <Icon size={13} weight="duotone" className="text-primary/60 shrink-0" />
      )}
      <span className="font-mono text-[10px] font-bold text-primary/40 shrink-0">
        {num}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 shrink-0">
        {title}
      </span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  )
}
