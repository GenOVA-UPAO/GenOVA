import { useEffect } from 'react'
import { useLabGeneration } from '../hooks/useLabGeneration.js'
import { PhaseResourceSelector } from '../components/labs/PhaseResourceSelector.jsx'
import { PromptEditor } from '../components/labs/PromptEditor.jsx'
import { ModelSelector } from '../components/labs/ModelSelector.jsx'
import { ResultsPanel } from '../components/labs/ResultsPanel.jsx'

export function LabsPage() {
  const lab = useLabGeneration()

  useEffect(() => {
    lab.loadModels()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const canGenerate =
    lab.selectedPhase &&
    lab.selectedType &&
    lab.concept.trim().length >= 3 &&
    lab.modelA &&
    lab.promptText.trim().length > 0

  const totalConfigs = lab.modelA && lab.modelB ? 2 : lab.modelA ? 1 : 0

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧪</span>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Labs — Iteración de Prompts</h1>
            <p className="text-xs text-slate-500">
              Prueba y mejora los prompts de generación de recursos. Solo administradores.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Resource selector */}
        <aside className="w-64 flex-shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4">
          <PhaseResourceSelector
            selectedPhase={lab.selectedPhase}
            selectedType={lab.selectedType}
            onSelect={lab.selectResource}
          />
        </aside>

        {/* Center: Prompt editor */}
        <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4">
          {lab.selectedPhase ? (
            <PromptEditor
              promptText={lab.promptText}
              setPromptText={lab.setPromptText}
              loadingPrompts={lab.loadingPrompts}
              onResetBase={lab.resetToBase}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-center text-sm text-slate-400">
                Selecciona un recurso<br />para editar su prompt
              </p>
            </div>
          )}
        </div>

        {/* Right: Config + Results */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
          {lab.selectedPhase ? (
            <div className="space-y-4">
              {/* Config row */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <h2 className="text-sm font-semibold text-slate-700">Configuración de prueba</h2>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Concepto educativo</label>
                  <input
                    type="text"
                    value={lab.concept}
                    onChange={(e) => lab.setConcept(e.target.value)}
                    placeholder="Ej: Redes Neuronales, Árboles de decisión..."
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
                <ModelSelector
                  models={lab.models}
                  modelA={lab.modelA}
                  setModelA={lab.setModelA}
                  modelB={lab.modelB}
                  setModelB={lab.setModelB}
                />
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={lab.generate}
                    disabled={!canGenerate || lab.generating}
                    className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {lab.generating ? (
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Generando...
                      </span>
                    ) : (
                      `▶ Generar${totalConfigs > 1 ? ` (${totalConfigs} modelos)` : ''}`
                    )}
                  </button>
                </div>
                {lab.jobError && (
                  <p className="rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-600">
                    {lab.jobError}
                  </p>
                )}
              </div>

              {/* Results */}
              <ResultsPanel
                results={lab.results}
                generating={lab.generating}
                total={totalConfigs || 2}
                winnerId={lab.winnerId}
                onSelectWinner={lab.selectWinner}
                onExportScorm={lab.handleExportScorm}
                improving={lab.improving}
                improvedPrompt={lab.improvedPrompt}
                onImprovePrompt={lab.handleImprovePrompt}
                onApplyImproved={lab.applyImprovedPrompt}
                canImprove={Boolean(lab.winnerId)}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-4xl">🧪</p>
                <p className="mt-3 text-sm font-medium text-slate-600">Labs de prompts</p>
                <p className="mt-1 text-xs text-slate-400 max-w-xs">
                  Selecciona una fase y tipo de recurso para comenzar a iterar prompts y comparar modelos.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
