import type { Icon } from '@phosphor-icons/react'

interface PhaseTab {
  key: string
  Icon: Icon
  label: string
  color: string
}

interface PhaseTabNavProps {
  phases: PhaseTab[]
  step: number
  picks: Record<string, unknown[]>
  onStepChange: (index: number) => void
}

export function PhaseTabNav({
  phases,
  step,
  picks,
  onStepChange,
}: PhaseTabNavProps) {
  return (
    <div className="flex items-stretch border-b border-border overflow-x-auto shrink-0 bg-background">
      {phases.map((phase, i) => {
        const isActive = i === step
        const count = picks[phase.key]?.length ?? 0
        const hasSel = count > 0
        const { Icon } = phase

        return (
          <button
            key={phase.key}
            type="button"
            onClick={() => onStepChange(i)}
            className={[
              'flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs font-semibold whitespace-nowrap',
              'transition border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset',
              isActive
                ? 'border-current bg-background'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40',
            ].join(' ')}
            style={
              isActive
                ? { borderColor: phase.color, color: phase.color }
                : undefined
            }
            aria-selected={isActive}
            role="tab"
          >
            <Icon
              size={16}
              weight={isActive ? 'fill' : 'regular'}
              style={{ color: isActive ? phase.color : undefined }}
            />
            <span className="hidden sm:inline tracking-wide">
              {phase.label}
            </span>
            {hasSel && (
              <span
                className="inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full text-[10px] font-bold text-white leading-none"
                style={{ backgroundColor: phase.color }}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
