import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useOvaCreation } from '../hooks/useOvaCreation.js'
import { PhaseSelectModal } from '../components/PhaseSelectModal.jsx'
import { CrearOvaChatPanel } from '../components/crear/CrearOvaChatPanel.jsx'
import { CrearOvaPreviewPanel } from '../components/crear/CrearOvaPreviewPanel.jsx'

/**
 * Creation workspace — mirrors /ova/:id/workspace visually.
 * Left: CrearOvaChatPanel (same structure as WorkspaceChatPanel).
 * Right: CrearOvaPreviewPanel (same structure as WorkspaceHtmlPreview).
 * On success: navigates immediately to /ova/:id/workspace — the visual
 * similarity between both pages makes the transition seamless.
 */
export function CrearOvaPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    prompt, setPrompt,
    isModalOpen, openModal, closeModal, confirmSelections,
    engageSelection, exploreSelection, totalResources,
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

  // Navigate immediately to workspace when generation succeeds (0ms).
  useEffect(() => {
    if (!isTerminal || !outcome.anyDone || !ovaId) return
    navigate(`/ova/${ovaId}/workspace`, { replace: true })
  }, [isTerminal, outcome.anyDone, ovaId, navigate])

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
      {/* Topbar — same minimal style as OvaWorkspacePage */}
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
            engageSelection={engageSelection} exploreSelection={exploreSelection}
            totalResources={totalResources}
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
          initialEngage={engageSelection} initialExplore={exploreSelection}
        />
      ) : null}
    </div>
  )
}
