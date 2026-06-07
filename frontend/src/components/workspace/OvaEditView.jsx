import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOvaWorkspace } from '../../hooks/useOvaWorkspace.js'
import { WorkspaceChatPanel } from './WorkspaceChatPanel.jsx'
import { WorkspaceOvaPanel } from './WorkspaceOvaPanel.jsx'
import { WorkspaceResizableDivider } from './WorkspaceResizableDivider.jsx'
import { VersionHistoryPanel } from './VersionHistoryPanel.jsx'
import { getSavedRatio } from '../../lib/workspaceUtils.js'

/**
 * Edit mode of the unified OVA workspace. Full feature set: chat regen,
 * version history, revert/diff, SCORM export, resource list (edit/regen/
 * delete/reorder/add), micro-versioning. Receives ovaId from the parent
 * shell so the same surface serves both /crear-ova and /ova/:id/workspace.
 */
export function OvaEditView({ ovaId }) {
  const ws = useOvaWorkspace(ovaId)
  const [ratio, setRatio] = useState(() => getSavedRatio(0.38))
  const [historyOpen, setHistoryOpen] = useState(false)
  const containerRef = useRef(null)

  const handleRatioChange = useCallback((r) => setRatio(r), [])

  const uploadsProps = {
    uploads: ws.uploads.uploads,
    activeUploadsCount: ws.uploads.activeUploadsCount,
    maxUploadFiles: ws.uploads.maxUploadFiles,
    isUploadingFiles: ws.uploads.isUploadingFiles,
    uploadError: ws.uploads.uploadError,
    disabled: false,
    onFilesSelected: ws.uploads.handleFilesSelected,
    onRemove: ws.uploads.handleRemoveUpload,
  }

  const chatProps = {
    prompt: ws.prompt, setPrompt: ws.setPrompt,
    isRegenerating: ws.isRegenerating,
    regenProgress: ws.regenProgress,
    onRegenAll: ws.regenAll,
    onSubmit: ws.submitPrompt,
    uploads: uploadsProps,
    phases: ws.phases,
    selectionMode: ws.selectionMode,
    selectedPhaseIds: ws.selectedPhaseIds,
    onToggleSelectionMode: ws.toggleSelectionMode,
    onTogglePhaseSelection: ws.togglePhaseSelection,
    onSelectAll: ws.toggleSelectAll,
  }

  const ovaProps = {
    phases: ws.phases,
    versionNumber: ws.versionNumber,
    isReady: ws.isReady,
    isLoading: ws.loading,
    onDownload: ws.downloadScorm,
    onReorder: ws.reorderWithinPhase,
    ovaId,
    onEditPhase: ws.savePhase,
    onRegenPhase: ws.regenPhase,
    onDeletePhase: ws.deleteOvaPhase,
    onPhaseReverted: ws.load,
    onAddPhase: ws.addOvaPhase,
    onResourceClick: undefined,
    onHistoryOpen: () => setHistoryOpen(true),
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <VersionHistoryPanel
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        versions={ws.versionHistory}
        currentVersionId={ws.ova?.current_version?.id}
        onRevert={ws.revertVersion}
        onDiff={ws.getDiff}
      />
      {/* Topbar */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-2.5 bg-background shrink-0">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <Link to="/mis-ovas">← Mis OVAs</Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold truncate">
            {ws.ova?.title ?? (ws.generating ? 'Generando…' : ws.loading ? 'Cargando…' : 'Workspace OVA')}
          </h1>
        </div>
      </header>

      {ws.generating ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Generando tu OVA…</p>
              <p className="text-xs text-muted-foreground">
                El workspace se abrirá automáticamente al terminar.
              </p>
            </div>
          </div>
        </div>
      ) : ws.error ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="space-y-3 text-center">
            <p className="text-sm text-destructive">{ws.error}</p>
            <Button variant="outline" size="sm" onClick={ws.load}>Reintentar</Button>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile: tabs (R8) */}
          <div className="sm:hidden flex-1 overflow-hidden">
            <Tabs defaultValue="chat" className="h-full flex flex-col">
              <TabsList className="mx-3 mt-2 w-auto self-start">
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
                <WorkspaceChatPanel {...chatProps} />
              </TabsContent>
              <TabsContent value="preview" className="flex-1 overflow-hidden mt-0">
                <WorkspaceOvaPanel {...ovaProps} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Desktop: resizable split (R2) */}
          <div ref={containerRef} className="hidden sm:flex flex-1 overflow-hidden">
            <div
              className="overflow-hidden border-r border-border"
              style={{ width: `${ratio * 100}%`, minWidth: '300px' }}
            >
              <WorkspaceChatPanel {...chatProps} />
            </div>

            <WorkspaceResizableDivider
              onRatioChange={handleRatioChange}
              containerRef={containerRef}
            />

            <div className="flex-1 overflow-hidden">
              <WorkspaceOvaPanel {...ovaProps} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
