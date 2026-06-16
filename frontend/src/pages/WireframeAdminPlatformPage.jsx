import { useState } from 'react'
import { WireframeShell } from './WireframeShell.jsx'

const NODES_CFG = [
  { id: 'dir', name: 'Director', color: 'bg-primary', desc: 'Orquesta el flujo completo y valida salidas' },
  { id: 'eng', name: 'Engage Writer', color: 'bg-red-500', desc: 'Genera recursos de la fase Engage' },
  { id: 'exp', name: 'Explore Writer', color: 'bg-amber-500', desc: 'Genera recursos de la fase Explore' },
  { id: 'expl', name: 'Explain Writer', color: 'bg-blue-500', desc: 'Genera recursos de la fase Explain' },
  { id: 'elab', name: 'Elaborate Writer', color: 'bg-purple-500', desc: 'Genera recursos de la fase Elaborate' },
  { id: 'eval', name: 'Evaluate Writer', color: 'bg-emerald-500', desc: 'Genera recursos de la fase Evaluate' },
  { id: 'fmt', name: 'Formatter', color: 'bg-teal-500', desc: 'Post-procesa y valida el HTML final' },
]
const PROVIDERS = [
  { key: 'groq', name: 'Groq', desc: 'LLM principal — Llama 3.3 70B', masked: 'gsk_••••••••••••••••••••••••••', status: 'ok' },
  { key: 'openrouter', name: 'OpenRouter', desc: 'Fallback LLM — múltiples modelos', masked: 'sk-or-••••••••••••••••••••••••', status: 'ok' },
  { key: 'gemini', name: 'Gemini', desc: 'Embeddings RAG — gemini-embedding-2 (768d)', masked: 'AIza••••••••••••••••••••••••', status: 'warning' },
]
const SYS_PARAMS = [
  { label: 'Límite de requests por minuto', value: '30', hint: 'Por usuario autenticado (SlowAPI)' },
  { label: 'Pool size de base de datos', value: '10', hint: 'DB_POOL_SIZE — conexiones Supabase' },
  { label: 'Max overflow pool', value: '10', hint: 'DB_MAX_OVERFLOW — burst connections' },
  { label: 'Máx. generaciones simultáneas', value: '5', hint: 'Por instancia del motor Prometheus' },
]

export function WireframeAdminPlatformPage() {
  const [isAdmin, setIsAdmin] = useState(true)
  const [tab, setTab] = useState('prometheus')
  const [globalMode, setGlobalMode] = useState('normal')
  const [nodeActive, setNodeActive] = useState(() => Object.fromEntries(NODES_CFG.map((n) => [n.id, true])))
  const [revealed, setRevealed] = useState({})
  const tabCls = (on) => `px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${on ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`

  return (
    <WireframeShell isAdmin={isAdmin} setIsAdmin={setIsAdmin}>
      <div className="p-6 space-y-5 max-w-3xl">
        <div>
          <h1 className="font-display text-2xl font-semibold">Plataforma</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configuración del motor Prometheus y servicios externos</p>
        </div>
        <div className="flex gap-1 border-b border-border -mx-1 px-1">
          {[['prometheus', 'Prometheus Engine'], ['apikeys', 'API Keys'], ['sistema', 'Sistema']].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)} className={tabCls(tab === key)}>{label}</button>
          ))}
        </div>

        {tab === 'prometheus' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <p className="text-sm font-semibold">Modo global del motor</p>
              <div className="grid grid-cols-3 gap-2">
                {[['normal', 'Normal', 'Generación estándar, sin revisión extra'], ['critico', 'Crítico', 'Director revisa y valida cada recurso'], ['mantenimiento', 'Mantenimiento', 'Motor pausado — no acepta nuevas OVAs']].map(([key, label, desc]) => (
                  <button key={key} type="button" onClick={() => setGlobalMode(key)}
                    className={`rounded-xl border p-3 text-left cursor-pointer transition-all ${globalMode === key ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:bg-accent'}`}>
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{desc}</p>
                  </button>
                ))}
              </div>
              {globalMode === 'critico' && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-800">
                  ⚠ Modo crítico activo — generación más lenta pero con revisión de calidad por el Director en cada nodo.
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/30">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nodos del orquestador (7)</p>
              </div>
              {NODES_CFG.map((node, i) => (
                <div key={node.id} className={`flex items-center gap-4 px-5 py-3.5 ${i < NODES_CFG.length - 1 ? 'border-b border-border' : ''}`}>
                  <div className={`h-8 w-8 rounded-full shrink-0 ${node.color} flex items-center justify-center`}>
                    <span className="text-white text-[9px] font-bold">{node.name.split(' ').map((n) => n[0]).join('')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{node.name}</p>
                    <p className="text-[11px] text-muted-foreground">{node.desc}</p>
                  </div>
                  <span className={`text-[10px] font-bold mr-2 ${nodeActive[node.id] ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {nodeActive[node.id] ? 'Activo' : 'Pausado'}
                  </span>
                  <button type="button" onClick={() => setNodeActive((p) => ({ ...p, [node.id]: !p[node.id] }))}
                    className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer shrink-0 ${nodeActive[node.id] ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${nodeActive[node.id] ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'apikeys' && (
          <div className="space-y-3">
            {PROVIDERS.map((p) => (
              <div key={p.key} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-semibold">{p.name}</p><p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p></div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${p.status === 'ok' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {p.status === 'ok' ? '● Conectado' : '⚠ Error de cuota'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input type={revealed[p.key] ? 'text' : 'password'} defaultValue={p.masked}
                    className="flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/20" />
                  <button type="button" onClick={() => setRevealed((r) => ({ ...r, [p.key]: !r[p.key] }))}
                    className="rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-accent cursor-pointer transition-colors">
                    {revealed[p.key] ? 'Ocultar' : 'Ver'}
                  </button>
                  <button type="button" className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity">Guardar</button>
                </div>
                <button type="button" className="text-xs text-primary hover:underline cursor-pointer font-medium">Probar conexión →</button>
              </div>
            ))}
          </div>
        )}

        {tab === 'sistema' && (
          <div className="space-y-3">
            {SYS_PARAMS.map((item) => (
              <div key={item.label} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.hint}</p>
                </div>
                <input defaultValue={item.value} className="w-20 rounded-xl border border-border bg-muted/30 px-3 py-1.5 text-sm text-center font-mono outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            ))}
            <button type="button" className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity">
              Guardar configuración
            </button>
          </div>
        )}
      </div>
    </WireframeShell>
  )
}
