import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { useOvaCreation } from '../../hooks/ova/useOvaCreation.js'
import { PhaseSelectModal } from '../PhaseSelectModal.jsx'
import { CrearOvaChatPanel } from '../crear/CrearOvaChatPanel.jsx'
import { CrearOvaPreviewPanel } from '../crear/CrearOvaPreviewPanel.jsx'

const topbarVariants = {
  hidden: { opacity: 0, y: -20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

const contentVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, delay: 0.1 } }
}

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
    <div className="flex flex-col flex-1 min-h-0 bg-background text-foreground">
      {/* Topbar — same minimal style as edit mode */}
      <motion.header 
        variants={topbarVariants}
        initial="hidden"
        animate="show"
        className="flex items-center gap-4 border-b border-border/50 px-5 py-3 bg-card/60 backdrop-blur-md shrink-0 z-10"
      >
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-display font-semibold truncate text-foreground">Crear OVA</h1>
          <p className="text-xs font-medium text-muted-foreground hidden sm:block mt-0.5">
            Define el tema, configura los recursos y genera con IA.
          </p>
        </div>
      </motion.header>

      {/* Split panels */}
      <motion.div 
        variants={contentVariants}
        initial="hidden"
        animate="show"
        className="flex flex-1 min-h-0 overflow-hidden"
      >
        {/* Left — creation chat panel (420px, always visible) */}
        <div className="w-full sm:w-2/5 md:w-[380px] lg:w-[420px] sm:shrink-0 border-r border-border/50 bg-card/30 flex flex-col overflow-hidden">
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
        <div className="hidden sm:flex flex-col flex-1 min-h-0 overflow-hidden bg-muted/10">
          <CrearOvaPreviewPanel
            jobId={jobId}
            viewModel={viewModel}
            pinnedId={pinnedId}
            onPin={setPinnedId}
          />
        </div>
      </motion.div>

      <AnimatePresence>
        {isModalOpen && (
          <PhaseSelectModal
            onClose={closeModal} onConfirm={confirmSelections}
            initialSelections={selections}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
