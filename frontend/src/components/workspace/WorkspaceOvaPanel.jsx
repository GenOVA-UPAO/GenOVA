import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { OvaFiveEViewer } from '../OvaFiveEViewer.jsx'

/**
 * HU-025 — workspace right panel: Preview/Code tabs + toolbar.
 * Anchors for HU-026 (click-to-edit), HU-027 (resource selection),
 * and HU-028 (version/history) are present as noop props/placeholders.
 */
export function WorkspaceOvaPanel({
  phases, versionNumber, isReady, isLoading,
  onDownload,
  // HU-026 anchor (no logic yet)
  onResourceClick,
  // HU-028 anchor (no logic yet)
  onHistoryOpen,
}) {
  const [tab, setTab] = useState('preview')

  const hasPhases = Array.isArray(phases) && phases.length > 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 bg-background shrink-0 flex-wrap">
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 p-0.5">
          <Button
            type="button"
            size="sm"
            variant={tab === 'preview' ? 'default' : 'ghost'}
            className="h-6 text-xs px-2.5"
            onClick={() => setTab('preview')}
          >
            Preview
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === 'code' ? 'default' : 'ghost'}
            className="h-6 text-xs px-2.5"
            onClick={() => setTab('code')}
          >
            Code
          </Button>
        </div>

        {/* HU-028 anchor: version badge + history button */}
        {versionNumber ? (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            v{versionNumber}
          </Badge>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-xs px-1.5 text-muted-foreground"
          onClick={onHistoryOpen}
          title="Historial de versiones (próximamente)"
          disabled
        >
          ⏱ Historial
        </Button>

        <div className="ml-auto">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!isReady}
            onClick={onDownload}
            className="h-6 text-xs px-2.5 gap-1"
            title={isReady ? 'Descargar SCORM' : 'El OVA debe estar listo para descargar'}
          >
            ⤓ SCORM
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
          </div>
        ) : !hasPhases ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <p className="text-sm text-muted-foreground">El OVA no tiene contenido aún.</p>
          </div>
        ) : tab === 'preview' ? (
          // HU-026 anchor: pass onResourceClick for click-to-edit (noop here)
          <div className="p-4" onClick={onResourceClick}>
            <OvaFiveEViewer phases={phases} conceptName="" />
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {phases.map((phase) => (
              <div key={phase.id} className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {phase.phase_type} — {phase.resource_type}
                </p>
                <pre className="rounded-lg bg-muted/50 border border-border p-3 text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                  {phase.content || '(sin contenido)'}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
