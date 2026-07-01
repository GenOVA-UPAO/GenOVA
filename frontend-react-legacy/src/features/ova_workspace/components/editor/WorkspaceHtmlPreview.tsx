import { useState } from 'react'
import { Badge } from '@/core/components/ui/badge'
import { HtmlPreviewFrame } from '@/core/components/HtmlPreviewFrame'
import type { PhaseWithContent } from '@/features/ova_workspace/lib/types'

const PHASE_META: Record<
  string,
  { label: string; tab: string; badge: string }
> = {
  engage: {
    label: 'Enganche',
    tab: 'bg-primary text-primary-foreground',
    badge: 'bg-primary/10 text-primary border-primary/20',
  },
  explore: {
    label: 'Exploración',
    tab: 'bg-primary/85 text-primary-foreground',
    badge: 'bg-primary/10 text-primary border-primary/20',
  },
  explain: {
    label: 'Explicación',
    tab: 'bg-primary/70 text-primary-foreground',
    badge: 'bg-primary/10 text-primary border-primary/20',
  },
  elaborate: {
    label: 'Elaboración',
    tab: 'bg-accent-brand/85 text-primary-foreground',
    badge: 'bg-accent-brand/10 text-accent-brand border-accent-brand/25',
  },
  evaluate: {
    label: 'Evaluación',
    tab: 'bg-accent-brand text-primary-foreground',
    badge: 'bg-accent-brand/10 text-accent-brand border-accent-brand/25',
  },
}

const DEFAULT_META = {
  label: null as string | null,
  tab: 'bg-muted text-muted-foreground',
  badge: 'bg-muted text-muted-foreground border-border',
}

function getMeta(phase_type: string) {
  return PHASE_META[phase_type] ?? { ...DEFAULT_META, label: phase_type }
}

interface WorkspaceHtmlPreviewProps {
  phases: PhaseWithContent[]
  onResourceClick?: (e: React.MouseEvent) => void
}

export function WorkspaceHtmlPreview({
  phases,
  onResourceClick,
}: WorkspaceHtmlPreviewProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const active =
    (activeId ? phases.find((p) => p.id === activeId) : undefined) ??
    phases[0] ??
    null

  if (!phases.length) return null

  const activeMeta = active ? getMeta(active.phase_type) : DEFAULT_META

  return (
    // biome-ignore lint/a11y: delegación de clics a enlaces internos del recurso renderizado (no es un control en sí)
    <section className="flex flex-col h-full" onClick={onResourceClick}>
      <nav
        aria-label="Recursos del OVA"
        className="flex flex-wrap gap-1 border-b border-border bg-muted/20 px-3 py-2 shrink-0"
      >
        {phases.map((p) => {
          const meta = getMeta(p.phase_type)
          const isActive = p.id === (activeId ?? phases[0]?.id)
          const label = p.title ?? meta.label ?? p.phase_type
          return (
            <button
              key={p.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setActiveId(p.id)
              }}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive
                  ? meta.tab
                  : 'bg-background text-muted-foreground border border-border hover:bg-muted/60'
              }`}
            >
              {label}
            </button>
          )
        })}
      </nav>

      <div className="flex-1 overflow-hidden">
        <HtmlPreviewFrame
          html={active?.content ?? ''}
          className="w-full h-full border-0 block"
          height=""
          title={active?.title ?? 'Vista previa del recurso'}
        />
      </div>

      {active ? (
        <div className="shrink-0 border-t border-border px-3 py-1 bg-muted/20 flex items-center gap-2 min-w-0">
          <Badge
            variant="outline"
            className={`text-[10px] shrink-0 ${activeMeta.badge}`}
          >
            {activeMeta.label ?? active.phase_type}
          </Badge>
          {active.title ? (
            <span className="text-xs text-muted-foreground truncate">
              {active.title}
            </span>
          ) : null}
          {active.regenerated ? (
            <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
              ✦ regenerado
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
