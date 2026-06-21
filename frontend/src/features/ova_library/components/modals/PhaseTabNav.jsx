export function PhaseTabNav({ phases, step, picks, onStepChange }) {
  return (
    <div className="flex items-stretch border-b border-border overflow-x-auto shrink-0 bg-background">
      {phases.map((phase, i) => {
        const isActive = i === step
        const count = picks[phase.key]?.length ?? 0
        const hasSel = count > 0

        return (
          <button
            key={phase.key}
            type="button"
            onClick={() => onStepChange(i)}
            className={[
              'flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs font-semibold whitespace-nowrap',
              'transition-all border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset',
              isActive
                ? 'border-current'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40',
            ].join(' ')}
            style={isActive ? { borderColor: phase.color, color: phase.color } : undefined}
            aria-selected={isActive}
            role="tab"
          >
            <span className="text-base leading-none">{phase.emoji}</span>
            <span className="hidden sm:inline tracking-wide">{phase.label}</span>
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
