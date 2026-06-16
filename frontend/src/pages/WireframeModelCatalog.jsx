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
const CATS = { all: 'Todos', llm: 'LLM', reasoning: 'Razonamiento', code: 'Código', emb: 'Embeddings', img: 'Imagen' }
const CC = {
  llm: 'bg-blue-100 text-blue-700',
  reasoning: 'bg-purple-100 text-purple-700',
  code: 'bg-amber-100 text-amber-700',
  emb: 'bg-emerald-100 text-emerald-700',
  img: 'bg-rose-100 text-rose-700',
}
const PROVS = ['Todos', ...new Set(ALL_MODELS.map(m => m.prov))]
const fmtPrice = (m) => {
  if (m.pIn === 0 && m.pOut === 0) return 'Gratis'
  if (m.cat === 'img') return `$${m.pIn.toFixed(3)}/img`
  if (m.cat === 'emb') return `$${m.pIn.toFixed(2)}/1M`
  return `$${m.pIn} ↑ · $${m.pOut} ↓`
}

export function WireframeModelCatalog({ canEdit }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [prov, setProv] = useState('Todos')
  const chipCls = (on) => `rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors border ${on ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'}`
  const filtered = ALL_MODELS.filter(m =>
    (cat === 'all' || m.cat === cat) &&
    (prov === 'Todos' || m.prov === prov) &&
    (q === '' || m.name.toLowerCase().includes(q.toLowerCase()) || m.prov.toLowerCase().includes(q.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre de modelo o proveedor..."
          className="rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 w-full max-w-md" />
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1 shrink-0">Categoría</span>
          {Object.entries(CATS).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setCat(key)} className={chipCls(cat === key)}>{label}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1 shrink-0">Proveedor</span>
          {PROVS.map(p => (
            <button key={p} type="button" onClick={() => setProv(p)} className={chipCls(prov === p)}>{p}</button>
          ))}
        </div>
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
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">Sin resultados para esa búsqueda</td></tr>
              )}
              {filtered.map((m, i) => (
                <tr key={m.id} className={`hover:bg-accent/30 transition-colors ${i < filtered.length - 1 ? 'border-b border-border' : ''}`}>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{m.name}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{m.prov}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${CC[m.cat]}`}>{CATS[m.cat]}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{m.ctx}</td>
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{fmtPrice(m)}</td>
                  <td className="px-4 py-3">
                    {canEdit && (
                      <button type="button" className="rounded-lg bg-primary/10 text-primary px-2.5 py-1 text-xs font-semibold hover:bg-primary/20 cursor-pointer transition-colors whitespace-nowrap">
                        Usar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-2.5 bg-muted/30">
          <p className="text-[11px] text-muted-foreground">{filtered.length} de {ALL_MODELS.length} modelos · precios en USD por 1M tokens (texto) o por inferencia (imagen)</p>
        </div>
      </div>
    </div>
  )
}
