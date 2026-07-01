import { AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Button } from '@/core/components/ui/button'
import { PhaseSelectModal } from '@/features/ova_library/components/modals/PhaseSelectModal'
import { CrearOvaPreviewPanel } from '@/features/ova_workspace/components/creation/CrearOvaPreviewPanel'
import { OvaCreateFormCard } from '@/features/ova_workspace/components/creation/OvaCreateFormCard'
import { ProgressPanel } from '@/features/ova_workspace/components/creation/ProgressPanel'
import { TotalFailurePanel } from '@/features/ova_workspace/components/creation/TotalFailurePanel'
import { useOvaCreation } from '@/features/ova_workspace/hooks/useOvaCreation'
import type { UploadsProps } from '@/features/ova_workspace/lib/uploadTypes'

interface OvaCreationViewProps {
  onCreated?: (ovaId: string) => void
  initialJobId?: string
}

export function OvaCreationView({ onCreated, initialJobId }: OvaCreationViewProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    prompt,
    setPrompt,
    isModalOpen,
    openModal,
    closeModal,
    confirmSelections,
    selections,
    totalResources,
    resourceConfigs,
    theme,
    setTheme,
    canGenerate,
    generate,
    reset,
    restore,
    minChars,
    job,
    uploads,
    activeUploadsCount,
    handleFilesSelected,
    handleRemoveUpload,
    isUploadingFiles,
    maxUploadFiles,
    uploadError,
  } = useOvaCreation()

  useEffect(() => {
    const stateJobId = (location.state as { resumeJobId?: string } | null)?.resumeJobId
    const idToRestore = stateJobId || initialJobId
    if (idToRestore && job.phase === 'idle') restore(idToRestore)
  }, [location.state, job.phase, restore, initialJobId])

  const { jobId: currentJobId } = job
  useEffect(() => {
    if (currentJobId && !initialJobId) {
      navigate(`/ova/job/${currentJobId}/workspace`, { replace: true })
    }
  }, [currentJobId, initialJobId, navigate])

  const {
    jobId,
    job: jobData,
    viewModel,
    outcome,
    selectedFailedIds,
    error,
  } = job
  const hasJob = job.phase !== 'idle'
  const isGenerating = job.phase === 'starting' || job.phase === 'polling'
  const isTerminal = job.phase === 'terminal'
  const ovaId = (jobData as { ova_id?: string | null } | null)?.ova_id ?? null

  useEffect(() => {
    if (!isTerminal || !outcome?.anyDone || !ovaId) return
    onCreated?.(ovaId)
  }, [isTerminal, outcome?.anyDone, ovaId, onCreated])

  const [pinnedId, setPinnedId] = useState<string | null>(null)
  const firstDoneId = viewModel.find((r) => r.status === 'check')?.id ?? null
  const pinnedIsDone = viewModel.some(
    (r) => r.id === pinnedId && r.status === 'check',
  )
  const activeId = pinnedIsDone ? pinnedId : firstDoneId

  const uploadsProps: UploadsProps = {
    uploads,
    activeUploadsCount,
    maxUploadFiles,
    isUploadingFiles,
    uploadError,
    onFilesSelected: handleFilesSelected,
    onRemove: handleRemoveUpload,
    disabled: false,
  }

  if (!hasJob) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-background text-foreground">
        <OvaCreateFormCard
          prompt={prompt}
          setPrompt={setPrompt}
          minChars={minChars}
          canGenerate={canGenerate}
          openModal={openModal}
          selections={selections}
          totalResources={totalResources}
          theme={theme}
          setTheme={setTheme}
          generate={generate}
          error={error}
          uploadsProps={uploadsProps}
        />
        <AnimatePresence>
          {isModalOpen && (
            <PhaseSelectModal
              onClose={closeModal}
              onConfirm={confirmSelections}
              initialSelections={selections}
              initialResourceConfigs={resourceConfigs}
            />
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background text-foreground">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="w-full sm:w-[380px] lg:w-[420px] sm:shrink-0 border-r border-border/50 flex flex-col overflow-hidden bg-card/30">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {viewModel.length > 0 && (
              <ProgressPanel
                job={jobData}
                viewModel={viewModel}
                selectedIds={selectedFailedIds}
                activeId={activeId}
                onToggle={job.toggleFailed}
                onRetryOne={job.retryOne}
                onPreview={setPinnedId}
                onSelectAll={job.selectAllFailed}
                onRetrySelected={job.retrySelected}
                onCancel={isGenerating ? job.cancel : undefined}
              />
            )}
            {isTerminal && outcome?.totalFail && (
              <TotalFailurePanel viewModel={viewModel} onRetryAll={reset} />
            )}
            {isTerminal && !outcome?.totalFail && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="p-0 h-auto text-xs"
                onClick={reset}
              >
                ← Crear otro OVA
              </Button>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </div>

        <div className="hidden sm:flex flex-col flex-1 min-h-0 overflow-hidden bg-muted/10">
          <CrearOvaPreviewPanel
            jobId={jobId}
            viewModel={viewModel}
            pinnedId={pinnedId}
            onPin={setPinnedId}
          />
        </div>
      </div>
    </div>
  )
}
