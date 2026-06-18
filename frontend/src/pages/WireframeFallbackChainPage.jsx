import { useState } from 'react'
import { WireframeShell } from './WireframeShell.jsx'

const CHAINS = {
  llm: { label: 'LLM — Generación OVA', desc: 'Orden de modelos de texto para generación de contenido', entries: [
    { id: 1, provider: 'Groq', model: 'llama-3.3-70b', tag: 'Primario', cond: null },
    { id: 2, provider: 'OpenRouter', model: 'claude-3.5-sonnet', tag: 'Fallback 1', cond: 'Al recibir error de rate limit' },
    { id: 3, provider: 'SiliconFlow', model: 'qwen-2.5-72b', tag: 'Fallback 2', cond: 'Al superar 30s de latencia' },
  ]},
  emb: { label: 'Embeddings — RAG', desc: 'Proveedor de vectorización para búsqueda semántica', entries: [
    { id: 1, provider: 'Gemini', model: 'gemini-embedding-2-preview', tag: 'Primario', cond: null },
    { id: 2, provider: 'OpenAI (OR)', model: 'text-embedding-3-small', tag: 'Fallback 1', cond: 'Al recibir error de API' },
  ]},
  img: { label: 'Imagen — Recursos visuales', desc: 'Generadores de imagen para los recursos del OVA', entries: [
    { id: 1, provider: 'HuggingFace', model: 'FLUX.1-schnell', tag: 'Primario', cond: null },
    { id: 2, provider: 'Runware', model: 'FLUX.1 Schnell', tag: 'Fallback 1', cond: 'Al recibir error de cuota' },
    { id: 3, provider: 'fal.ai', model: 'FLUX Schnell', tag: 'Fallback 2', cond: 'Al recibir error de API' },
  ]},
}
const TAG_CLS = { Primario: 'bg-primary/10 text-primary', 'Fallback 1': 'bg-amber-100 text-amber-700', 'Fallback 2': 'bg-muted text-muted-foreground' }

function ChainCard({ label, desc, entries, canEdit }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        {canEdit && <button type="button" className="text-xs font-medium text-primary hover:underline cursor-pointer shrink-0">Editar cadena</button>}
      </div>
      {entries.map((e, i) => (
        <div key={e.id} className={`flex items-center gap-4 px-5 py-3.5 ${i < entries.length - 1 ? 'border-b border-border' : ''} ${canEdit ? 'hover:bg-accent/30 transition-colors' : ''}`}>
          {canEdit && (
            <svg className="h-4 w-4 text-muted-foreground/40 shrink-0 cursor-grab" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          )}
          <span className="text-sm font-bold text-muted-foreground/40 w-5 shrink-0 text-center">{e.id}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{e.provider} <span className="font-normal text-muted-foreground">— {e.model}</span></p>
            {e.cond && <p className="text-[11px] text-muted-foreground mt-0.5">↳ Activa: {e.cond}</p>}
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TAG_CLS[e.tag]}`}>{e.tag}</span>
          {canEdit && e.id > 1 && (
            <div className="flex gap-1 shrink-0">
              <button type="button" className="rounded-lg border border-border px-2 py-1 text-[10px] hover:bg-accent cursor-pointer transition-colors">↑</button>
              <button type="button" className="rounded-lg border border-destructive/30 px-2 py-1 text-[10px] text-destructive hover:bg-destructive/5 cursor-pointer">✕</button>
            </div>
          )}
        </div>
      ))}
      {canEdit && (
        <div className="px-5 py-3 border-t border-border">
          <button type="button" className="text-xs font-semibold text-primary hover:underline cursor-pointer">+ Agregar modelo de fallback</button>
        </div>
      )}
    </div>
  )
}

export function WireframeFallbackChainPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [hasOwnKey, setHasOwnKey] = useState(false)
  const canEdit = isAdmin || hasOwnKey

  return (
    <WireframeShell isAdmin={isAdmin} setIsAdmin={setIsAdmin}>
      <div className="p-6 space-y-5 max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold">Cadena de fallback</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Orden de prioridad de modelos por caso de uso</p>
          </div>
          {!isAdmin && (
            <button type="button" onClick={() => setHasOwnKey(!hasOwnKey)} className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer border transition-colors ${hasOwnKey ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'border-border text-muted-foreground hover:bg-accent'}`}>
              Demo: {hasOwnKey ? 'clave propia ✓' : 'sin clave propia'}
            </button>
          )}
        </div>
        {!canEdit && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-center gap-3">
            <span className="text-blue-500 shrink-0">🔒</span>
            <div>
              <p className="text-sm font-semibold text-blue-800">Visualizando cadena de Plataforma UPAO (solo lectura)</p>
              <p className="text-xs text-blue-700 mt-0.5">Agrega tu API Key en Configurar modelos para personalizar el fallback.</p>
            </div>
          </div>
        )}
        {Object.entries(CHAINS).map(([key, def]) => (
          <ChainCard key={key} label={def.label} desc={def.desc} entries={def.entries} canEdit={canEdit} />
        ))}
      </div>
    </WireframeShell>
  )
}
