import { useRef, useState } from 'react'
import { LlmEnginesPanel } from '../LlmEnginesPanel.jsx'
import { SelectionChips } from './SelectionChips.jsx'
import { FileChip } from './FileChip.jsx'

export function PromptPanel({
  prompt,
  setPrompt,
  minChars,
  canConfigure,
  canGenerate,
  isGenerating,
  isDone,
  openModal,
  engageSelection,
  exploreSelection,
  totalResources,
  generate,
  reset,
  error,
  uploadsProps,
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void uploadsProps.onFilesSelected(e.dataTransfer.files)
    }
  }

  const handleFileChange = (e) => {
    void uploadsProps.onFilesSelected(e.target.files)
    e.target.value = ''
  }

  const hasUploads = uploadsProps.uploads.length > 0
  const canUploadMore = uploadsProps.activeUploadsCount < uploadsProps.maxUploadFiles

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
      <h2 className="text-base font-semibold text-slate-800">Tema del OVA</h2>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex-1 flex flex-col rounded-lg border bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all duration-200 ${
            isDragOver ? 'border-dashed border-indigo-500 bg-indigo-50/20' : 'border-slate-300'
          }`}
        >
          <textarea
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: Árboles de decisión para clasificación supervisada en ML..."
            className="w-full rounded-t-lg px-3 py-2.5 text-sm resize-none focus:outline-none border-0 text-slate-800 placeholder-slate-400"
            disabled={isGenerating}
          />

          {hasUploads && (
            <div className="flex flex-wrap gap-2 px-3 pb-2.5 bg-white">
              {uploadsProps.uploads.map((u) => (
                <FileChip
                  key={u.clientId}
                  file={u}
                  onRemove={uploadsProps.onRemove}
                  disabled={isGenerating || uploadsProps.disabled}
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 bg-slate-50 rounded-b-lg">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.pptx,.mp3,.wav,.m4a,.aac,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleFileChange}
                disabled={isGenerating || uploadsProps.disabled || uploadsProps.isUploadingFiles}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating || uploadsProps.disabled || !canUploadMore}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors flex items-center justify-center cursor-pointer"
                title="Subir archivos de apoyo para RAG"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </button>

              <span className="text-[10px] text-slate-400 font-medium">
                RAG: PDF, Word, PowerPoint, Audio o Imagen ({uploadsProps.activeUploadsCount}/{uploadsProps.maxUploadFiles})
              </span>
            </div>

            {uploadsProps.isUploadingFiles && (
              <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium select-none">
                <div className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <span>Subiendo...</span>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={openModal}
          disabled={!canConfigure || isGenerating}
          className="w-full sm:w-auto sm:shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-center"
        >
          {totalResources > 0 ? 'Editar recursos 5E' : 'Configurar recursos 5E'}
        </button>
      </div>

      {uploadsProps.uploadError && (
        <p className="text-xs text-rose-600 font-medium mt-1">{uploadsProps.uploadError}</p>
      )}

      <p className="text-xs text-slate-400">
        Mínimo {minChars} caracteres · elige hasta 4 recursos por fase (ENGAGE + EXPLORE).
      </p>

      <p className="rounded bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-xs text-amber-800 shadow-sm">
        <b>Video:</b> Sin modelo disponible. Usa HeyGen, Synthesia o Sora con el contenido generado por GenOVA.
      </p>

      <SelectionChips
        engage={engageSelection}
        explore={exploreSelection}
        onEdit={openModal}
        editable={!isGenerating && !isDone}
      />

      <LlmEnginesPanel />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={generate}
          disabled={!canGenerate}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating
            ? 'Generando…'
            : totalResources > 0
              ? `Generar OVA (${totalResources} recurso${totalResources === 1 ? '' : 's'})`
              : 'Generar OVA'}
        </button>
        {isDone && (
          <button
            type="button"
            onClick={reset}
            className="text-sm text-slate-500 hover:text-slate-800 underline self-start sm:self-auto"
          >
            Crear otro OVA
          </button>
        )}
      </div>

      {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}
    </div>
  )
}
