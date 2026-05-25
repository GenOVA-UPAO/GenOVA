import { LlmEnginesPanel } from '../LlmEnginesPanel.jsx'
import { SelectionChips } from './SelectionChips.jsx'
import { UploadsPanel } from './UploadsPanel.jsx'

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
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
      <h2 className="text-base font-semibold text-slate-800">Tema del OVA</h2>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <textarea
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ej: Árboles de decisión para clasificación supervisada en ML"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={isGenerating}
        />
        <button
          type="button"
          onClick={openModal}
          disabled={!canConfigure || isGenerating}
          className="w-full sm:w-auto sm:shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-center"
        >
          {totalResources > 0 ? 'Editar recursos 5E' : 'Configurar recursos 5E'}
        </button>
      </div>

      <p className="text-xs text-slate-400">
        Mínimo {minChars} caracteres · elige hasta 4 recursos por fase (ENGAGE + EXPLORE).
      </p>

      <SelectionChips
        engage={engageSelection}
        explore={exploreSelection}
        onEdit={openModal}
        editable={!isGenerating && !isDone}
      />

      <LlmEnginesPanel />

      <UploadsPanel
        {...uploadsProps}
        disabled={isGenerating}
      />

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

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  )
}
