import { useState } from 'react'
import { GearButton } from '@/core/components/settings/GearButton'
import { Badge } from '@/core/components/ui/badge'
import { Button } from '@/core/components/ui/button'
import { WorkspaceHtmlPreview } from '@/features/ova_workspace/components/editor/WorkspaceHtmlPreview'
import { WorkspaceResourceList } from '@/features/ova_workspace/components/editor/WorkspaceResourceList'
import { LlmSettingsModal } from '@/features/ova_workspace/components/modals/LlmSettingsModal'
import type { PhaseWithContent } from '@/features/ova_workspace/lib/types'

interface WorkspaceOvaPanelProps {
  phases: PhaseWithContent[]
  versionNumber: number | null
  isReady: boolean
  isLoading: boolean
  onDownload: () => void
  onReorder: (updatedPhases: PhaseWithContent[]) => void
  ovaId: string
  onEditPhase: (phaseId: string, content: string) => void
  onRegenPhase: (phaseId: string, prompt?: string) => void
  onDeletePhase: (phaseId: string) => void
  onPhaseReverted: () => void
  onAddPhase: (phaseType: string, prompt: string) => void
  onResourceClick?: (e: React.MouseEvent) => void
  onHistoryOpen?: () => void
}

export function WorkspaceOvaPanel({
  phases,
  versionNumber,
  isReady,
  isLoading,
  onDownload,
  onReorder,
  ovaId,
  onEditPhase,
  onRegenPhase,
  onDeletePhase,
  onPhaseReverted,
  onAddPhase,
  onResourceClick,
  onHistoryOpen,
}: WorkspaceOvaPanelProps) {
  const [tab, setTab] = useState<'preview' | 'code'>('preview')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const hasPhases = Array.isArray(phases) && phases.length > 0

  const grouped = hasPhases
    ? phases.reduce<Record<string, PhaseWithContent[]>>((acc, p) => {
        if (!acc[p.phase_type]) acc[p.phase_type] = []
        acc[p.phase_type].push(p)
        return acc
      }, {})
    : {}

  function handleGroupReorder(phaseType: string, updatedGroup: PhaseWithContent[]) {
    if (!onReorder) return
    let typeIdx = 0
    const reordered = phases.map((p) =>
      p.phase_type === phaseType ? updatedGroup[typeIdx++] : p,
    )
    onReorder(reordered)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <LlmSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
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

        {versionNumber ? (
          <Badge
            variant="outline"
            className="text-[10px] text-muted-foreground"
          >
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

        <div className="ml-auto flex items-center gap-1">
          <GearButton onClick={() => setSettingsOpen(true)} />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!isReady}
            onClick={onDownload}
            className="h-6 text-xs px-2.5 gap-1"
            title={
              isReady
                ? 'Descargar SCORM'
                : 'El OVA debe estar listo para descargar'
            }
          >
            ⤓ SCORM
          </Button>
        </div>
      </div>

      <div
        className={`flex-1 ${tab === 'preview' ? 'overflow-hidden' : 'overflow-auto'}`}
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
          </div>
        ) : !hasPhases ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <p className="text-sm text-muted-foreground">
              El OVA no tiene contenido aún.
            </p>
          </div>
        ) : tab === 'preview' ? (
          <WorkspaceHtmlPreview
            phases={phases}
            onResourceClick={onResourceClick}
          />
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
