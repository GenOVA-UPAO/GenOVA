import { useState } from 'react'

const ALL_MODELS = [
  { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', prov: 'Groq', cat: 'llm', ctx: '128K', pIn: 0.59, pOut: 0.79 },
  { id: 'llama-3.1-8b', name: 'Llama 3.1 8B Instant', prov: 'Groq', cat: 'llm', ctx: '128K', pIn: 0.05, pOut: 0.08 },
  { id: 'deepseek-r1-70b', name: 'DeepSeek R1 Distill 70B', prov: 'Groq', cat: 'reasoning', ctx: '128K', pIn: 0.75, pOut: 0.99 },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', prov: 'OpenRouter', cat: 'llm', ctx: '200K', pIn: 3.00, pOut: 15.00 },
  { id: 'gpt-4o-mini', name: 'GPT-4o mini', prov: 'OpenRouter', cat: 'llm', ctx: '128K', pIn: 0.15, pOut: 0.60 },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', prov: 'OpenRouter', cat: 'llm', ctx: '1M', pIn: 0.10, pOut: 0.40 },
  { id: 'o1-mini', name: 'o1-mini', prov: 'OpenRouter', cat: 'reasoning', ctx: '128K', pIn: 1.10, pOut: 4.40 },
  { id: 'qwen-2.5-72b', name: 'Qwen 2.5 72B', prov: 'SiliconFlow', cat: 'llm', ctx: '32K', pIn: 0.63, pOut: 0.63 },
  { id: 'deepseek-v3', name: 'DeepSeek V3', prov: 'SiliconFlow', cat: 'code', ctx: '64K', pIn: 0.27, pOut: 1.10 },
  { id: 'opencode-v1', name: 'OpenCode v1', prov: 'OpenCode', cat: 'code', ctx: '32K', pIn: 2.00, pOut: 6.00 },
  { id: 'gemini-emb-2', name: 'gemini-embedding-2-preview', prov: 'Gemini', cat: 'emb', ctx: '—', pIn: 0, pOut: 0 },
  { id: 'text-emb-3-small', name: 'text-embedding-3-small', prov: 'OpenRouter', cat: 'emb', ctx: '—', pIn: 0.02, pOut: 0 },
  { id: 'hf-flux-schnell', name: 'FLUX.1-schnell', prov: 'HuggingFace', cat: 'img', ctx: '—', pIn: 0, pOut: 0 },
  { id: 'hf-sdxl', name: 'Stable Diffusion XL', prov: 'HuggingFace', cat: 'img', ctx: '—', pIn: 0, pOut: 0 },
  { id: 'hf-llama', name: 'Llama 3.1 8B', prov: 'HuggingFace', cat: 'llm', ctx: '4K', pIn: 0, pOut: 0 },
  { id: 'runware-flux-schnell', name: 'FLUX.1 Schnell', prov: 'Runware', cat: 'img', ctx: '—', pIn: 0.001, pOut: 0 },
  { id: 'runware-flux-dev', name: 'FLUX.1 Dev', prov: 'Runware', cat: 'img', ctx: '—', pIn: 0.025, pOut: 0 },
  { id: 'fal-flux', name: 'FLUX Schnell', prov: 'fal.ai', cat: 'img', ctx: '—', pIn: 0.003, pOut: 0 },
  { id: 'fal-sdxl', name: 'SDXL Lightning', prov: 'fal.ai', cat: 'img', ctx: '—', pIn: 0.004, pOut: 0 },
]
const CATS_MAP = { llm: 'LLM', reasoning: 'Razonamiento', code: 'Código', emb: 'Embeddings', img: 'Imagen' }
const CC = { llm: 'bg-blue-100 text-blue-700', reasoning: 'bg-purple-100 text-purple-700', code: 'bg-amber-100 text-amber-700', emb: 'bg-emerald-100 text-emerald-700', img: 'bg-rose-100 text-rose-700' }
const PROVS_LIST = [...new Set(ALL_MODELS.map(m => m.prov))]
const fmtPrice = (m) => {
  if (m.pIn === 0 && m.pOut === 0) return 'Gratis'
  if (m.cat === 'img') return `$${m.pIn.toFixed(3)}/img`
  if (m.cat === 'emb') return `$${m.pIn.toFixed(2)}/1M`
  return `$${m.pIn} ↑ · $${m.pOut} ↓`
}
const ICO_TAG = 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z'
const ICO_SRV = 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01'

function FilterDrop({ iconD, label, options, sel, onToggle }) {
  const [open, setOpen] = useState(false)
  const active = sel.size > 0
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${active ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-accent'}`}>
        <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconD} />
        </svg>
        {label}
        {active && <span className="rounded-full bg-primary text-white text-[9px] font-bold px-1.5 leading-5">{sel.size}</span>}
        <svg className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          {/* biome-ignore lint/a11y: backdrop dismiss */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 z-20 rounded-xl border border-border bg-card shadow-xl py-1 min-w-[180px]">
            {options.map(opt => (
              <button key={opt.key} type="button" onClick={() => onToggle(opt.key)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs hover:bg-accent cursor-pointer transition-colors text-left">
                <span className={`h-4 w-4 rounded border shrink-0 flex items-center justify-center ${sel.has(opt.key) ? 'bg-primary border-primary text-white' : 'border-border'}`}>
                  {sel.has(opt.key) && <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </span>
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function WireframeModelCatalog({ canEdit, onSavedChange }) {
  const [q, setQ] = useState('')
  const [cats, setCats] = useState(new Set())
  const [provs, setProvs] = useState(new Set())
  const [saved, setSaved] = useState(new Set())
  const toggle = (setter, key) => setter(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })
  const toggleSave = (m) => {
    const next = new Set(saved); next.has(m.id) ? next.delete(m.id) : next.add(m.id)
    setSaved(next)
    onSavedChange?.(ALL_MODELS.filter(x => next.has(x.id)))
  }
  const catOpts = Object.entries(CATS_MAP).map(([key, label]) => ({ key, label }))
  const provOpts = PROVS_LIST.map(p => ({ key: p, label: p }))
  const filtered = ALL_MODELS.filter(m =>
    (cats.size === 0 || cats.has(m.cat)) &&
    (provs.size === 0 || provs.has(m.prov)) &&
    (q === '' || m.name.toLowerCase().includes(q.toLowerCase()) || m.prov.toLowerCase().includes(q.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2.5 items-center">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar modelo o proveedor..."
          className="rounded-xl border border-border bg-muted/30 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-72" />
        <FilterDrop iconD={ICO_TAG} label="Categoría" options={catOpts} sel={cats} onToggle={k => toggle(setCats, k)} />
        <FilterDrop iconD={ICO_SRV} label="Proveedor" options={provOpts} sel={provs} onToggle={k => toggle(setProvs, k)} />
        {(cats.size > 0 || provs.size > 0) && (
          <button type="button" onClick={() => { setCats(new Set()); setProvs(new Set()) }} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer underline">Limpiar</button>
        )}
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Modelo', 'Proveedor', 'Categoría', 'Contexto', 'Precio', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">Sin resultados</td></tr>}
              {filtered.map((m, i) => (
                <tr key={m.id} className={`hover:bg-accent/30 transition-colors ${i < filtered.length - 1 ? 'border-b border-border' : ''}`}>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{m.name}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{m.prov}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${CC[m.cat]}`}>{CATS_MAP[m.cat]}</span></td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{m.ctx}</td>
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{fmtPrice(m)}</td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <button type="button" onClick={() => toggleSave(m)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${saved.has(m.id) ? 'bg-primary text-primary-foreground hover:opacity-80' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}>
                        {saved.has(m.id) ? '✓ Guardado' : 'Guardar'}
                      </button>
                    ) : <span className="text-[10px] text-muted-foreground/40">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-2.5 bg-muted/30">
          <p className="text-[11px] text-muted-foreground">{filtered.length} de {ALL_MODELS.length} modelos · {saved.size} guardados · precios en USD</p>
        </div>
      </div>
    </div>
  )
}
