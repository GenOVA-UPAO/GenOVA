// Controles visuales del modal de tema (opción radio + vista previa).
// Extraído de ThemeModal para mantener archivos ≤200 líneas.

export interface Palette {
  name: string
  p: string
  a: string
}

interface RadioOptionProps {
  label: string
  desc: string
  checked: boolean
  onClick: () => void
}

export function RadioOption({ label, desc, checked, onClick }: RadioOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-2.5 w-full rounded-xl border p-2.5 text-left cursor-pointer transition ${checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'}`}
    >
      <div
        className={`mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center ${checked ? 'border-primary' : 'border-muted-foreground/40'}`}
      >
        {checked && <div className="h-2 w-2 rounded-full bg-primary" />}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
          {desc}
        </p>
      </div>
    </button>
  )
}

interface MiniPreviewProps {
  colorMode: string
  designMode: string
  palette: Palette | null
}

export function MiniPreview({ colorMode, designMode, palette }: MiniPreviewProps) {
  const primary =
    colorMode === 'upao'
      ? '#0A3D91'
      : colorMode === 'custom'
        ? (palette?.p ?? '#0A3D91')
        : '#6D28D9'
  const accent =
    colorMode === 'upao'
      ? '#F47A20'
      : colorMode === 'custom'
        ? (palette?.a ?? '#38BDF8')
        : '#A78BFA'
  const isTabbed = designMode !== 'ai'

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-md">
      <div style={{ background: primary }} className="px-3 py-2.5">
        <div className="text-white font-bold text-[9px]">
          Fotosíntesis y el Ciclo
        </div>
        <div className="text-white/60 text-[7px] mt-0.5">
          Biología — 2° año · UPAO 2026
        </div>
      </div>
      {isTabbed && (
        <div className="flex bg-muted/30 border-b border-border">
          {['Engage', 'Explore', 'Explain', 'Evaluate'].map((t, i) => (
            <div
              key={t}
              className="px-2 py-1.5 text-[7px] font-semibold shrink-0"
              style={{
                color: i === 0 ? accent : '#94a3b8',
                borderBottom:
                  i === 0 ? `2px solid ${accent}` : '2px solid transparent',
              }}
            >
              {t}
            </div>
          ))}
        </div>
      )}
      <div className="p-2.5 space-y-2 bg-background">
        <div
          className="h-2 rounded-full w-3/5 opacity-25"
          style={{ background: primary }}
        />
        <div className="h-1.5 rounded-full w-full bg-muted" />
        <div className="h-1.5 rounded-full w-5/6 bg-muted" />
        <div className="h-1.5 rounded-full w-4/6 bg-muted" />
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <div
            className="h-8 rounded-lg opacity-20"
            style={{ background: accent }}
          />
          <div className="h-8 rounded-lg bg-muted/50" />
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="h-2 flex-1 rounded-full"
            style={{ background: accent, opacity: 0.4 }}
          />
          <div className="h-2 w-8 rounded-full bg-muted" />
        </div>
      </div>
      <div style={{ background: primary, opacity: 0.06 }} className="h-1" />
    </div>
  )
}
