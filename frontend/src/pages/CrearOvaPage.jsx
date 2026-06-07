import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useOvaCreation } from '../hooks/useOvaCreation.js'
import { PhaseSelectModal } from '../components/PhaseSelectModal.jsx'
import { PromptPanel } from '../components/crear/PromptPanel.jsx'
import { ProgressPanel } from '../components/crear/ProgressPanel.jsx'
import { ResourcePreview } from '../components/crear/ResourcePreview.jsx'
import { TotalFailurePanel } from '../components/crear/TotalFailurePanel.jsx'
import { Button } from '@/components/ui/button'

const REDIRECT_DELAY_MS = 2000

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
    if (jobId && job.phase === 'idle') {
      restore(jobId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { jobId, job: jobData, viewModel, outcome, selectedFailedIds, error } = job
  const hasJob = job.phase !== 'idle'
  const isTerminal = job.phase === 'terminal'
  const ovaId = jobData?.ova_id ?? null

  // When done with at least one resource, auto-navigate to workspace.
  useEffect(() => {
    if (!isTerminal || !outcome.anyDone || !ovaId) return
    const go = setTimeout(() => navigate(`/ova/${ovaId}/workspace`), REDIRECT_DELAY_MS)
    return () => clearTimeout(go)
  }, [isTerminal, outcome.anyDone, ovaId, navigate])

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

  // When terminal + anyDone, the workspace CTA replaces the small ResourcePreview.
  const showWorkspaceCta = isTerminal && outcome.anyDone && ovaId

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

      {hasJob && viewModel.length > 0 ? (
        <ProgressPanel
          job={jobData} viewModel={viewModel}
          selectedIds={selectedFailedIds} activeId={activeId}
          onToggle={job.toggleFailed} onRetryOne={job.retryOne}
          onPreview={setPinnedId}
          onSelectAll={job.selectAllFailed} onRetrySelected={job.retrySelected}
        />
      ) : null}

      {isTerminal && outcome.totalFail ? (
        <TotalFailurePanel viewModel={viewModel} onRetryAll={job.retryAll} />
      ) : null}

      {showWorkspaceCta ? (
        /* Full-width workspace redirect card — replaces the small ResourcePreview */
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 flex flex-col sm:flex-row items-center gap-5 shadow-sm">
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-emerald-800">
              ✓ OVA generado exitosamente
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              Abriendo el workspace en breve…
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="shrink-0 bg-emerald-700 hover:bg-emerald-800 text-white gap-2"
            onClick={() => navigate(`/ova/${ovaId}/workspace`)}
          >
            Abrir workspace →
          </Button>
        </div>
      ) : (hasJob && activeResource ? (
        <ResourcePreview jobId={jobId} resource={activeResource} concept={prompt.trim()} />
      ) : null)}

      {isModalOpen ? (
        <PhaseSelectModal
          onClose={closeModal} onConfirm={confirmSelections}
          initialEngage={engageSelection} initialExplore={exploreSelection}
        />
      ) : null}
    </div>
  )
}
