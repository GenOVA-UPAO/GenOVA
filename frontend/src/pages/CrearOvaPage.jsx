import { useState } from 'react'
import { useOvaCreation } from '../hooks/useOvaCreation.js'
import { PhaseSelectModal } from '../components/PhaseSelectModal.jsx'
import { PromptPanel } from '../components/crear/PromptPanel.jsx'
import { ProgressPanel } from '../components/crear/ProgressPanel.jsx'
import { ResourcePreview } from '../components/crear/ResourcePreview.jsx'
import { TotalFailurePanel } from '../components/crear/TotalFailurePanel.jsx'

export function CrearOvaPage() {
  const {
    prompt, setPrompt,
    isModalOpen, openModal, closeModal, confirmSelections,
    engageSelection, exploreSelection, totalResources,
    canConfigure, canGenerate, isGenerating,
    generate, reset, minChars,
    job,
    uploads, activeUploadsCount, handleFilesSelected, handleRemoveUpload,
    isUploadingFiles, maxUploadFiles, uploadError,
  } = useOvaCreation()

  const { jobId, job: jobData, viewModel, outcome, selectedFailedIds, error } = job
  const hasJob = job.phase !== 'idle'
  const isTerminal = job.phase === 'terminal'

  // Preview selection: derive the active resource during render (no effect).
  // The user's pinned pick wins while it's still done; otherwise fall back to
  // the first done resource so a completed recurso is always previewable (R1).
  const [pinnedId, setPinnedId] = useState(null)
  const firstDoneId = viewModel.find((r) => r.status === 'check')?.id ?? null
  const pinnedIsDone = viewModel.some((r) => r.id === pinnedId && r.status === 'check')
  const activeId = pinnedIsDone ? pinnedId : firstDoneId
  const activeResource = viewModel.find((r) => r.id === activeId) || null

  const uploadsProps = {
    uploads, activeUploadsCount, maxUploadFiles, isUploadingFiles, uploadError,
    onFilesSelected: handleFilesSelected, onRemove: handleRemoveUpload,
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-1 sm:px-0">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Crear OVA</h1>
        <p className="text-sm text-slate-600">
          Define el tema, elige hasta 8 recursos (4 por fase) y genera tu OVA con IA.
        </p>
      </header>

      <PromptPanel
        prompt={prompt} setPrompt={setPrompt} minChars={minChars}
        canConfigure={canConfigure} canGenerate={canGenerate}
        isGenerating={isGenerating} isDone={isTerminal}
        openModal={openModal}
        engageSelection={engageSelection} exploreSelection={exploreSelection}
        totalResources={totalResources}
        generate={generate} reset={reset} error={error}
        uploadsProps={uploadsProps}
      />

      {hasJob && viewModel.length > 0 && (
        <ProgressPanel
          job={jobData} viewModel={viewModel}
          selectedIds={selectedFailedIds} activeId={activeId}
          onToggle={job.toggleFailed} onRetryOne={job.retryOne}
          onPreview={setPinnedId}
          onSelectAll={job.selectAllFailed} onRetrySelected={job.retrySelected}
        />
      )}

      {isTerminal && outcome.totalFail && (
        <TotalFailurePanel viewModel={viewModel} onRetryAll={job.retryAll} />
      )}

      {hasJob && activeResource && (
        <ResourcePreview jobId={jobId} resource={activeResource} concept={prompt.trim()} />
      )}

      {isModalOpen && (
        <PhaseSelectModal
          onClose={closeModal} onConfirm={confirmSelections}
          initialEngage={engageSelection} initialExplore={exploreSelection}
        />
      )}
    </div>
  )
}
