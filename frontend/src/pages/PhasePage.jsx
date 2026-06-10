import { useEffect, useState } from 'react'
import { usePhaseGeneration } from '../../hooks/labs/usePhaseGeneration.js'
import { ResourceCard } from '../engage/ResourceCard.jsx'
import { HtmlPreview } from '../engage/HtmlPreview.jsx'

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
          <h1 className="text-2xl font-semibold text-slate-900">Fase {phase}</h1>
        </div>
        <p className="text-slate-600 text-sm">{description}</p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-slate-800">1. Elige el tipo de recurso</h2>
        {loadingRecursos ? (
          <p className="text-sm text-slate-500">Cargando recursos...</p>
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

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-slate-800">2. Define el concepto</h2>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={concept}
            onChange={e => { setConcept(e.target.value); reset() }}
            placeholder="Ej: K-Means, Regresión Lineal, Redes Neuronales..."
            className="flex-1 min-w-64 rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={loading}
          />
          <button
            onClick={generate}
            disabled={!canGenerate}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Generando con IA...' : 'Generar recurso'}
          </button>
        </div>

        {selectedResource && (
          <p className="text-xs text-slate-500">
            Recurso: <span className="font-medium text-indigo-600">{selectedResource.emoji} {selectedResource.tipo}</span>
          </p>
        )}

        {loading && (
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
            <span>Llamando a Groq + OpenRouter... esto puede tomar 20–60 segundos.</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {result && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-slate-800">3. Vista previa</h2>
          <HtmlPreview result={result} />
        </div>
      )}
    </section>
  )
}
