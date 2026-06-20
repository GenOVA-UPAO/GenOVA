import { useState } from 'react'
import { useNavigate } from 'react-router'
import { WireframeShell } from '@/features/wireframes/shared/WireframeShell.jsx'
import { STATUS_BADGE } from '@/features/wireframes/shared/WireframeUtils.jsx'

const MOCK_OVAS = [
  { id: 1, title: 'Fotosíntesis y Ciclo del Carbono', status: 'listo', date: '14 jun 2026', subject: 'Biología', v: 'v1.3' },
  { id: 2, title: 'Sistema Nervioso Central', status: 'generando', date: '15 jun 2026', subject: 'Medicina', progress: '4/7' },
  { id: 3, title: 'Álgebra Lineal — Vectores y Espacios', status: 'borrador', date: '12 jun 2026', subject: 'Matemáticas', v: 'v1.0' },
  { id: 4, title: 'Historia del Perú Republicano', status: 'listo', date: '10 jun 2026', subject: 'Historia', v: 'v2.1' },
  { id: 5, title: 'Cálculo Diferencial: Límites', status: 'error', date: '09 jun 2026', subject: 'Matemáticas' },
  { id: 6, title: 'Programación Orientada a Objetos', status: 'listo', date: '08 jun 2026', subject: 'Informática', v: 'v1.5' },
]

const PHASE_COLOR = { listo: 'bg-emerald-500', generando: 'bg-blue-500', borrador: 'bg-muted-foreground/40', error: 'bg-destructive' }

function OvaCard({ ova, onEdit }) {
  const s = STATUS_BADGE[ova.status]
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow">
      <div className={`h-1.5 ${PHASE_COLOR[ova.status]}`} />
      <div className="flex-1 p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-foreground">{ova.title}</h3>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${s.cls}`}>{s.label}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-muted-foreground">{ova.subject}</span>
          {ova.v && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-muted-foreground">{ova.v}</span>}
          {ova.progress && <span className="text-[10px] font-semibold text-primary">{ova.progress} recursos</span>}
          <span className="ml-auto text-[10px] text-muted-foreground">{ova.date}</span>
        </div>
      </div>
      <div className="flex gap-1.5 border-t border-border p-3">
        <button type="button" onClick={onEdit} className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity">Editar</button>
        <button type="button" disabled={ova.status !== 'listo'} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Descargar</button>
        <button type="button" className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-accent cursor-pointer transition-colors">Papelera</button>
      </div>
    </div>
  )
}

export function WireframeMisOvasPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [isAdmin, setIsAdmin] = useState(false)
  const navigate = useNavigate()

  const visible = MOCK_OVAS.filter((o) =>
    o.title.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'todos' || o.status === statusFilter)
  )

  return (
    <WireframeShell isAdmin={isAdmin} setIsAdmin={setIsAdmin}>
      <div className="p-6 lg:p-8 mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">Mis OVAs</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Total: <span className="font-semibold text-foreground">{MOCK_OVAS.length}</span> objetos de aprendizaje</p>
          </div>
          <button type="button" onClick={() => navigate('/wireframe4')} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 cursor-pointer shadow">
            + Crear OVA
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título..." className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 transition-shadow" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none cursor-pointer">
            <option value="todos">Todos los estados</option>
            <option value="listo">Listo</option>
            <option value="generando">Generando</option>
            <option value="borrador">Borrador</option>
            <option value="error">Error</option>
          </select>
        </div>

        {/* Grid */}
        {visible.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((ova) => <OvaCard key={ova.id} ova={ova} onEdit={() => navigate('/wireframe6')} />)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <p className="font-semibold">Sin resultados</p>
            <p className="text-sm text-muted-foreground mt-1">Prueba con otros filtros</p>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {[1, 2, 3].map((p) => (
            <button key={p} type="button" className={`h-8 w-8 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${p === 1 ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-accent'}`}>{p}</button>
          ))}
        </div>
      </div>
    </WireframeShell>
  )
}
