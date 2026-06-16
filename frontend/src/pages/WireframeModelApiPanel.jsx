import { useState } from 'react'

const USER_PROVIDERS = [
  { key: 'groq', name: 'Groq', compat: true, masked: 'gsk_••••••••••••••••', hasKey: true },
  { key: 'openrouter', name: 'OpenRouter', compat: true, masked: '', hasKey: false },
  { key: 'siliconflow', name: 'SiliconFlow', compat: true, masked: '', hasKey: false },
  { key: 'runware', name: 'Runware', compat: false, masked: '', hasKey: false },
  { key: 'fal', name: 'fal.ai', compat: false, masked: '', hasKey: false },
]

export function WireframeModelApiPanel({ onHasKey }) {
  const [revealed, setRevealed] = useState({})
  const [saved, setSaved] = useState(() => Object.fromEntries(USER_PROVIDERS.map(p => [p.key, p.hasKey])))

  const handleSave = (key) => {
    const next = { ...saved, [key]: true }
    setSaved(next)
    onHasKey?.(Object.values(next).some(Boolean))
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mis claves API</p>
        <p className="text-[10px] text-muted-foreground">Solo visibles para ti</p>
      </div>
      {USER_PROVIDERS.map((p, i) => (
        <div key={p.key} className={`flex items-center gap-3 px-5 py-3.5 ${i < USER_PROVIDERS.length - 1 ? 'border-b border-border' : ''}`}>
          <div className="w-32 shrink-0">
            <p className="text-sm font-semibold">{p.name}</p>
            {p.compat && <span className="text-[10px] font-semibold text-blue-600">Compatible OpenAI</span>}
          </div>
          <input
            type={revealed[p.key] ? 'text' : 'password'}
            defaultValue={p.masked || ''}
            placeholder="sk-••••••••••••••••••••"
            className="flex-1 min-w-0 rounded-xl border border-border bg-muted/30 px-3 py-1.5 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button type="button" onClick={() => setRevealed(r => ({ ...r, [p.key]: !r[p.key] }))}
            className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-accent cursor-pointer transition-colors">
            {revealed[p.key] ? 'Ocultar' : 'Ver'}
          </button>
          <button type="button" onClick={() => handleSave(p.key)}
            className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity">
            Guardar
          </button>
          <span className={`shrink-0 text-[10px] font-bold ${saved[p.key] ? 'text-emerald-600' : 'text-muted-foreground/50'}`}>
            {saved[p.key] ? '● OK' : '○'}
          </span>
        </div>
      ))}
    </div>
  )
}
