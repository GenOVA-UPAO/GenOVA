import { useEffect } from 'react'
import { useLabGeneration } from '../hooks/useLabGeneration.js'
import { PhaseResourceSelector } from '../components/labs/PhaseResourceSelector.jsx'
import { PromptEditor } from '../components/labs/PromptEditor.jsx'
import { ModelSelector } from '../components/labs/ModelSelector.jsx'
import { ResultsPanel } from '../components/labs/ResultsPanel.jsx'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-2">
            <span>🧪</span> Labs — Iteración de Prompts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Prueba y mejora los prompts de generación de recursos, compara modelos de IA y optimiza resultados en tiempo real.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-5 shadow-sm space-y-4">
        <div className="border-b border-border pb-3">
          <h2 className="text-sm font-bold">Selección de Recurso</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Elige la fase y el tipo de recurso didáctico para comenzar a experimentar.</p>
        </div>
        <PhaseResourceSelector
          selectedPhase={lab.selectedPhase}
          selectedType={lab.selectedType}
          onSelect={lab.selectResource}
        />
      </div>

      {lab.selectedPhase ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-1 rounded-xl border border-border bg-background p-5 shadow-sm space-y-4">
              <div className="border-b border-border pb-3">
                <h2 className="text-sm font-bold">Configuración de prueba</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Define los parámetros y los modelos a contrastar.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Concepto educativo</Label>
                  <Input
                    type="text"
                    value={lab.concept}
                    onChange={(e) => lab.setConcept(e.target.value)}
                    placeholder="Ej: Redes Neuronales, Árboles de decisión..."
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
                  <Button
                    onClick={lab.generate}
                    disabled={!canGenerate || lab.generating}
                    className="gap-2"
                  >
                    {lab.generating ? (
                      <>
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Generando...
                      </>
                    ) : (
                      `▶ Generar${totalConfigs > 1 ? ` (${totalConfigs} modelos)` : ''}`
                    )}
                  </Button>
                </div>
                {lab.jobError ? (
                  <Alert variant="destructive">
                    <AlertDescription>{lab.jobError}</AlertDescription>
                  </Alert>
                ) : null}
              </div>
            </div>

            <div className="lg:col-span-2 rounded-xl border border-border bg-background p-5 shadow-sm">
              <div className="border-b border-border pb-3 mb-4">
                <h2 className="text-sm font-bold">Editor del Prompt</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Modifica las instrucciones del agente para esta prueba.</p>
              </div>
              <PromptEditor
                promptText={lab.promptText}
                setPromptText={lab.setPromptText}
                loadingPrompts={lab.loadingPrompts}
                onResetBase={lab.resetToBase}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-b border-border pb-2">
              <h2 className="text-base font-bold">Resultados de la Comparación</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Compara los recursos generados y exporta la versión óptima.</p>
            </div>
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
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background p-8 shadow-sm flex flex-col items-center justify-center min-h-[300px] text-center">
          <span className="text-5xl animate-bounce">🧪</span>
          <h3 className="mt-4 text-base font-bold">Sandbox de Iteración de Prompts</h3>
          <p className="mt-2 text-xs text-muted-foreground max-w-md leading-relaxed">
            Selecciona una fase (Engage o Explore) y un tipo de recurso didáctico de la lista superior para comenzar a experimentar con la calibración del modelo.
          </p>
        </div>
      )}
    </div>
  )
}
