import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { OvaFiveEViewer } from '../OvaFiveEViewer.jsx'
import { WorkspaceResourceList } from './WorkspaceResourceList.jsx'

/**
 * HU-025 — workspace right panel: Preview/Code tabs + toolbar.
 * HU-033 — drag-drop resource reorder in Code view via WorkspaceResourceList.
 * Anchors for HU-026 (click-to-edit), HU-027 (resource selection),
 * and HU-028 (version/history) are present as noop props/placeholders.
 */
export function WorkspaceOvaPanel({
  phases, versionNumber, isReady, isLoading,
  onDownload,
  onReorder,
  ovaId,
  // HU-026: per-phase edit/regen/delete
  onEditPhase, onRegenPhase, onDeletePhase,
  // HU-029: micro-version revert
  onPhaseReverted,
  // HU-032: add resource per phase group
  onAddPhase,
  // HU-026 preview click anchor (noop)
  onResourceClick,
  // HU-028 anchor (noop)
  onHistoryOpen,
}) {
  const [tab, setTab] = useState('preview')

  const hasPhases = Array.isArray(phases) && phases.length > 0

  // Group phases by phase_type for drag-drop (HU-033)
  const grouped = hasPhases
    ? phases.reduce((acc, p) => {
        if (!acc[p.phase_type]) acc[p.phase_type] = []
        acc[p.phase_type].push(p)
        return acc
      }, {})
    : {}

  function handleGroupReorder(phaseType, updatedGroup) {
    if (!onReorder) return
    // Rebuild full phases array: replace items of this type with reordered group
    let typeIdx = 0
    const reordered = phases.map((p) =>
      p.phase_type === phaseType ? updatedGroup[typeIdx++] : p
    )
    onReorder(reordered)
  }

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
          title="Historial de versiones"
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
            {Object.entries(grouped).map(([type, group]) => (
              <WorkspaceResourceList
                key={type}
                phases={group}
                phaseType={type}
                ovaId={ovaId}
                onReorder={(updated) => handleGroupReorder(type, updated)}
                onEdit={onEditPhase}
                onRegen={onRegenPhase}
                onDelete={onDeletePhase}
                onReverted={onPhaseReverted}
                onAdd={onAddPhase}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
