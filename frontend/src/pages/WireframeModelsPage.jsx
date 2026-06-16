import { useState } from 'react'
import { useNavigate } from 'react-router'
import { WireframeShell } from './WireframeShell.jsx'
import { WireframeModelApiPanel } from './WireframeModelApiPanel.jsx'

const CATALOG = {
  llm: [
    { key: 'groq', name: 'Groq', models: [
      { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', ctx: '128K', speed: 'Rápido', quality: 'Alto' },
      { id: 'llama-3.1-8b', name: 'Llama 3.1 8B Instant', ctx: '128K', speed: 'Ultra', quality: 'Medio' },
    ]},
    { key: 'openrouter', name: 'OpenRouter', models: [
      { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', ctx: '200K', speed: 'Moderado', quality: 'Muy alto' },
      { id: 'gpt-4o-mini', name: 'GPT-4o mini', ctx: '128K', speed: 'Rápido', quality: 'Alto' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', ctx: '1M', speed: 'Muy rápido', quality: 'Alto' },
    ]},
    { key: 'siliconflow', name: 'SiliconFlow', models: [
      { id: 'qwen-2.5-72b', name: 'Qwen 2.5 72B', ctx: '32K', speed: 'Rápido', quality: 'Alto' },
      { id: 'deepseek-v3', name: 'DeepSeek V3', ctx: '64K', speed: 'Moderado', quality: 'Muy alto' },
    ]},
  ],
  emb: [
    { key: 'gemini', name: 'Gemini', models: [
      { id: 'gemini-emb-2', name: 'gemini-embedding-2-preview', ctx: '—', speed: '768d', quality: 'Recomendado' },
    ]},
    { key: 'openai', name: 'OpenAI (via OR)', models: [
      { id: 'text-emb-3-small', name: 'text-embedding-3-small', ctx: '—', speed: '1536d', quality: 'Alto' },
    ]},
  ],
  img: [
    { key: 'runware', name: 'Runware', models: [
      { id: 'flux-schnell', name: 'FLUX.1 Schnell', ctx: '—', speed: 'Ultra', quality: 'Alto' },
      { id: 'dreamshaper-xl', name: 'Dreamshaper XL', ctx: '—', speed: 'Rápido', quality: 'Artístico' },
    ]},
    { key: 'fal', name: 'fal.ai', models: [
      { id: 'fal-flux', name: 'FLUX Schnell', ctx: '—', speed: 'Ultra', quality: 'Alto' },
      { id: 'sdxl-lightning', name: 'SDXL Lightning', ctx: '—', speed: 'Rápido', quality: 'Medio' },
    ]},
  ],
}
const USE_LABELS = { llm: 'LLM — Generación', emb: 'Embeddings — RAG', img: 'Imagen' }
const ACTIVE_DEF = { llm: 'llama-3.3-70b', emb: 'gemini-emb-2', img: 'flux-schnell' }
const SPD = { Ultra: 'bg-purple-100 text-purple-700', 'Muy rápido': 'bg-blue-100 text-blue-700', Rápido: 'bg-emerald-100 text-emerald-700', Moderado: 'bg-amber-100 text-amber-700' }

export function WireframeModelsPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [hasOwnKey, setHasOwnKey] = useState(false)
  const [useCase, setUseCase] = useState('llm')
  const [provider, setProvider] = useState('groq')
  const [active, setActive] = useState({ ...ACTIVE_DEF })
  const navigate = useNavigate()
  const canEdit = hasOwnKey || isAdmin
  const tabCls = (on) => `px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${on ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`
  const catalog = CATALOG[useCase]
  const curProvider = catalog.find(p => p.key === provider) ?? catalog[0]

  return (
    <WireframeShell isAdmin={isAdmin} setIsAdmin={setIsAdmin}>
      <div className="p-6 space-y-5 max-w-4xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold">Configurar modelos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Selecciona los modelos de IA para la generación de OVAs</p>
          </div>
          {!isAdmin && (
            <button type="button" onClick={() => setHasOwnKey(!hasOwnKey)} className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer border transition-colors ${hasOwnKey ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'border-border text-muted-foreground hover:bg-accent'}`}>
              Demo: {hasOwnKey ? 'clave propia ✓' : 'sin clave propia'}
            </button>
          )}
        </div>
        {isAdmin ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
            <span className="text-primary text-lg">⚙</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary">Configuración global gestionada en Plataforma</p>
              <p className="text-xs text-muted-foreground mt-0.5">Los modelos por defecto para todos los usuarios se configuran en Administración → Plataforma.</p>
            </div>
            <button type="button" onClick={() => navigate('/wireframe9')} className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer">Ir a Plataforma →</button>
          </div>
        ) : !hasOwnKey && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-center gap-3">
            <span className="text-blue-500 shrink-0">ℹ</span>
            <div>
              <p className="text-sm font-semibold text-blue-800">Usando configuración de Plataforma UPAO</p>
              <p className="text-xs text-blue-700 mt-0.5">Los modelos activos son los del administrador. Agrega tu API Key para personalizar.</p>
            </div>
          </div>
        )}
        {!isAdmin && <WireframeModelApiPanel onHasKey={setHasOwnKey} />}
        <div className={`space-y-4 ${!canEdit ? 'opacity-60 pointer-events-none select-none' : ''}`}>
          {!canEdit && <div className="rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-center text-xs text-muted-foreground">🔒 Agrega una API Key para seleccionar modelos personalizados</div>}
          <div className="flex gap-2">
            {Object.entries(USE_LABELS).map(([key, label]) => (
              <button key={key} type="button" onClick={() => { setUseCase(key); setProvider(CATALOG[key][0].key) }} className={tabCls(useCase === key)}>{label}</button>
            ))}
          </div>
          <div className="grid grid-cols-[9rem_1fr] gap-4">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Proveedor</p>
              {catalog.map((p) => (
                <button key={p.key} type="button" onClick={() => setProvider(p.key)}
                  className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold text-left cursor-pointer transition-all ${provider === p.key ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'}`}>
                  {p.name}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Modelos — {curProvider?.name}</p>
              {curProvider?.models.map((m) => (
                <button key={m.id} type="button" onClick={() => setActive(a => ({ ...a, [useCase]: m.id }))}
                  className={`w-full rounded-xl border p-3.5 text-left cursor-pointer transition-all ${active[useCase] === m.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-card hover:bg-accent'}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{m.name}</p>
                    {active[useCase] === m.id && <span className="rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold">ACTIVO</span>}
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${SPD[m.speed] ?? 'bg-muted text-muted-foreground'}`}>{m.speed}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">Contexto: {m.ctx} · Calidad: {m.quality}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Configuración activa</p>
          </div>
          {Object.entries(USE_LABELS).map(([key, label], i, arr) => (
            <div key={key} className={`flex items-center gap-4 px-5 py-3 ${i < arr.length - 1 ? 'border-b border-border' : ''}`}>
              <p className="text-xs font-medium flex-1">{label}</p>
              <p className="text-xs font-semibold text-primary font-mono">{active[key]}</p>
              <span className={`text-[10px] rounded-full px-2 py-0.5 font-semibold ${hasOwnKey || isAdmin ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {hasOwnKey ? 'Propia' : isAdmin ? 'Global' : 'Plataforma'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </WireframeShell>
  )
}
