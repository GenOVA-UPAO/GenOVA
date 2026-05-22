import { useOvaCreation } from '../hooks/useOvaCreation.js'
import { PhaseSelectModal } from '../components/PhaseSelectModal.jsx'
import { HtmlPreview } from '../components/engage/HtmlPreview.jsx'

export function CrearOvaPage() {
  const {
    prompt, setPrompt,
    isModalOpen, openModal, closeModal, confirmSelections,
    engageSelection, exploreSelection,
    status, progress, result, error,
    canConfigure, canGenerate,
    generate, reset, handleExportScorm, isExporting,
    uploads, activeUploadsCount, handleFilesSelected, handleRemoveUpload,
    isUploadingFiles, maxUploadFiles, uploadError,
    minChars,
  } = useOvaCreation()

  const isGenerating = status === 'generating'
  const isDone = status === 'done'

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Crear OVA</h1>
        <p className="text-sm text-slate-600 mt-1">
          Escribe el tema, configura los recursos por fase y genera tu OVA con IA.
        </p>
      </header>

      {/* Prompt card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Tema del OVA</h2>

        <div className="flex gap-3 items-start">
          <textarea
            rows={4}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Ej: Árboles de decisión para clasificación supervisada en ML"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isGenerating}
          />
          <button
            type="button"
            onClick={openModal}
            disabled={!canConfigure || isGenerating}
            className="shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors leading-snug text-center"
          >
            Configurar<br />recursos 5E
          </button>
        </div>

        <p className="text-xs text-slate-400">Mínimo {minChars} caracteres para habilitar la configuración.</p>

        {/* Phase picks summary */}
        {(engageSelection || exploreSelection) && (
          <div className="flex flex-wrap items-center gap-2">
            {engageSelection && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
                🎯 {engageSelection.tipo}
              </span>
            )}
            {exploreSelection && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                🔍 {exploreSelection.tipo}
              </span>
            )}
            {!isGenerating && !isDone && (
              <button
                type="button"
                onClick={openModal}
                className="text-xs text-indigo-600 underline hover:text-indigo-800"
              >
                Cambiar
              </button>
            )}
          </div>
        )}

        {/* File upload — collapsible RAG section */}
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-slate-700 flex items-center gap-2 list-none select-none">
            <span className="text-slate-400 group-open:rotate-90 transition-transform inline-block">▶</span>
            Archivos de contexto — RAG (opcional) · {activeUploadsCount}/{maxUploadFiles}
          </summary>
          <div className="mt-3 space-y-2 pl-4">
            <p className="text-xs text-slate-500">
              PDF / DOCX / PPTX · Audio → Whisper STT · Imágenes → Visión IA · 20 MB máx. por archivo.
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.pptx,.mp3,.wav,.m4a,.aac,.jpg,.jpeg,.png,.webp"
              className="text-sm text-slate-700 w-full"
              onChange={e => { void handleFilesSelected(e.target.files); e.target.value = '' }}
              disabled={isGenerating || isUploadingFiles}
            />
            {uploadError && <p className="text-xs text-rose-600">{uploadError}</p>}
            <p className="rounded bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-xs text-amber-800">
              <b>Video:</b> Sin modelo disponible. Usa HeyGen, Synthesia o Sora con el contenido generado por GenOVA.
            </p>
            {uploads.length > 0 && (
              <ul className="space-y-1">
                {uploads.map(u => (
                  <li key={u.clientId} className="flex items-center justify-between rounded border border-slate-200 px-3 py-1.5 text-xs">
                    <span className="truncate text-slate-700">{u.filename}</span>
                    <button
                      type="button"
                      onClick={() => void handleRemoveUpload(u.clientId)}
                      disabled={isGenerating}
                      className="ml-3 text-slate-400 hover:text-rose-600 disabled:opacity-40"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>

        {/* Primary action */}
        <div className="flex items-center gap-4 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={generate}
            disabled={!canGenerate}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? 'Generando…' : 'Generar OVA'}
          </button>
          {isDone && (
            <button type="button" onClick={reset} className="text-sm text-slate-500 hover:text-slate-800 underline">
              Crear otro OVA
            </button>
          )}
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>

      {/* Progress bar */}
      {(isGenerating || isDone) && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <div className="flex justify-between text-xs text-slate-600">
            <span>{progress.label}</span>
            <span className="font-semibold">{progress.pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-700"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {isDone && result && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-800">🎯 Recurso ENGAGE</h2>
            <HtmlPreview result={result.engageResult} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-800">🔍 Recurso EXPLORE</h2>
            <HtmlPreview result={result.exploreResult} />
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-emerald-900">OVA guardado correctamente</h2>
              <p className="text-sm text-emerald-700 mt-0.5">
                Exporta como SCORM 1.2 para importarlo en Canvas, Moodle u otro LMS compatible.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportScorm}
              disabled={isExporting}
              className="shrink-0 px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {isExporting ? 'Exportando…' : 'Exportar a SCORM'}
            </button>
          </div>
        </div>
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
