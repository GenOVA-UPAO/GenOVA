import { useEffect } from 'react'
import { useOvaGeneration } from '../hooks/useOvaGeneration.js'
import { formatSize, getUploadBadge } from './ovaUploadUi.js'

export function OvaGenerationForm({ onOvaContentChange }) {
  const {
    activeUploadsCount,
    fieldError,
    handleFilesSelected,
    handleLlmChange,
    handlePromptChange,
    handleRemoveUpload,
    handleSubmit,
    hasLlmAvailable,
    isGenerating,
    isLoadingOptions,
    isSubmitDisabled,
    isUploadingFiles,
    llmOptions,
    maxUploadFiles,
    minPromptChars,
    ovaContent,
    progress,
    prompt,
    promptLength,
    selectedLlm,
    statusMessage,
    uploadError,
    uploads,
  } = useOvaGeneration()

  useEffect(() => {
    onOvaContentChange?.(ovaContent)
  }, [ovaContent, onOvaContentChange])

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Nuevo OVA desde prompt</h2>
        <p className="mt-1 text-sm text-slate-600">
          Ingresa el tema, adjunta tus archivos base y selecciona el modelo LLM.
        </p>

        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Prompt del tema
            <textarea
              rows={6}
              value={prompt}
              onChange={(event) => handlePromptChange(event.target.value)}
              placeholder="Ej: Árboles de decisión para clasificación supervisada"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span>Caracteres: {promptLength} (máximo: N/D)</span>
            <span>Mínimo: {minPromptChars}</span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="block text-sm font-medium text-slate-700" htmlFor="base-files-input">
              Archivos base (PDF, DOCX, PPTX, audio)
            </label>
            <p className="mt-1 text-xs text-slate-600">
              Máximo {maxUploadFiles} archivos, 20MB por archivo. ({activeUploadsCount}/{maxUploadFiles}{' '}
              cargados)
            </p>

            <input
              id="base-files-input"
              type="file"
              className="mt-2 block w-full text-sm text-slate-700"
              multiple
              onChange={(event) => {
                void handleFilesSelected(event.target.files)
                event.target.value = ''
              }}
              disabled={isGenerating || isUploadingFiles}
              accept=".pdf,.docx,.pptx,.mp3,.wav,.m4a,.aac"
            />

            {uploadError ? (
              <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {uploadError}
              </div>
            ) : null}

            {uploads.length > 0 ? (
              <div className="mt-3 space-y-2">
                {uploads.map((upload) => (
                  <div
                    key={upload.clientId}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${getUploadBadge(upload)}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{upload.filename}</p>
                      <p className="mt-0.5 truncate">
                        {formatSize(upload.sizeBytes)} · {upload.message}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isGenerating || upload.status === 'uploading'}
                      onClick={() => {
                        void handleRemoveUpload(upload.clientId)
                      }}
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <label htmlFor="llm-model" className="block text-sm font-medium text-slate-700">
            Modelo LLM
          </label>
          <select
            id="llm-model"
            value={selectedLlm}
            onChange={(event) => handleLlmChange(event.target.value)}
            disabled={isLoadingOptions || !hasLlmAvailable || isGenerating}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {isLoadingOptions ? <option value="">Cargando opciones...</option> : null}

            {!isLoadingOptions && !hasLlmAvailable ? (
              <option value="">Sin modelos disponibles</option>
            ) : null}

            {!isLoadingOptions && hasLlmAvailable
              ? llmOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))
              : null}
          </select>

          {fieldError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {fieldError}
            </div>
          ) : null}

          {statusMessage ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              {statusMessage}
            </div>
          ) : null}

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isSubmitDisabled}
          >
            {isGenerating ? 'Generando OVA...' : 'Generar OVA'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Progreso</h3>

        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-500"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-700">
          <span>{progress.percentage}%</span>
          <span>{progress.stage}</span>
        </div>
      </div>
    </form>
  )
}
