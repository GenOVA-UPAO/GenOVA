import type { IconProps } from '@phosphor-icons/react'
import { Layout, MagicWand, PaintBrush, Sparkle } from '@phosphor-icons/react'
import type { OvaTheme } from '@/features/ova_workspace/lib/types'

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

interface SegmentProps {
  active: boolean
  onClick: () => void
  disabled?: boolean
  icon: React.ComponentType<IconProps>
  label: string
  children?: React.ReactNode
}

function Segment({
  active,
  onClick,
  disabled,
  icon: Icon,
  label,
  children,
}: SegmentProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: grupo de radios estilizado como botones; patrón ARIA radio con aria-checked
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5',
        'text-xs font-medium transition focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
        active
          ? 'bg-background text-foreground shadow-sm ring-1 ring-primary/30'
          : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
      ].join(' ')}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" weight="duotone" />
      <span>{label}</span>
      {children}
    </button>
  )
}

interface AxisProps {
  title: string
  hint: string
  value: string
  onSelect: (value: string) => void
  disabled?: boolean
  upaoIcon: React.ComponentType<IconProps>
  upaoLabel: string
  upaoExtra?: React.ReactNode
  freeLabel: string
}

function Axis({
  title,
  hint,
  value,
  onSelect,
  disabled,
  upaoIcon,
  upaoLabel,
  upaoExtra,
  freeLabel,
}: AxisProps) {
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
          icon={Sparkle}
          label={freeLabel}
        />
      </div>
    </div>
  )
}

interface OvaThemeSelectorProps {
  theme: OvaTheme
  onChange: (theme: OvaTheme) => void
  disabled?: boolean
}

export function OvaThemeSelector({
  theme,
  onChange,
  disabled,
}: OvaThemeSelectorProps) {
  const { color = 'upao', design = 'upao' } = theme || {}
  const set = (patch: Partial<OvaTheme>) =>
    onChange?.({ color, design, ...patch })

  return (
    <section className="space-y-2.5 rounded-lg border border-border bg-card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Tema del OVA
      </p>

      <Axis
        title="Color"
        hint="paleta de los recursos"
        value={color}
        onSelect={(v: string) => set({ color: v })}
        disabled={disabled}
        upaoIcon={PaintBrush}
        upaoLabel="UPAO"
        upaoExtra={<Swatches />}
        freeLabel="Libre"
      />

      <Axis
        title="Diseño"
        hint="estructura del recurso"
        value={design}
        onSelect={(v: string) => set({ design: v })}
        disabled={disabled}
        upaoIcon={Layout}
        upaoLabel="UPAO"
        freeLabel="Libre"
      />

      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <MagicWand size={12} weight="duotone" className="shrink-0" />
        {color === 'free' || design === 'free'
          ? 'La IA decidirá lo marcado como «Libre».'
          : 'Marca institucional UPAO: azul, naranja y blanco.'}
      </p>
    </section>
  )
}
