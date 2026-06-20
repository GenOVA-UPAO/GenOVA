import { useState } from 'react'
import { WireframeShell } from '@/features/wireframes/WireframeShell.jsx'
import { WireframeModelApiPanel } from '@/features/wireframes/WireframeModelApiPanel.jsx'
import { WireframeModelCatalog } from '@/features/wireframes/WireframeModelCatalog.jsx'

const TASKS = [
  { key: 'gen', label: 'Generación', desc: 'Redacción de contenido OVA',
    d: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  { key: 'reason', label: 'Razonamiento', desc: 'Análisis y planificación (Director)',
    d: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { key: 'code', label: 'Código', desc: 'Generación HTML / SCORM',
    d: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
  { key: 'emb', label: 'Embeddings', desc: 'Vectorización RAG',
    d: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4' },
  { key: 'img', label: 'Imagen', desc: 'Recursos visuales del OVA',
    d: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { key: 'video', label: 'Video', desc: 'Clips multimedia', disabled: true,
    d: 'M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
]
const TASK_CAT = { gen: 'llm', reason: 'reasoning', code: 'code', emb: 'emb', img: 'img' }
const TASK_INIT = {
  gen: { name: 'Llama 3.3 70B', prov: 'Groq' },
  reason: { name: 'DeepSeek R1 Distill 70B', prov: 'Groq' },
  code: { name: 'DeepSeek V3', prov: 'SiliconFlow' },
  emb: { name: 'gemini-embedding-2-preview', prov: 'Gemini' },
  img: { name: 'FLUX.1-schnell', prov: 'HuggingFace' },
}

export function WireframeModelsPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [hasOwnKey, setHasOwnKey] = useState(false)
  const [mainTab, setMainTab] = useState('assign')
  const [savedModels, setSavedModels] = useState([])
  const [taskActive, setTaskActive] = useState({ ...TASK_INIT })
  const [changingTask, setChangingTask] = useState(null)
  const canEdit = hasOwnKey || isAdmin
  const tabCls = (on) => `px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${on ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`

  return (
    <WireframeShell isAdmin={isAdmin} setIsAdmin={setIsAdmin}>
      <div className="p-6 space-y-5 max-w-5xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold">Modelos de IA</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Guarda modelos del catálogo y asígnalos a cada tarea</p>
          </div>
          {!isAdmin && (
            <button type="button" onClick={() => setHasOwnKey(!hasOwnKey)} className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer border transition-colors ${hasOwnKey ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'border-border text-muted-foreground hover:bg-accent'}`}>
              Demo: {hasOwnKey ? 'clave propia ✓' : 'sin clave propia'}
            </button>
          )}
        </div>
        <div className="flex gap-1 border-b border-border -mx-1 px-1">
          <button type="button" onClick={() => setMainTab('assign')} className={tabCls(mainTab === 'assign')}>
            Asignación por tarea
          </button>
          <button type="button" onClick={() => setMainTab('catalog')} className={tabCls(mainTab === 'catalog')}>
            Catálogo de modelos
            {savedModels.length > 0 && <span className="ml-1.5 rounded-full bg-primary text-white text-[9px] font-bold px-1.5 leading-5">{savedModels.length}</span>}
          </button>
        </div>

        {mainTab === 'assign' && (
          <div className="space-y-5">
            {isAdmin ? (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
                <span className="text-primary text-lg">⚙</span>
                <p className="text-sm text-primary font-medium flex-1">Configuración global — se aplica como default para todos los usuarios que no tengan clave propia.</p>
              </div>
            ) : !hasOwnKey && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-center gap-3">
                <span className="text-blue-500 shrink-0">ℹ</span>
                <div>
                  <p className="text-sm font-semibold text-blue-800">Usando configuración de Plataforma UPAO</p>
                  <p className="text-xs text-blue-700 mt-0.5">Agrega tu API Key para personalizar los modelos de cada tarea.</p>
                </div>
              </div>
            )}
            {!isAdmin && <WireframeModelApiPanel onHasKey={setHasOwnKey} />}
            {changingTask && (
              <>
                {/* biome-ignore lint/a11y: backdrop dismiss */}
                <div className="fixed inset-0 z-20" onClick={() => setChangingTask(null)} />
              </>
            )}
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${!canEdit ? 'opacity-60 pointer-events-none' : ''}`}>
              {TASKS.map((t) => {
                const opts = savedModels.filter(m => m.cat === TASK_CAT[t.key])
                return (
                  <div key={t.key} className={`rounded-2xl border bg-card p-4 space-y-3 ${t.disabled ? 'opacity-50 border-dashed border-border' : 'border-border'}`}>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={t.d} />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight">{t.label}</p>
                        <p className="text-[11px] text-muted-foreground leading-tight">{t.desc}</p>
                      </div>
                    </div>
                    {t.disabled ? (
                      <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-center">
                        <p className="text-xs font-semibold text-muted-foreground">Próximamente</p>
                      </div>
                    ) : (
                      <>
                        <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                          <p className="text-xs font-semibold truncate">{taskActive[t.key]?.name ?? '—'}</p>
                          <p className="text-[10px] text-muted-foreground">{taskActive[t.key]?.prov ?? '—'}</p>
                        </div>
                        <div className="relative">
                          <button type="button" onClick={() => setChangingTask(c => c === t.key ? null : t.key)}
                            className="w-full rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent cursor-pointer transition-colors text-center">
                            Cambiar modelo
                          </button>
                          {changingTask === t.key && (
                            <div className="absolute left-0 bottom-full mb-1 z-30 rounded-xl border border-border bg-card shadow-xl py-1 min-w-[220px]">
                              {opts.length === 0 ? (
                                <div className="px-3 py-3 space-y-1.5">
                                  <p className="text-xs text-muted-foreground">Sin modelos guardados para esta tarea.</p>
                                  <button type="button" onClick={() => { setMainTab('catalog'); setChangingTask(null) }} className="text-xs text-primary hover:underline cursor-pointer font-semibold">Guardar desde el catálogo →</button>
                                </div>
                              ) : opts.map(m => (
                                <button key={m.id} type="button"
                                  onClick={() => { setTaskActive(a => ({ ...a, [t.key]: { name: m.name, prov: m.prov } })); setChangingTask(null) }}
                                  className="flex flex-col w-full px-3 py-2.5 text-left hover:bg-accent cursor-pointer transition-colors border-t border-border first:border-0">
                                  <span className="text-xs font-semibold">{m.name}</span>
                                  <span className="text-[10px] text-muted-foreground">{m.prov}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {mainTab === 'catalog' && <WireframeModelCatalog canEdit={canEdit} onSavedChange={setSavedModels} />}
      </div>
    </WireframeShell>
  )
}
