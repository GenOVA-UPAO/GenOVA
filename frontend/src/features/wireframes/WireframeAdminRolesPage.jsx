import { useState } from 'react'
import { WireframeShell } from '@/features/wireframes/WireframeShell.jsx'

const ROLES = [
  {
    key: 'admin', label: 'Administrador', color: 'bg-primary', users: 2,
    perms: ['Gestionar usuarios', 'Gestionar roles', 'Crear OVAs', 'Exportar SCORM', 'Configurar API Keys', 'Activar modo crítico', 'Ver métricas del sistema'],
  },
  {
    key: 'docente', label: 'Docente', color: 'bg-accent-brand', users: 15,
    perms: ['Crear OVAs', 'Exportar SCORM', 'Ver OVAs propios', 'Editar OVAs propios', 'Invitar estudiantes', 'Vincular cuentas de estudiantes'],
  },
  {
    key: 'estudiante', label: 'Estudiante', color: 'bg-emerald-500', users: 142,
    perms: ['Ver OVAs asignados', 'Descargar SCORM asignados'],
  },
]
const ALL_PERMS = ['Crear OVAs', 'Exportar SCORM', 'Ver OVAs propios', 'Editar OVAs propios', 'Ver OVAs de otros', 'Invitar estudiantes', 'Vincular cuentas de estudiantes', 'Gestionar usuarios', 'Gestionar roles', 'Configurar API Keys', 'Ver métricas del sistema', 'Activar modo crítico']

export function WireframeAdminRolesPage() {
  const [isAdmin, setIsAdmin] = useState(true)
  const [editing, setEditing] = useState(null)

  return (
    <WireframeShell isAdmin={isAdmin} setIsAdmin={setIsAdmin}>
      <div className="p-6 space-y-5 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">Gestión de Roles</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Define los permisos de cada rol en la plataforma</p>
          </div>
          <button type="button" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity">
            + Nuevo rol
          </button>
        </div>

        <div className="space-y-4">
          {ROLES.map((role) => (
            <div key={role.key} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl ${role.color} flex items-center justify-center shrink-0`}>
                    <span className="text-white text-sm font-bold">{role.label[0]}</span>
                  </div>
                  <div>
                    <p className="font-semibold">{role.label}</p>
                    <p className="text-xs text-muted-foreground">{role.users} usuarios activos</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditing(role.key)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent cursor-pointer transition-colors">
                    Editar permisos
                  </button>
                  {role.key !== 'admin' && (
                    <button type="button" className="rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/5 cursor-pointer transition-colors">
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {role.perms.map((p) => (
                  <span key={p} className="rounded-full bg-accent border border-border px-2.5 py-1 text-[11px] font-medium">{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <>
          {/* biome-ignore lint/a11y: backdrop dismiss */}
          <div className="fixed inset-0 z-40 bg-foreground/25 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <p className="text-sm font-semibold">Permisos — {ROLES.find((r) => r.key === editing)?.label}</p>
                <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent cursor-pointer" aria-label="Cerrar">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-5 space-y-1.5 max-h-[60vh] overflow-y-auto">
                {ALL_PERMS.map((p) => (
                  <label key={p} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-accent cursor-pointer transition-colors">
                    <input type="checkbox" defaultChecked={ROLES.find((r) => r.key === editing)?.perms.includes(p)} className="rounded border-border" />
                    <span className="text-sm">{p}</span>
                  </label>
                ))}
              </div>
              <div className="border-t border-border p-4">
                <button type="button" onClick={() => setEditing(null)} className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity">
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </WireframeShell>
  )
}
