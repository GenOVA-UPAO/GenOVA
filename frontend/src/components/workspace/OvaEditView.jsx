import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOvaWorkspace } from '../../hooks/ova/useOvaWorkspace.js'
import { WorkspaceChatPanel } from './WorkspaceChatPanel.jsx'
import { WorkspaceOvaPanel } from './WorkspaceOvaPanel.jsx'
import { WorkspaceResizableDivider } from './WorkspaceResizableDivider.jsx'
import { VersionHistoryPanel } from './VersionHistoryPanel.jsx'
import { getSavedRatio } from '../../lib/workspaceUtils.js'

const topbarVariants = {
  hidden: { opacity: 0, y: -20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

const contentVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, delay: 0.1 } }
}

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
    <div className="flex flex-col flex-1 min-h-0 bg-background text-foreground">
      <VersionHistoryPanel
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        versions={ws.versionHistory}
        currentVersionId={ws.ova?.current_version?.id}
        onRevert={ws.revertVersion}
        onDiff={ws.getDiff}
      />
      
      {/* Topbar with new aesthetics */}
      <motion.header 
        variants={topbarVariants}
        initial="hidden"
        animate="show"
        className="flex items-center gap-4 border-b border-border/50 px-4 py-3 bg-card/60 backdrop-blur-md shrink-0 z-10"
      >
        <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:bg-muted/50 rounded-lg">
          <Link to="/mis-ovas">
            <ArrowLeft size={16} weight="bold" /> Mis OVAs
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-display font-semibold truncate text-foreground">
            {ws.ova?.title ?? (ws.generating ? 'Generando…' : ws.loading ? 'Cargando…' : 'Workspace OVA')}
          </h1>
        </div>
        {!ws.loading && !ws.generating && (
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {ws.versionNumber && (
              <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20 shadow-sm">
                v{ws.versionNumber}
              </span>
            )}
          </div>
        )}
      </motion.header>

      <AnimatePresence mode="wait">
        {ws.generating ? (
          <motion.div 
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 items-center justify-center p-8 glass-card m-6 rounded-2xl border-primary/20"
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary shadow-sm" />
              <div className="space-y-1.5">
                <p className="text-lg font-display font-semibold text-primary">Generando tu OVA…</p>
                <p className="text-sm text-muted-foreground font-medium">
                  El workspace se abrirá automáticamente al terminar.
                </p>
              </div>
            </div>
          </motion.div>
        ) : ws.error ? (
          <motion.div 
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 items-center justify-center p-8"
          >
            <div className="space-y-4 text-center glass-card p-8 rounded-2xl border-destructive/20 bg-destructive/5">
              <p className="text-sm font-semibold text-destructive">{ws.error}</p>
              <Button variant="outline" size="sm" onClick={ws.load} className="border-destructive/30 hover:bg-destructive/10 text-destructive">
                Reintentar
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="content"
            variants={contentVariants}
            initial="hidden"
            animate="show"
            className="flex-1 flex overflow-hidden"
          >
            {/* Mobile: tabs (R8) */}
            <div className="sm:hidden flex-1 overflow-hidden">
              <Tabs defaultValue="chat" className="h-full flex flex-col">
                <TabsList className="mx-3 mt-3 w-auto self-start bg-muted/50 p-1 rounded-xl">
                  <TabsTrigger value="chat" className="rounded-lg text-xs font-semibold">Chat</TabsTrigger>
                  <TabsTrigger value="preview" className="rounded-lg text-xs font-semibold">Preview / Code</TabsTrigger>
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
            <div ref={containerRef} className="hidden sm:flex flex-1 overflow-hidden bg-background">
              <div
                className="overflow-hidden border-r border-border/50 bg-card/30"
                style={{ width: `${ratio * 100}%`, minWidth: '300px' }}
              >
                <WorkspaceChatPanel {...chatProps} />
              </div>

              <WorkspaceResizableDivider
                ratio={ratio}
                onRatioChange={handleRatioChange}
                containerRef={containerRef}
              />

              <div className="flex-1 overflow-hidden bg-muted/10">
                <WorkspaceOvaPanel {...ovaProps} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
