import { useOvaGeneration } from '../hooks/useOvaGeneration.js'

export function OvaGenerationForm() {
  const {
    fieldError,
    handleLlmChange,
    handlePromptChange,
    handleSubmit,
    hasLlmAvailable,
    isGenerating,
    isLoadingOptions,
    isSubmitDisabled,
    llmOptions,
    minPromptChars,
    progress,
    prompt,
    promptLength,
    selectedLlm,
    statusMessage,
  } = useOvaGeneration()

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Nuevo OVA desde prompt</h2>
        <p className="mt-1 text-sm text-slate-600">
          Ingresa el tema y selecciona el modelo LLM para generar material educativo.
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
