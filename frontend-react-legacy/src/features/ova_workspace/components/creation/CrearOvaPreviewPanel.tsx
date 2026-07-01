import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/core/components/ui/badge'
import { useResourceContent } from '@/features/ova_workspace/hooks/useResourceContent'
import type { ResourceVM } from '@/features/ova_workspace/lib/ovaJobViewModel'

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
    tab: 'bg-primary text-primary-foreground',
    badge: 'bg-primary/10 text-primary border-primary/20',
  },
}

const DEFAULT_META = {
  label: null as string | null,
  tab: 'bg-muted text-muted-foreground',
  badge: 'bg-muted text-muted-foreground border-border',
}

interface CrearOvaPreviewPanelProps {
  jobId: string | null
  viewModel: ResourceVM[]
  pinnedId: string | null
  onPin: (id: string | null) => void
}

function getMeta(phase: string) {
  return PHASE_META[phase] ?? { ...DEFAULT_META, label: phase }
}

function EmptyState() {
  return (
    <div className="flex flex-col h-full items-center justify-center gap-4 select-none px-6 text-center">
      <div
        aria-hidden="true"
        className="text-5xl opacity-10 font-bold tracking-tighter text-foreground"
      >
        ◧
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          Vista previa del OVA
        </p>
        <p className="text-xs text-muted-foreground/70">
          Los recursos aparecerán aquí a medida que se generen.
        </p>
      </div>
    </div>
  )
}

interface ResourceIframeProps {
  jobId: string | null
  resourceId: string
}

function ResourceIframe({ jobId, resourceId }: ResourceIframeProps) {
  const enabled = Boolean(jobId && resourceId)
  const { content, loading } = useResourceContent(jobId, resourceId, enabled)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!content || !iframeRef.current) return
    const url = URL.createObjectURL(new Blob([content], { type: 'text/html' }))
    iframeRef.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [content])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }

  return (
    <iframe
      ref={iframeRef}
      title="Vista previa del recurso"
      className="w-full h-full border-0 block"
      sandbox="allow-scripts allow-same-origin"
    />
  )
}

export function CrearOvaPreviewPanel({
  jobId,
  viewModel,
  pinnedId,
  onPin,
}: CrearOvaPreviewPanelProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const doneTabs = viewModel.filter((r) => r.status === 'check')
  const active =
    (activeId ? doneTabs.find((r) => r.id === activeId) : undefined) ??
    (pinnedId ? doneTabs.find((r) => r.id === pinnedId) : undefined) ??
    doneTabs[0] ??
    null

  const handleTabClick = (id: string) => {
    setActiveId(id)
    onPin?.(id)
  }

  if (!doneTabs.length) return <EmptyState />

  const activeMeta = active ? getMeta(active.phase) : DEFAULT_META

  return (
    <section className="flex flex-col h-full">
      <nav
        aria-label="Recursos generados"
        className="flex flex-wrap gap-1 border-b border-border bg-muted/20 px-3 py-2 shrink-0"
      >
        {doneTabs.map((r) => {
          const meta = getMeta(r.phase)
          const isActive = r.id === active?.id
          const label = r.label ?? meta.label ?? r.phase
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => handleTabClick(r.id)}
              className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive
                  ? meta.tab
                  : 'bg-background text-muted-foreground border border-border hover:bg-muted/60'
              }`}
            >
              {r.emoji ? <span aria-hidden="true">{r.emoji}</span> : null}
              {label}
            </button>
          )
        })}

        {viewModel
          .filter((r) => r.status !== 'check' && r.status !== 'X')
          .map((r) => (
            <span
              key={r.id}
              className="flex items-center gap-1 rounded-md px-3 py-1 text-xs text-muted-foreground/50 border border-dashed border-border"
            >
              <span className="inline-block h-2 w-2 rounded-full border border-current animate-pulse" />
              {r.label ?? r.phase}
            </span>
          ))}
      </nav>

      <div className="flex-1 min-h-0 overflow-hidden">
        {active ? (
          <ResourceIframe jobId={jobId} resourceId={active.id} />
        ) : (
          <EmptyState />
        )}
      </div>

      {active ? (
        <div className="shrink-0 border-t border-border px-3 py-1 bg-muted/20 flex items-center gap-2 min-w-0">
          <Badge
            variant="outline"
            className={`text-[10px] shrink-0 ${activeMeta.badge}`}
          >
            {activeMeta.label ?? active.phase}
          </Badge>
          {active.label ? (
            <span className="text-xs text-muted-foreground truncate">
              {active.label}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
