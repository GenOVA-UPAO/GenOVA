import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'

/**
 * HU-025 — Preview panel for workspace: renders backend OvaPhase HTML content
 * via iframe (sandboxed) with a tab per resource.
 *
 * Backend phases shape: { id, phase_type, phase_order, content (HTML), title }
 * Unlike OvaFiveEViewer (creation flow), this component works directly with the
 * /editar API response — no section-struct conversion needed.
 */

const PHASE_META = {
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
  label: null,
  tab: 'bg-muted text-muted-foreground',
  badge: 'bg-muted text-muted-foreground border-border',
}

function getMeta(phase_type) {
  return PHASE_META[phase_type] ?? { ...DEFAULT_META, label: phase_type }
}

export function WorkspaceHtmlPreview({ phases, onResourceClick }) {
  // null means "auto" → falls back to first phase during render (no sync effect needed).
  const [activeId, setActiveId] = useState(null)
  const iframeRef = useRef(null)

  // Derive active phase: use explicit pick if still present, otherwise first phase.
  const active = (activeId && phases.find(p => p.id === activeId)) ?? phases[0] ?? null

  // Recreate blob URL whenever the active phase's HTML changes.
  useEffect(() => {
    const html = active?.content
    if (!html || !iframeRef.current) return
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    iframeRef.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [active?.content, active?.id])

  if (!phases.length) return null

  const activeMeta = active ? getMeta(active.phase_type) : DEFAULT_META

  return (
    // biome-ignore lint/a11y: delegación de clic; los recursos internos son botones focusables y operables por teclado
    <section className="flex flex-col h-full" onClick={onResourceClick}>
      {/* Resource tabs */}
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
              onClick={(e) => { e.stopPropagation(); setActiveId(p.id) }}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive ? meta.tab : 'bg-background text-muted-foreground border border-border hover:bg-muted/60'
              }`}
            >
              {label}
            </button>
          )
        })}
      </nav>

      {/* Sandboxed iframe — preserves the LLM-generated CSS/JS */}
      <div className="flex-1 overflow-hidden">
        <iframe
          ref={iframeRef}
          title={active?.title ?? 'Vista previa del recurso'}
          className="w-full h-full border-0 block"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>

      {/* Active-phase info footer */}
      {active ? (
        <div className="shrink-0 border-t border-border px-3 py-1 bg-muted/20 flex items-center gap-2 min-w-0">
          <Badge
            variant="outline"
            className={`text-[10px] shrink-0 ${activeMeta.badge}`}
          >
            {activeMeta.label ?? active.phase_type}
          </Badge>
          {active.title ? (
            <span className="text-xs text-muted-foreground truncate">{active.title}</span>
          ) : null}
          {active.regenerated ? (
            <span className="ml-auto text-[10px] text-muted-foreground shrink-0">✦ regenerado</span>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
