import { useState } from 'react'
import { useNavigate } from 'react-router'
import { WireframeBanner, STATUS_DOT } from '@/features/wireframes/shared/WireframeUtils.jsx'

const NODES_DONE = [
  { name: 'Director', status: 'done', task: 'Flujo completado' },
  { name: 'Engage Writer', status: 'done', task: 'Engage generado — 2 recursos' },
  { name: 'Explore Writer', status: 'done', task: 'Explore generado — 1 recurso' },
  { name: 'Explain Writer', status: 'done', task: 'Explain generado — 2 recursos' },
  { name: 'Elaborate Writer', status: 'idle', task: 'Sin recursos asignados' },
  { name: 'Evaluate Writer', status: 'done', task: 'Evaluate generado — 2 recursos' },
  { name: 'Formatter', status: 'done', task: 'HTML post-procesado' },
]
const HISTORY = [
  { v: 'v1.3', label: 'Ajuste cuestionario', date: '15 jun, 14:32', current: true },
  { v: 'v1.2', label: 'Edición manual infografía', date: '15 jun, 13:05' },
  { v: 'v1.1', label: 'Regenerar mapa conceptual', date: '14 jun, 18:22' },
  { v: 'v1.0', label: 'Generación inicial', date: '14 jun, 16:40' },
]
const CODE_PHASES = [
  { phase: 'Engage', cls: 'text-red-500 bg-red-50 border-red-200', items: ['Video introductorio', 'Pregunta detonadora'] },
  { phase: 'Explore', cls: 'text-amber-600 bg-amber-50 border-amber-200', items: ['Mapa conceptual'] },
  { phase: 'Explain', cls: 'text-blue-600 bg-blue-50 border-blue-200', items: ['Explicación conceptual', 'Infografía'] },
  { phase: 'Evaluate', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200', items: ['Cuestionario', 'Rúbrica'] },
]

const TABS_L = [['chat', 'Chat'], ['agents', 'Agentes'], ['history', 'Historial']]
const TABS_R = [['preview', 'Vista previa'], ['code', 'Código']]

const tabCls = (on) => `flex-1 py-2.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${on ? 'border-b-2 border-primary text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'}`

export function WireframeWorkspaceEditorPage() {
  const [lt, setLt] = useState('chat')
  const [rt, setRt] = useState('preview')
  const [chatMsg, setChatMsg] = useState('')
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <WireframeBanner />
      {/* Top bar */}
      <header className="border-b border-border bg-card z-10 shrink-0">
        <div className="flex h-14 items-center px-4 gap-3">
          <button type="button" onClick={() => navigate('/wireframe3')} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors shrink-0">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Mis OVAs
          </button>
          <p className="font-display text-base font-semibold truncate flex-1">Fotosíntesis y Ciclo del Carbono</p>
          <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold border border-border">v1.3</span>
          <div className="hidden sm:flex items-center gap-2">
            <button type="button" className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent cursor-pointer transition-colors">SCORM</button>
            <button type="button" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity">Publicar</button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-96 shrink-0 flex flex-col border-r border-border overflow-hidden">
          <div className="flex border-b border-border shrink-0">
            {TABS_L.map(([key, label]) => (
              <button key={key} type="button" onClick={() => setLt(key)} className={tabCls(lt === key)}>{label}</button>
            ))}
          </div>

          {lt === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Instrucciones de regeneración</p>
                {/* Mock chat message */}
                <div className="rounded-xl bg-primary/10 border border-primary/20 p-3">
                  <p className="text-xs text-foreground">"Amplía la sección de cloroplastos en la explicación conceptual con más detalles sobre la fotosíntesis de Calvin."</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Hace 2 horas · Explicación conceptual regenerada</p>
                </div>
                {/* Files */}
                <div className="space-y-1.5">
                  {['curriculum_biologia.pdf', 'notas_clase.docx'].map((f) => (
                    <div key={f} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                      <svg className="h-4 w-4 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span className="text-xs truncate">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Input */}
              <div className="shrink-0 border-t border-border p-3 space-y-2">
                <textarea value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} rows={3} placeholder="Describe qué cambiar o regenerar..." className="w-full resize-none rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                <button type="button" className="w-full rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity">Aplicar cambios</button>
              </div>
            </div>
          )}

          {lt === 'agents' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              <p className="text-xs text-muted-foreground">7 nodos Prometheus — post-generación</p>
              {NODES_DONE.map((node) => (
                <div key={node.name} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[node.status]}`} />
                    <span className={`text-xs font-bold ${node.status === 'idle' ? 'text-muted-foreground' : 'text-foreground'}`}>{node.name}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 pl-4">{node.task}</p>
                </div>
              ))}
            </div>
          )}

          {lt === 'history' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <p className="text-xs text-muted-foreground">Historial de versiones del OVA</p>
              {HISTORY.map((h) => (
                <div key={h.v} className={`rounded-xl border p-3 ${h.current ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary">{h.v}</span>
                      {h.current && <span className="rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-[9px] font-bold">ACTUAL</span>}
                    </div>
                    {!h.current && <button type="button" className="text-[10px] text-primary hover:underline cursor-pointer font-medium">Restaurar</button>}
                  </div>
                  <p className="text-xs text-foreground mt-1">{h.label}</p>
                  <p className="text-[10px] text-muted-foreground">{h.date}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-1 shrink-0 bg-border cursor-col-resize hover:bg-primary/40 transition-colors" />

        {/* Right panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex border-b border-border shrink-0">
            {TABS_R.map(([key, label]) => (
              <button key={key} type="button" onClick={() => setRt(key)} className={tabCls(rt === key)}>{label}</button>
            ))}
          </div>

          {rt === 'preview' && (
            <div className="flex-1 bg-muted/30 flex flex-col items-center justify-center gap-3">
              <div className="rounded-xl border border-border bg-card shadow-lg w-full max-w-2xl mx-6 overflow-hidden">
                <div className="h-10 bg-primary flex items-center px-4">
                  <span className="font-display text-sm font-semibold text-primary-foreground">Fotosíntesis y Ciclo del Carbono</span>
                </div>
                <div className="h-64 bg-gradient-to-br from-primary/5 via-background to-accent-brand/5 flex items-center justify-center">
                  <span className="text-sm text-muted-foreground">iframe — preview OVA SCORM</span>
                </div>
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
                      <svg className="h-4 w-4 text-muted-foreground/40 shrink-0 cursor-grab" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                      <span className="flex-1 text-sm">{item}</span>
                      <div className="hidden group-hover:flex items-center gap-1">
                        {['Editar', 'Regen', 'Eliminar'].map((action) => (
                          <button key={action} type="button" className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold cursor-pointer transition-colors ${action === 'Eliminar' ? 'text-destructive hover:bg-destructive/10' : 'border border-border hover:bg-accent'}`}>{action}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
