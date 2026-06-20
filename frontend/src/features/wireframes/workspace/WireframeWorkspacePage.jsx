import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { WireframeBanner, STATUS_DOT } from '@/features/wireframes/shared/WireframeUtils.jsx'
import { WireframeWorkspaceEditorPanel } from '@/features/wireframes/workspace/WireframeWorkspaceEditorPanel.jsx'
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
  { label: 'Caso de aplicación', phase: 'Elaborate', status: 'pending' },
  { label: 'Cuestionario', phase: 'Evaluate', status: 'pending' },
  { label: 'Rúbrica de evaluación', phase: 'Evaluate', status: 'pending' },
]
const CODE_PHASES = [
  { phase: 'Engage', cls: 'text-red-600 bg-red-50 border-red-200', items: ['Video introductorio', 'Pregunta detonadora'] },
  { phase: 'Explore', cls: 'text-amber-600 bg-amber-50 border-amber-200', items: ['Mapa conceptual'] },
  { phase: 'Explain', cls: 'text-blue-600 bg-blue-50 border-blue-200', items: ['Explicación conceptual', 'Infografía'] },
  { phase: 'Elaborate', cls: 'text-purple-600 bg-purple-50 border-purple-200', items: ['Caso de aplicación'] },
  { phase: 'Evaluate', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200', items: ['Cuestionario', 'Rúbrica'] },
]
const R_CLS = { done: 'text-emerald-600', generating: 'text-primary', pending: 'text-muted-foreground/40' }
const R_ICO = { done: '✓', generating: '⟳', pending: '○' }
const tabCls = (on) => `flex-1 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${on ? 'border-b-2 border-primary text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'}`
function NodeCard({ node }) {
  return (
    <div className={`rounded-xl border bg-card p-3 ${node.status === 'active' ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border'}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`h-5 w-5 rounded-full shrink-0 ${node.color} ${node.status === 'idle' ? 'opacity-30' : ''}`} />
        <span className={`text-xs font-bold ${node.status === 'idle' ? 'text-muted-foreground' : 'text-foreground'}`}>{node.name}</span>
        <div className={`ml-auto h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[node.status]}`} />
      </div>
      <p className="text-[10px] text-muted-foreground pl-7">{node.task}</p>
    </div>
  )
}

export function WireframeWorkspacePage() {
  const { pathname } = useLocation()
  const [phase, setPhase] = useState(pathname === '/wireframe6' ? 'edit' : 'gen')
  const [lt, setLt] = useState(pathname === '/wireframe6' ? 'chat' : 'progress')
  const [rt, setRt] = useState('preview')
  const progress = 35
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <WireframeBanner />
      <header className="border-b border-border bg-card shrink-0">
        <div className="flex h-14 items-center px-6 gap-4">
          <button type="button" onClick={() => navigate('/wireframe3')} className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <p className="font-display text-base font-semibold truncate flex-1">Fotosíntesis y Ciclo del Carbono</p>
          {phase === 'gen' ? (
            <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />Generando...
            </span>
          ) : (
            <>
              <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold border border-border">v1.3</span>
              <button type="button" className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent cursor-pointer transition-colors">SCORM</button>
              <button type="button" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity">Publicar</button>
            </>
          )}
          {phase === 'gen' && (
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <div className="h-2 w-28 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>
              <span className="text-sm font-bold text-primary tabular-nums">{progress}%</span>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-96 shrink-0 flex flex-col border-r border-border">
          {phase === 'gen' ? (
            <>
              <div className="flex border-b border-border shrink-0">
                {[['progress', 'Progreso'], ['agents', 'Agentes']].map(([key, label]) => (
                  <button key={key} type="button" onClick={() => setLt(key)} className={tabCls(lt === key)}>{label}</button>
                ))}
              </div>
              {lt === 'progress' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>2 de 7 recursos</span><span className="font-bold text-primary">{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden mb-2"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>
                  {RESOURCES.map((r) => (
                    <div key={r.label} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
                      <span className={`text-sm font-bold w-5 text-center shrink-0 ${R_CLS[r.status]}`}>{R_ICO[r.status]}</span>
                      <div className="min-w-0 flex-1"><p className="text-xs truncate">{r.label}</p><p className="text-[10px] text-muted-foreground">{r.phase}</p></div>
                    </div>
                  ))}
                </div>
              )}
              {lt === 'agents' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                  <p className="text-xs text-muted-foreground">7 nodos Prometheus — en tiempo real</p>
                  {NODES.map((node) => <NodeCard key={node.id} node={node} />)}
                </div>
              )}
              <div className="shrink-0 border-t border-border p-4">
                <button type="button" onClick={() => { setPhase('edit'); setLt('chat') }}
                  className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity">
                  Generación completa → Ir al editor
                </button>
                <p className="text-center text-[10px] text-muted-foreground mt-1.5">Demo: simula generación completada</p>
              </div>
            </>
          ) : (
            <WireframeWorkspaceEditorPanel lt={lt} setLt={setLt} />
          )}
        </div>

        <div className="w-1 shrink-0 bg-border cursor-col-resize hover:bg-primary/40 transition-colors" />

        <div className="flex-1 flex flex-col overflow-hidden">
          {phase === 'gen' ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Vista previa en tiempo real</p>
              {RESOURCES.filter((r) => r.status === 'done').map((r) => (
                <div key={r.label} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /><span className="text-xs font-semibold">{r.label}</span>
                    <span className="ml-auto text-[10px] rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 font-semibold">{r.phase}</span>
                  </div>
                  <div className="h-28 bg-gradient-to-br from-primary/5 to-accent-brand/5 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">Preview — {r.label}</span>
                  </div>
                </div>
              ))}
              {RESOURCES.filter((r) => r.status === 'generating').map((r) => (
                <div key={r.label} className="rounded-xl border border-primary/30 bg-primary/5 p-8 flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <span className="text-sm text-primary font-medium">Generando {r.label}...</span>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="flex border-b border-border shrink-0">
                {[['preview', 'Vista previa'], ['code', 'Código']].map(([key, label]) => (
                  <button key={key} type="button" onClick={() => setRt(key)} className={tabCls(rt === key)}>{label}</button>
                ))}
              </div>
              {rt === 'preview' && (
                <div className="flex-1 bg-muted/30 flex flex-col items-center justify-center gap-3">
                  <div className="rounded-xl border border-border bg-card shadow-lg w-full max-w-2xl mx-6 overflow-hidden">
                    <div className="h-10 bg-primary flex items-center px-4"><span className="font-display text-sm font-semibold text-primary-foreground">Fotosíntesis y Ciclo del Carbono</span></div>
                    <div className="h-64 bg-gradient-to-br from-primary/5 via-background to-accent-brand/5 flex items-center justify-center"><span className="text-sm text-muted-foreground">iframe — preview OVA SCORM</span></div>
                    <div className="h-8 bg-muted flex items-center px-4 gap-3">
                      {['Engage', 'Explore', 'Explain', 'Evaluate'].map((ph) => (
                        <button key={ph} type="button" className="text-[10px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer">{ph}</button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Vista previa del OVA generado</p>
                </div>
              )}
              {rt === 'code' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {CODE_PHASES.map((ph) => (
                    <div key={ph.phase} className="rounded-xl overflow-hidden border border-border">
                      <div className={`flex items-center px-4 py-2.5 border-b ${ph.cls}`}>
                        <span className={`text-xs font-bold ${ph.cls.split(' ')[0]}`}>{ph.phase}</span>
                        <button type="button" className={`ml-auto text-[10px] font-semibold ${ph.cls.split(' ')[0]} hover:underline cursor-pointer`}>+ Añadir recurso</button>
                      </div>
                      {ph.items.map((item) => (
                        <div key={item} className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border last:border-0 hover:bg-accent/50 group transition-colors">
                          <svg className="h-4 w-4 text-muted-foreground/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                          <span className="flex-1 text-sm">{item}</span>
                          <div className="hidden group-hover:flex items-center gap-1">
                            {['Editar', 'Regen', 'Eliminar'].map((a) => (
                              <button key={a} type="button" className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold cursor-pointer ${a === 'Eliminar' ? 'text-destructive hover:bg-destructive/10' : 'border border-border hover:bg-accent'}`}>{a}</button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
