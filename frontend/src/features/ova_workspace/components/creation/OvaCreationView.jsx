import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { AnimatePresence } from 'motion/react'
import { Button } from '@/core/components/ui/button'
import { useOvaCreation } from '@/features/ova_workspace/hooks/useOvaCreation'
import { PhaseSelectModal } from '@/features/ova_library/components/modals/PhaseSelectModal.jsx'
import { OvaCreateFormCard } from '@/features/ova_workspace/components/creation/OvaCreateFormCard.jsx'
import { CrearOvaPreviewPanel } from '@/features/ova_workspace/components/creation/CrearOvaPreviewPanel.jsx'
import { ProgressPanel } from '@/features/ova_workspace/components/creation/ProgressPanel.jsx'
import { TotalFailurePanel } from '@/features/ova_workspace/components/creation/TotalFailurePanel.jsx'

export function OvaCreationView({ onCreated }) {
  const location = useLocation()
  const {
    prompt, setPrompt,
    isModalOpen, openModal, closeModal, confirmSelections,
    selections, totalResources, resourceConfigs,
    theme, setTheme,
    canGenerate,
    generate, reset, restore, minChars,
    job,
    uploads, activeUploadsCount, handleFilesSelected, handleRemoveUpload,
    isUploadingFiles, maxUploadFiles, uploadError,
  } = useOvaCreation()

  useEffect(() => {
    const jobId = location.state?.resumeJobId
    if (jobId && job.phase === 'idle') restore(jobId)
  }, [])

  const { jobId, job: jobData, viewModel, outcome, selectedFailedIds, error } = job
  const hasJob = job.phase !== 'idle'
  const isGenerating = job.phase === 'starting' || job.phase === 'polling'
  const isTerminal = job.phase === 'terminal'
  const ovaId = jobData?.ova_id ?? null

  useEffect(() => {
    if (!isTerminal || !outcome.anyDone || !ovaId) return
    onCreated?.(ovaId)
  }, [isTerminal, outcome.anyDone, ovaId, onCreated])

  const [pinnedId, setPinnedId] = useState(null)
  const firstDoneId = viewModel.find((r) => r.status === 'check')?.id ?? null
  const pinnedIsDone = viewModel.some((r) => r.id === pinnedId && r.status === 'check')
  const activeId = pinnedIsDone ? pinnedId : firstDoneId

  const uploadsProps = {
    uploads, activeUploadsCount, maxUploadFiles, isUploadingFiles, uploadError,
    onFilesSelected: handleFilesSelected, onRemove: handleRemoveUpload,
    disabled: false,
  }

  const doneCount = viewModel.filter((r) => r.status === 'check').length
  const total = viewModel.length || 1
  const pct = Math.round((doneCount / total) * 100)

  if (!hasJob) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-background text-foreground">
        <OvaCreateFormCard
          prompt={prompt} setPrompt={setPrompt} minChars={minChars}
          canGenerate={canGenerate}
          openModal={openModal} selections={selections} totalResources={totalResources}
          theme={theme} setTheme={setTheme}
          generate={generate} error={error}
          uploadsProps={uploadsProps}
        />
        <AnimatePresence>
          {isModalOpen && (
            <PhaseSelectModal onClose={closeModal} onConfirm={confirmSelections} initialSelections={selections} initialResourceConfigs={resourceConfigs} />
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border/50 px-5 py-3 bg-card/60 backdrop-blur-md shrink-0">
        <h1 className="flex-1 text-base font-display font-semibold truncate">Generando OVA…</h1>
        {isGenerating && (
          <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Generando…
          </span>
        )}
        {viewModel.length > 0 && (
          <span className="text-sm font-bold text-primary tabular-nums shrink-0">{pct}%</span>
        )}
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="w-full sm:w-[380px] lg:w-[420px] sm:shrink-0 border-r border-border/50 flex flex-col overflow-hidden bg-card/30">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {viewModel.length > 0 && (
              <ProgressPanel
                job={jobData} viewModel={viewModel}
                selectedIds={selectedFailedIds} activeId={activeId}
                onToggle={job.toggleFailed} onRetryOne={job.retryOne}
                onPreview={setPinnedId}
                onSelectAll={job.selectAllFailed} onRetrySelected={job.retrySelected}
              />
            )}
            {isTerminal && outcome?.totalFail && (
              <TotalFailurePanel viewModel={viewModel} onRetryAll={reset} />
            )}
            {isTerminal && !outcome?.totalFail && (
              <Button type="button" variant="link" size="sm" className="p-0 h-auto text-xs" onClick={reset}>
                ← Crear otro OVA
              </Button>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </div>

        <div className="hidden sm:flex flex-col flex-1 min-h-0 overflow-hidden bg-muted/10">
          <CrearOvaPreviewPanel jobId={jobId} viewModel={viewModel} pinnedId={pinnedId} onPin={setPinnedId} />
        </div>
      </div>
    </div>
  )
}
