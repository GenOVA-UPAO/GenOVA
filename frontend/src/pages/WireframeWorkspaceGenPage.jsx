import { useState } from 'react'
import { useNavigate } from 'react-router'
import { WireframeBanner, STATUS_DOT } from './WireframeUtils.jsx'

const NODES = [
  { id: 'dir', name: 'Director', color: 'bg-primary', status: 'active', task: 'Coordinando 7 recursos' },
  { id: 'eng', name: 'Engage Writer', color: 'bg-red-500', status: 'done', task: 'Video introductorio ✓' },
  { id: 'exp', name: 'Explore Writer', color: 'bg-amber-500', status: 'active', task: 'Generando mapa conceptual...' },
  { id: 'expl', name: 'Explain Writer', color: 'bg-blue-500', status: 'idle', task: 'En espera...' },
  { id: 'elab', name: 'Elaborate Writer', color: 'bg-purple-500', status: 'idle', task: 'En espera...' },
  { id: 'eval', name: 'Evaluate Writer', color: 'bg-emerald-500', status: 'idle', task: 'En espera...' },
  { id: 'fmt', name: 'Formatter', color: 'bg-teal-500', status: 'idle', task: 'En espera...' },
]

const RESOURCES = [
  { label: 'Video introductorio', phase: 'Engage', status: 'done' },
  { label: 'Pregunta detonadora', phase: 'Engage', status: 'done' },
  { label: 'Mapa conceptual', phase: 'Explore', status: 'generating' },
  { label: 'Explicación conceptual', phase: 'Explain', status: 'pending' },
  { label: 'Infografía', phase: 'Explain', status: 'pending' },
  { label: 'Cuestionario', phase: 'Evaluate', status: 'pending' },
  { label: 'Rúbrica de evaluación', phase: 'Evaluate', status: 'pending' },
]

const R_ICON = { done: '✓', generating: '⟳', pending: '○' }
const R_CLS = { done: 'text-emerald-600', generating: 'text-primary animate-spin', pending: 'text-muted-foreground/40' }
const R_TEXT = { done: 'text-foreground', generating: 'text-foreground font-medium', pending: 'text-muted-foreground/50' }

function NodeCard({ node }) {
  return (
    <div className={`rounded-xl border bg-card p-3.5 ${node.status === 'active' ? 'border-primary/40 ring-1 ring-primary/20 shadow-sm' : 'border-border'}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`h-5 w-5 rounded-full shrink-0 ${node.color} opacity-${node.status === 'idle' ? '30' : '100'}`} />
        <span className={`text-xs font-bold ${node.status === 'idle' ? 'text-muted-foreground' : 'text-foreground'}`}>{node.name}</span>
        <div className={`ml-auto h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[node.status]}`} />
      </div>
      <p className="text-[10px] text-muted-foreground leading-snug pl-7">{node.task}</p>
    </div>
  )
}

export function WireframeWorkspaceGenPage() {
  const [tab, setTab] = useState('progress')
  const progress = 35
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <WireframeBanner />
      {/* Top bar */}
      <header className="border-b border-border bg-card z-10">
        <div className="flex h-14 items-center px-6 gap-4">
          <button type="button" onClick={() => navigate('/wireframe4')} className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <p className="font-display text-base font-semibold truncate">Fotosíntesis y Ciclo del Carbono</p>
          <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />Generando...
          </span>
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm font-bold text-primary tabular-nums">{progress}%</span>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-96 shrink-0 flex flex-col border-r border-border">
          {/* Tabs */}
          <div className="flex border-b border-border shrink-0">
            {[['progress', 'Progreso'], ['agents', 'Agentes']].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setTab(key)}
                className={`flex-1 py-3 text-xs font-semibold transition-colors cursor-pointer ${tab === key ? 'border-b-2 border-primary text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'}`}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'progress' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>2 de 7 recursos generados</span><span className="font-bold text-primary">{progress}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>
              </div>
              <div className="space-y-2">
                {RESOURCES.map((r) => (
                  <div key={r.label} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
                    <span className={`text-sm font-bold w-5 text-center shrink-0 ${R_CLS[r.status]}`}>{R_ICON[r.status]}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs truncate ${R_TEXT[r.status]}`}>{r.label}</p>
                      <p className="text-[10px] text-muted-foreground">{r.phase}</p>
                    </div>
                    {r.status === 'generating' && <span className="shrink-0 text-[10px] text-primary font-semibold">Generando</span>}
                    {r.status === 'done' && <span className="shrink-0 text-[10px] text-emerald-600 font-semibold">Listo</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'agents' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              <p className="text-xs text-muted-foreground">7 nodos Prometheus — estado en tiempo real</p>
              {NODES.map((node) => <NodeCard key={node.id} node={node} />)}
            </div>
          )}

          {/* Footer */}
          <div className="shrink-0 border-t border-border p-4 space-y-2">
            <button type="button" disabled={progress < 100} onClick={() => navigate('/wireframe6')}
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-opacity">
              Ir al workspace →
            </button>
            <p className="text-center text-xs text-muted-foreground">Generando... {100 - progress}% restante</p>
          </div>
        </div>

        {/* Right — live preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="shrink-0 border-b border-border px-6 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Vista previa en tiempo real</p>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {RESOURCES.filter((r) => r.status === 'done').map((r) => (
              <div key={r.label} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold">{r.label}</span>
                  <span className="ml-auto text-[10px] rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 font-semibold">{r.phase}</span>
                </div>
                <div className="h-36 bg-gradient-to-br from-primary/5 to-accent-brand/5 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">Preview HTML — {r.label}</span>
                </div>
              </div>
            ))}
            {RESOURCES.filter((r) => r.status === 'generating').map((r) => (
              <div key={r.label} className="rounded-xl border border-primary/30 bg-primary/5 p-8 flex items-center justify-center gap-3">
                <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-sm text-primary font-medium">Generando {r.label}...</span>
              </div>
            ))}
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-xs text-muted-foreground">{RESOURCES.filter((r) => r.status === 'pending').length} recursos pendientes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
