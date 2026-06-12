import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { useOvaCreation } from '../../hooks/ova/useOvaCreation.js'
import { PhaseSelectModal } from '../PhaseSelectModal.jsx'
import { CrearOvaChatPanel } from '../crear/CrearOvaChatPanel.jsx'
import { CrearOvaPreviewPanel } from '../crear/CrearOvaPreviewPanel.jsx'

/**
 * Creation mode of the unified OVA workspace.
 * Left: CrearOvaChatPanel (prompt + resource config + live progress).
 * Right: CrearOvaPreviewPanel (resources preview as they generate).
 * On success it calls onCreated(ovaId); the parent shell swaps to edit mode
 * in place (no separate page), so create and edit are one surface.
 */
export function OvaCreationView({ onCreated }) {
  const location = useLocation()
  const {
    prompt, setPrompt,
    isModalOpen, openModal, closeModal, confirmSelections,
    selections, totalResources,
    theme, setTheme,
    canConfigure, canGenerate, isGenerating,
    generate, reset, restore, minChars,
    job,
    uploads, activeUploadsCount, handleFilesSelected, handleRemoveUpload,
    isUploadingFiles, maxUploadFiles, uploadError,
  } = useOvaCreation()

  // HU-023 R4 — resume an in-progress job navigated from Mis OVAs.
  useEffect(() => {
    const jobId = location.state?.resumeJobId
    if (jobId && job.phase === 'idle') restore(jobId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { jobId, job: jobData, viewModel, outcome, selectedFailedIds, error } = job
  const hasJob = job.phase !== 'idle'
  const isTerminal = job.phase === 'terminal'
  const ovaId = jobData?.ova_id ?? null

  // Hand off to edit mode once generation finishes with at least one resource.
  useEffect(() => {
    if (!isTerminal || !outcome.anyDone || !ovaId) return
    onCreated?.(ovaId)
  }, [isTerminal, outcome.anyDone, ovaId, onCreated])

  // Pinned resource for right panel (user click or auto first-done).
  const [pinnedId, setPinnedId] = useState(null)
  const firstDoneId = viewModel.find((r) => r.status === 'check')?.id ?? null
  const pinnedIsDone = viewModel.some((r) => r.id === pinnedId && r.status === 'check')
  const activeId = pinnedIsDone ? pinnedId : firstDoneId

  const uploadsProps = {
    uploads, activeUploadsCount, maxUploadFiles, isUploadingFiles, uploadError,
    onFilesSelected: handleFilesSelected, onRemove: handleRemoveUpload,
    disabled: false,
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Topbar — same minimal style as edit mode */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-2.5 bg-background shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold">Crear OVA</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Define el tema, configura los recursos y genera con IA.
          </p>
        </div>
      </header>

      {/* Split panels */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left — creation chat panel (420px, always visible) */}
        <div className="w-full sm:w-[420px] sm:shrink-0 border-r border-border flex flex-col overflow-hidden">
          <CrearOvaChatPanel
            prompt={prompt} setPrompt={setPrompt} minChars={minChars}
            canConfigure={canConfigure} canGenerate={canGenerate}
            isGenerating={isGenerating} isDone={isTerminal}
            openModal={openModal}
            selections={selections}
            totalResources={totalResources}
            theme={theme} setTheme={setTheme}
            generate={generate} reset={reset} error={error}
            uploadsProps={uploadsProps}
            hasJob={hasJob}
            job={jobData}
            viewModel={viewModel}
            outcome={outcome}
            selectedFailedIds={selectedFailedIds}
            jobToggleFailed={job.toggleFailed}
            jobRetryOne={job.retryOne}
            jobSelectAllFailed={job.selectAllFailed}
            jobRetrySelected={job.retrySelected}
            onPreviewPin={setPinnedId}
            activeId={activeId}
          />
        </div>

        {/* Right — live resource preview (desktop only; mobile: left panel is full-width) */}
        <div className="hidden sm:flex flex-col flex-1 min-h-0 overflow-hidden">
          <CrearOvaPreviewPanel
            jobId={jobId}
            viewModel={viewModel}
            pinnedId={pinnedId}
            onPin={setPinnedId}
          />
        </div>
      </div>

      {isModalOpen ? (
        <PhaseSelectModal
          onClose={closeModal} onConfirm={confirmSelections}
          initialSelections={selections}
        />
      ) : null}
    </div>
  )
}
