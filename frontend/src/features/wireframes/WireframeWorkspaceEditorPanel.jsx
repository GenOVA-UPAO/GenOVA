import { useState } from 'react'
import { STATUS_DOT } from '@/features/wireframes/WireframeUtils.jsx'

const NODES_DONE = [
  { name: 'Director', status: 'done', task: 'Flujo completado' },
  { name: 'Engage Writer', status: 'done', task: 'Engage generado — 2 recursos' },
  { name: 'Explore Writer', status: 'done', task: 'Explore generado — 1 recurso' },
  { name: 'Explain Writer', status: 'done', task: 'Explain generado — 2 recursos' },
  { name: 'Elaborate Writer', status: 'done', task: 'Elaborate generado — 1 recurso' },
  { name: 'Evaluate Writer', status: 'done', task: 'Evaluate generado — 2 recursos' },
  { name: 'Formatter', status: 'done', task: 'HTML post-procesado' },
]
const HISTORY = [
  { v: 'v1.3', label: 'Ajuste cuestionario', date: '15 jun, 14:32', current: true },
  { v: 'v1.2', label: 'Edición manual infografía', date: '15 jun, 13:05' },
  { v: 'v1.1', label: 'Regenerar mapa conceptual', date: '14 jun, 18:22' },
  { v: 'v1.0', label: 'Generación inicial', date: '14 jun, 16:40' },
]
const REF_FILES = ['curriculum_biologia.pdf', 'notas_clase.docx']
const IcoPaper = 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
const IcoAttach = 'M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13'

const tabCls = (on) => `flex-1 py-2.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${on ? 'border-b-2 border-primary text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'}`

export function WireframeWorkspaceEditorPanel({ lt, setLt }) {
  const [chatMsg, setChatMsg] = useState('')

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex border-b border-border shrink-0">
        {[['chat', 'Chat'], ['agents', 'Agentes'], ['history', 'Historial']].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setLt(key)} className={tabCls(lt === key)}>{label}</button>
        ))}
      </div>

      {lt === 'chat' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-4 space-y-3 overflow-y-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Instrucciones de regeneración</p>
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-3">
              <p className="text-xs">"Amplía la sección de cloroplastos con más detalles sobre el ciclo de Calvin."</p>
              <p className="text-[10px] text-muted-foreground mt-1">Hace 2 horas · Explicación conceptual regenerada</p>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pt-1">Archivos de referencia</p>
            {REF_FILES.map((f) => (
              <div key={f} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                <svg className="h-4 w-4 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={IcoPaper} /></svg>
                <span className="text-xs truncate flex-1">{f}</span>
              </div>
            ))}
          </div>
          <div className="shrink-0 border-t border-border p-3 space-y-2">
            <textarea value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} rows={3}
              placeholder="Describe qué cambiar o regenerar en el OVA..."
              className="w-full resize-none rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
            <div className="flex items-center gap-2">
              <button type="button" title="Subir archivo de referencia"
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors shrink-0">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={IcoAttach} /></svg>
                Subir archivo
              </button>
              <button type="button" className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity">
                Aplicar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {lt === 'agents' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <p className="text-xs text-muted-foreground mb-1">7 nodos Prometheus — post-generación</p>
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
          {HISTORY.map((h) => (
            <div key={h.v} className={`rounded-xl border p-3 ${h.current ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary">{h.v}</span>
                  {h.current && <span className="rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-[9px] font-bold">ACTUAL</span>}
                </div>
                {!h.current && <button type="button" className="text-[10px] text-primary hover:underline cursor-pointer font-medium">Restaurar</button>}
              </div>
              <p className="text-xs mt-1">{h.label}</p>
              <p className="text-[10px] text-muted-foreground">{h.date}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
