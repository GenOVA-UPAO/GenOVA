import { Palette, Sparkles, LayoutTemplate, Wand2 } from 'lucide-react'

/**
 * OVA content theme picker — two independent axes (Fase 1):
 *   color:  'upao' (azul/naranja/blanco fijo) | 'free' (la IA elige paleta)
 *   design: 'upao' (plantilla estructurada)   | 'free' (la IA elige layout)
 * Default UPAO+UPAO. Feeds the Prometheus generation request (job.params.theme).
 */

// UPAO swatch hex mirror llm/themes.py UPAO_PALETTE (preview only).
const UPAO_SWATCHES = ['#0A3D91', '#F47A20', '#FFFFFF']

function Swatches() {
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {UPAO_SWATCHES.map((c) => (
        <span
          key={c}
          className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
          style={{ backgroundColor: c }}
        />
      ))}
    </span>
  )
}

function Segment({ active, onClick, disabled, icon: Icon, label, children }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5',
        'text-xs font-medium transition-all focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
        active
          ? 'bg-background text-foreground shadow-sm ring-1 ring-primary/30'
          : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
      ].join(' ')}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
      {children}
    </button>
  )
}

function Axis({ title, hint, value, onSelect, disabled, upaoIcon, upaoLabel, upaoExtra, freeLabel }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-foreground">{title}</p>
        <p className="text-[10px] text-muted-foreground">{hint}</p>
      </div>
      <div role="radiogroup" className="flex gap-1 rounded-lg bg-muted/50 p-1">
        <Segment
          active={value === 'upao'}
          onClick={() => onSelect('upao')}
          disabled={disabled}
          icon={upaoIcon}
          label={upaoLabel}
        >
          {upaoExtra}
        </Segment>
        <Segment
          active={value === 'free'}
          onClick={() => onSelect('free')}
          disabled={disabled}
          icon={Sparkles}
          label={freeLabel}
        />
      </div>
    </div>
  )
}

export function OvaThemeSelector({ theme, onChange, disabled }) {
  const { color = 'upao', design = 'upao' } = theme || {}
  const set = (patch) => onChange?.({ color, design, ...patch })

  return (
    <section className="space-y-2.5 rounded-lg border border-border bg-card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Tema del OVA
      </p>

      <Axis
        title="Color"
        hint="paleta de los recursos"
        value={color}
        onSelect={(v) => set({ color: v })}
        disabled={disabled}
        upaoIcon={Palette}
        upaoLabel="UPAO"
        upaoExtra={<Swatches />}
        freeLabel="Libre"
      />

      <Axis
        title="Diseño"
        hint="estructura del recurso"
        value={design}
        onSelect={(v) => set({ design: v })}
        disabled={disabled}
        upaoIcon={LayoutTemplate}
        upaoLabel="UPAO"
        freeLabel="Libre"
      />

      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Wand2 className="h-3 w-3 shrink-0" />
        {color === 'free' || design === 'free'
          ? 'La IA decidirá lo marcado como «Libre».'
          : 'Marca institucional UPAO: azul, naranja y blanco.'}
      </p>
    </section>
  )
}
