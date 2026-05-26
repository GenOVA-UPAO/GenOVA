const STATE_CONFIG = {
  pending: { icon: null, cls: 'text-slate-400' },
  generating: { icon: '…', cls: 'text-indigo-700 font-medium' },
  retrying: { icon: '⟳', cls: 'text-amber-600 font-medium' },
  done: { icon: '✓', cls: 'text-emerald-700' },
  failed: { icon: '✗', cls: 'text-red-500' },
}

function PhaseChecklist({ phase, picks, completed, stepStates, offset }) {
  if (!picks.length) return null
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
        {phase}
      </p>
      <ul className="space-y-1">
        {picks.map((r, i) => {
          const globalIdx = offset + i
          const state = stepStates[globalIdx] || (i < completed ? 'done' : 'pending')
          const cfg = STATE_CONFIG[state] || STATE_CONFIG.pending
          return (
            <li
              key={`${phase}-${r.id}`}
              className={`flex items-center gap-2 text-xs ${cfg.cls}`}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold">
                {cfg.icon ?? i + 1}
              </span>
              <span className="truncate">{r.emoji} {r.tipo}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function ProgressPanel({
  progress, engageSelection, exploreSelection, partial, stepStates = [],
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div>
        <div className="flex justify-between text-xs text-slate-600">
          <span>{progress.label}</span>
          <span className="font-semibold">{progress.pct}%</span>
        </div>
        <div className="mt-1 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-700"
            style={{ width: `${progress.pct}%` }}
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <PhaseChecklist
          phase="🎯 ENGAGE" picks={engageSelection}
          completed={partial.engage.length} stepStates={stepStates} offset={0}
        />
        <PhaseChecklist
          phase="🔍 EXPLORE" picks={exploreSelection}
          completed={partial.explore.length}
          stepStates={stepStates} offset={engageSelection.length}
        />
      </div>
    </div>
  )
}
