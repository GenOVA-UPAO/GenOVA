// Chips de la cadena de fallback de un modelo, extraídos de ModelTaskCard
// para mantener los archivos ≤200 líneas.

type ChipModel = {
  provider: string
  model_id: string
  label?: string
  modality?: string
}

export function Chips({
  fallbacks,
  models,
  chip,
  num,
}: {
  fallbacks?: Array<{ provider: string; model_id: string }>
  models: ChipModel[]
  chip: string
  num: string
}) {
  if (!fallbacks?.length)
    return (
      <div className="flex items-center gap-1.5 text-[10px] italic text-muted-foreground/40">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20" />
        Sin cadena de respaldo
      </div>
    )
  const label = (f: { provider: string; model_id: string }) =>
    models.find((m) => m.provider === f.provider && m.model_id === f.model_id)
      ?.label ??
    f.model_id ??
    '—'
  const modality = (f: { provider: string; model_id: string }) =>
    models.find((m) => m.provider === f.provider && m.model_id === f.model_id)
      ?.modality || 'text'
  const MODALITY_SYMBOLS: Record<string, string> = {
    text: 'Aa',
    multimodal: '◆',
    image: '◇',
    audio: '♪',
  }
  return (
    <div className="flex flex-wrap items-center gap-0.5">
      {fallbacks.slice(0, 4).map((f, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && (
            <span className="text-[8px] text-muted-foreground/30 font-black">
              →
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${chip}`}
          >
            <span className={`text-[9px] ${num}`}>
              {MODALITY_SYMBOLS[modality(f)] || MODALITY_SYMBOLS.text}
            </span>
            <span className="truncate max-w-[80px]">{label(f)}</span>
          </span>
        </span>
      ))}
      {fallbacks.length > 4 && (
        <span className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground border border-border/50">
          +{fallbacks.length - 4}
        </span>
      )}
    </div>
  )
}
