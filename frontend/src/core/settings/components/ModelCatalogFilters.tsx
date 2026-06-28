// Controles de filtrado del catálogo de modelos (chips por categoría/tipo).
// Extraído de ModelCatalogBrowser para mantener los archivos ≤200 líneas.

function Chip({
  value,
  label,
  active,
  onClick,
  accent,
}: {
  value: string
  label: string
  active: boolean
  onClick: (v: string) => void
  accent?: string
}) {
  return (
    <button
      type="button"
      data-active={active}
      onClick={() => onClick(value)}
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium border transition duration-150 whitespace-nowrap
        ${
          active
            ? 'border-primary bg-primary/8 text-primary font-semibold'
            : `border-border/50 bg-transparent text-muted-foreground/70 ${accent || 'hover:border-primary/40 hover:text-primary hover:bg-primary/4'}`
        }`}
    >
      {label}
    </button>
  )
}

export function FilterRow({
  label,
  options,
  active,
  onSelect,
  labelMap,
  accentMap,
}: {
  label: string
  options: string[]
  active: string
  onSelect: (v: string) => void
  labelMap?: Record<string, string>
  accentMap?: Record<string, string>
}) {
  if (!options || options.length <= 1) return null
  return (
    <div className="flex items-start gap-3 min-w-0">
      <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground/40 pt-1.5 min-w-[60px] text-right">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <Chip
            key={opt}
            value={opt}
            label={labelMap?.[opt] || opt}
            active={active === opt || (!active && opt === 'all')}
            onClick={onSelect}
            accent={accentMap?.[opt]}
          />
        ))}
      </div>
    </div>
  )
}
