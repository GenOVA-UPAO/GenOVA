import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { useOvaCreation } from '../hooks/useOvaCreation.js'
import { useResourceContent } from '../hooks/useResourceContent.js'
import { PhaseSelectModal } from '../components/PhaseSelectModal.jsx'
import { PromptPanel } from '../components/crear/PromptPanel.jsx'
import { ProgressPanel } from '../components/crear/ProgressPanel.jsx'
import { TotalFailurePanel } from '../components/crear/TotalFailurePanel.jsx'

const REDIRECT_DELAY_MS = 2000

/**
 * Right-panel live preview: renders the active done resource as a full-height
 * sandboxed iframe while other resources continue generating.
 */
function LivePreview({ jobId, resourceId }) {
  const enabled = Boolean(jobId && resourceId)
  const { content, loading } = useResourceContent(jobId, resourceId, enabled)
  const iframeRef = useRef(null)

  useEffect(() => {
    if (!content || !iframeRef.current) return
    const url = URL.createObjectURL(new Blob([content], { type: 'text/html' }))
    iframeRef.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [content])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-violet-500" />
      </div>
    )
  }

  return (
    <iframe
      ref={iframeRef}
      title="Vista previa del recurso"
      className="w-full h-full border-0 block"
      sandbox="allow-scripts allow-same-origin"
    />
  )
}

function EmptyRight() {
  return (
    <div className="flex flex-col h-full items-center justify-center gap-3 select-none">
      <div className="text-4xl opacity-20">◧</div>
      <p className="text-sm text-muted-foreground">
        La vista previa aparecerá aquí mientras se genera tu OVA.
      </p>
    </div>
  )
}

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

  // Auto-navigate to workspace when generation succeeds.
  useEffect(() => {
    if (!isTerminal || !outcome.anyDone || !ovaId) return
    const go = setTimeout(() => navigate(`/ova/${ovaId}/workspace`), REDIRECT_DELAY_MS)
    return () => clearTimeout(go)
  }, [isTerminal, outcome.anyDone, ovaId, navigate])

  // Active resource for right-panel preview (pinned pick or first done).
  const [pinnedId, setPinnedId] = useState(null)
  const firstDoneId = viewModel.find((r) => r.status === 'check')?.id ?? null
  const pinnedIsDone = viewModel.some((r) => r.id === pinnedId && r.status === 'check')
  const activeId = pinnedIsDone ? pinnedId : firstDoneId

  const showWorkspaceCta = isTerminal && outcome.anyDone && ovaId
  const showLivePreview = hasJob && Boolean(activeId)

  const uploadsProps = {
    uploads, activeUploadsCount, maxUploadFiles, isUploadingFiles, uploadError,
    onFilesSelected: handleFilesSelected, onRemove: handleRemoveUpload,
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Top bar — matches workspace style */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-2.5 bg-background shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold">Crear OVA</h1>
          <p className="text-xs text-muted-foreground truncate hidden sm:block">
            Define el tema, elige hasta 8 recursos (4 por fase) y genera con IA.
          </p>
        </div>
      </header>

      {/* Split — collapses to tabs on mobile */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left panel: prompt config + generation progress */}
        <div className="w-full sm:w-[420px] sm:shrink-0 border-r border-border flex flex-col overflow-hidden sm:flex-none">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
          </div>
        </div>

        {/* Right panel: live resource preview or workspace CTA */}
        <div className="hidden sm:flex flex-col flex-1 min-h-0 overflow-hidden bg-muted/20">
          {showWorkspaceCta ? (
            <div className="shrink-0 border-b border-emerald-200 bg-emerald-50 px-6 py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-800">✓ OVA generado</p>
                <p className="text-xs text-emerald-700">Abriendo el workspace en breve…</p>
              </div>
              <Button
                type="button"
                size="sm"
                className="shrink-0 bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
                onClick={() => navigate(`/ova/${ovaId}/workspace`)}
              >
                Abrir workspace →
              </Button>
            </div>
          ) : null}

          <div className="flex-1 min-h-0 overflow-hidden">
            {showLivePreview ? (
              <LivePreview jobId={jobId} resourceId={activeId} />
            ) : (
              <EmptyRight />
            )}
          </div>
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
