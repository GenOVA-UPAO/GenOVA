import { useEffect, useState } from 'react'
import { usePhaseGeneration } from '@/features/ova_workspace/hooks/usePhaseGeneration.js'
import { ResourceCard } from '@/features/student/components/engage/ResourceCard'
import { HtmlPreview } from '@/features/student/components/engage/HtmlPreview'
import { Input } from '@/core/components/ui/input'
import { Button } from '@/core/components/ui/button'

export function PhasePage({ phase, emoji, description, fetchRecursos, generateResource }) {
  const [recursos, setRecursos] = useState([])
  const [loadingRecursos, setLoadingRecursos] = useState(true)

  const {
    selectedResource, setSelectedResource,
    concept, setConcept,
    loading, result, error,
    generate, reset,
  } = usePhaseGeneration(generateResource)

  useEffect(() => {
    fetchRecursos()
      .then(d => setRecursos(d.recursos || []))
      .catch(() => setRecursos([]))
      .finally(() => setLoadingRecursos(false))
  }, [fetchRecursos])

  function handleSelect(r) {
    setSelectedResource(r)
    reset()
  }

  const canGenerate = selectedResource && concept.trim().length >= 3 && !loading

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <h1 className="text-2xl font-semibold text-foreground">Fase {phase}</h1>
        </div>
        <p className="text-muted-foreground text-sm">{description}</p>
      </header>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-foreground">1. Elige el tipo de recurso</h2>
        {loadingRecursos ? (
          <p className="text-sm text-muted-foreground">Cargando recursos...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {recursos.map(r => (
              <ResourceCard
                key={r.id}
                resource={r}
                selected={selectedResource?.id === r.id}
                onClick={handleSelect}
              />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-foreground">2. Define el concepto</h2>
        <div className="flex gap-3 flex-wrap">
          <Input
            type="text"
            value={concept}
            onChange={e => { setConcept(e.target.value); reset() }}
            placeholder="Ej: K-Means, Regresión Lineal, Redes Neuronales..."
            className="h-10 flex-1 w-full sm:w-auto sm:min-w-64"
            disabled={loading}
          />
          <Button
            onClick={generate}
            disabled={!canGenerate}
            size="lg"
            className="w-full sm:w-auto px-5"
          >
            {loading ? 'Generando con IA...' : 'Generar recurso'}
          </Button>
        </div>

        {selectedResource && (
          <p className="text-xs text-muted-foreground">
            Recurso: <span className="font-medium text-primary">{selectedResource.emoji} {selectedResource.tipo}</span>
          </p>
        )}

        {loading && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <span>Llamando a Groq + OpenRouter... esto puede tomar 20–60 segundos.</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {result && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-foreground">3. Vista previa</h2>
          <HtmlPreview result={result} />
        </div>
      )}
    </section>
  )
}
