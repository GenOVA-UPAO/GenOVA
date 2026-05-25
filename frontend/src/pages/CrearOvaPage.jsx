import { useOvaCreation } from '../hooks/useOvaCreation.js'
import { PhaseSelectModal } from '../components/PhaseSelectModal.jsx'
import { PromptPanel } from '../components/crear/PromptPanel.jsx'
import { ProgressPanel } from '../components/crear/ProgressPanel.jsx'
import { ResultsPanel } from '../components/crear/ResultsPanel.jsx'

export function CrearOvaPage() {
  const {
    prompt, setPrompt,
    isModalOpen, openModal, closeModal, confirmSelections,
    engageSelection, exploreSelection, totalResources,
    status, progress, result, partial, error,
    canConfigure, canGenerate,
    generate, reset, handleExportScorm, isExporting,
    uploads, activeUploadsCount, handleFilesSelected, handleRemoveUpload,
    isUploadingFiles, maxUploadFiles, uploadError,
    minChars,
  } = useOvaCreation()

  const isGenerating = status === 'generating'
  const isDone = status === 'done'

  const uploadsProps = {
    uploads,
    activeUploadsCount,
    maxUploadFiles,
    isUploadingFiles,
    uploadError,
    onFilesSelected: handleFilesSelected,
    onRemove: handleRemoveUpload,
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-1 sm:px-0">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Crear OVA</h1>
        <p className="text-sm text-slate-600">
          Define el tema, elige hasta {4 + 4} recursos (4 por fase) y genera tu OVA con IA.
        </p>
      </header>

      <PromptPanel
        prompt={prompt}
        setPrompt={setPrompt}
        minChars={minChars}
        canConfigure={canConfigure}
        canGenerate={canGenerate}
        isGenerating={isGenerating}
        isDone={isDone}
        openModal={openModal}
        engageSelection={engageSelection}
        exploreSelection={exploreSelection}
        totalResources={totalResources}
        generate={generate}
        reset={reset}
        error={error}
        uploadsProps={uploadsProps}
      />

      {(isGenerating || isDone) && (
        <ProgressPanel
          progress={progress}
          engageSelection={engageSelection}
          exploreSelection={exploreSelection}
          partial={partial}
        />
      )}

      {isDone && result && (
        <ResultsPanel result={result} isExporting={isExporting} onExport={handleExportScorm} />
      )}

      {isModalOpen && (
        <PhaseSelectModal
          onClose={closeModal}
          onConfirm={confirmSelections}
          initialEngage={engageSelection}
          initialExplore={exploreSelection}
        />
      )}
    </div>
  )
}
