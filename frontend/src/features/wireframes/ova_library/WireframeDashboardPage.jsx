import { useState } from 'react'
import { useNavigate } from 'react-router'
import { WireframeShell } from '@/features/wireframes/shared/WireframeShell.jsx'
import { STATUS_BADGE } from '@/features/wireframes/shared/WireframeUtils.jsx'

const RECENT = [
  { id: 1, title: 'Fotosíntesis y Ciclo del Carbono', status: 'listo', date: '14 jun 2026', subject: 'Biología' },
  { id: 2, title: 'Sistema Nervioso Central', status: 'generando', date: '15 jun 2026', subject: 'Medicina' },
  { id: 3, title: 'Álgebra Lineal — Vectores', status: 'borrador', date: '12 jun 2026', subject: 'Matemáticas' },
]

export function WireframeDashboardPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const navigate = useNavigate()

  return (
    <WireframeShell isAdmin={isAdmin} setIsAdmin={setIsAdmin}>
      <div className="p-6 lg:p-8 space-y-8 mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-brand mb-1">UPAO — GenOVA ML</p>
            <h1 className="font-display text-3xl font-semibold text-foreground">Bienvenido, Jeffry</h1>
            <p className="mt-1 text-sm text-muted-foreground">Lunes 15 de junio de 2026</p>
          </div>
          <button type="button" onClick={() => navigate('/wireframe4')} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-md">
            + Crear OVA
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[['OVAs Creadas', 12, '+2 este mes', 'text-primary'], ['En Progreso', 3, '1 pausada', 'text-accent-brand'], ['Exportadas', 9, '45 MB total', 'text-emerald-600']].map(([label, val, sub, cls]) => (
            <div key={label} className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow group">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
              <p className={`mt-2 text-4xl font-bold ${cls}`}>{val}</p>
              <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
            </div>
          ))}
        </div>

        {/* Recent OVAs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">OVAs Recientes</h2>
            <button type="button" onClick={() => navigate('/wireframe3')} className="text-sm font-medium text-primary hover:underline cursor-pointer">Ver todas →</button>
          </div>
          <div className="space-y-3">
            {RECENT.map((ova) => {
              const s = STATUS_BADGE[ova.status]
              return (
                <div key={ova.id} className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 hover:shadow-sm transition-shadow">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{ova.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ova.subject} · {ova.date}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
                  <button type="button" onClick={() => navigate('/wireframe6')} className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent transition-colors cursor-pointer">Editar</button>
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center bg-muted/20">
          <p className="font-display text-xl font-semibold">Crea tu próximo OVA</p>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-sm mx-auto">Describe el tema y genera contenido educativo interactivo con IA en minutos.</p>
          <button type="button" onClick={() => navigate('/wireframe4')} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow">
            + Crear nueva OVA
          </button>
        </div>

        {/* Admin panel */}
        {isAdmin && (
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold mb-4">Panel de Administración</h2>
            <div className="grid grid-cols-3 gap-4">
              {['Gestión de Roles', 'Gestión de Usuarios', 'Labs'].map((label) => (
                <button key={label} type="button" className="rounded-xl border border-border p-5 text-left hover:bg-accent hover:shadow-sm transition-all cursor-pointer">
                  <p className="font-semibold text-sm text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-1">Gestionar {label.toLowerCase()}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </WireframeShell>
  )
}
