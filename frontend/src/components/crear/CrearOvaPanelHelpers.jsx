const PHASES = ['engage', 'explore', 'explain', 'elaborate', 'evaluate']
const P_EMOJI = { engage: '🎯', explore: '🔍', explain: '💡', elaborate: '🔧', evaluate: '✅' }
const P_DOT = {
  engage: 'bg-indigo-500', explore: 'bg-emerald-600', explain: 'bg-blue-600',
  elaborate: 'bg-amber-600', evaluate: 'bg-violet-600',
}

export function PhaseRow({ selections }) {
  return (
    <div className="flex items-center gap-2">
      {PHASES.map((p) => {
        const n = selections[p]?.length ?? 0
        return (
          <span key={p} title={`${p}: ${n} recurso${n !== 1 ? 's' : ''}`}
            className={`flex items-center gap-0.5 text-xs transition-opacity duration-200 ${n > 0 ? 'opacity-100' : 'opacity-25'}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${n > 0 ? P_DOT[p] : 'bg-foreground'}`} />
            {P_EMOJI[p]}
          </span>
        )
      })}
    </div>
  )
}

export function SectionLabel({ num, title }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="font-mono text-[10px] font-bold text-primary/40 shrink-0">{num}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 shrink-0">{title}</span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  )
}
