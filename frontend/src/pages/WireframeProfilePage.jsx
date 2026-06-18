import { useState } from 'react'
import { useNavigate } from 'react-router'
import { WireframeShell } from './WireframeShell.jsx'

const OVA_STATS = [
  { label: 'Creados', value: '31', color: 'text-primary' },
  { label: 'Listos', value: '24', color: 'text-emerald-600' },
  { label: 'En progreso', value: '5', color: 'text-blue-600' },
  { label: 'Exportados', value: '18', color: 'text-accent-brand' },
]
const ADMIN_METRICS = [
  { label: 'Total usuarios', value: '159' },
  { label: 'OVAs plataforma', value: '312' },
  { label: 'Generaciones activas', value: '3' },
  { label: 'Uptime motor', value: '99.8%' },
]

const LINKED_MINI = [
  { name: 'Luis Torres', ownKey: false },
  { name: 'Valentina Cruz', ownKey: true },
  { name: 'Pedro Sánchez', ownKey: false },
]

export function WireframeProfilePage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const navigate = useNavigate()

  return (
    <WireframeShell isAdmin={isAdmin} setIsAdmin={setIsAdmin}>
      <div className="p-6 space-y-5 max-w-2xl">
        {/* Header card */}
        <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-5">
          <div className="h-16 w-16 shrink-0 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
            JR
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-semibold">Jeffry Romero</h1>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isAdmin ? 'bg-primary/15 text-primary' : 'bg-accent-brand/15 text-accent-brand'}`}>
                {isAdmin ? 'Administrador' : 'Docente'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">jeffry@upao.edu.pe</p>
            <p className="text-xs text-muted-foreground mt-1">Miembro desde enero 2026 · Último acceso: hace 5 min</p>
          </div>
          <button type="button" onClick={() => setEditMode(!editMode)}
            className="shrink-0 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-accent cursor-pointer transition-colors">
            {editMode ? 'Cancelar' : 'Editar perfil'}
          </button>
        </div>

        {/* OVA stats */}
        <div className="grid grid-cols-4 gap-3">
          {OVA_STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Edit form */}
        {editMode && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold">Editar información personal</p>
            {[['Nombre completo', 'Jeffry Romero', 'text'], ['Email', 'jeffry@upao.edu.pe', 'email']].map(([label, val, type]) => (
              <div key={label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                <input type={type} defaultValue={val} className="mt-1 w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            ))}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nueva contraseña</p>
              <input type="password" placeholder="Dejar en blanco para no cambiar" className="mt-1 w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            {isAdmin && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Autenticación de dos factores</p>
                <div className="mt-1 flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-2.5">
                  <span className="text-sm text-muted-foreground">2FA desactivado</span>
                  <button type="button" className="text-xs font-semibold text-primary hover:underline cursor-pointer">Activar</button>
                </div>
              </div>
            )}
            <button type="button" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity">
              Guardar cambios
            </button>
          </div>
        )}

        {/* Admin metrics panel */}
        {isAdmin && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-primary">Métricas de plataforma</p>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary uppercase">Solo admins</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {ADMIN_METRICS.map((m) => (
                <div key={m.label} className="rounded-xl bg-card border border-border px-4 py-3">
                  <p className="text-xl font-bold text-primary">{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estudiantes vinculados (Docente) */}
        {!isAdmin && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Estudiantes vinculados <span className="font-normal text-muted-foreground">(3)</span></p>
              <button type="button" onClick={() => navigate('/wireframe13')} className="text-xs font-semibold text-primary hover:underline cursor-pointer">Gestionar →</button>
            </div>
            {LINKED_MINI.map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                  {s.name.split(' ').map(n => n[0]).join('')}
                </div>
                <p className="flex-1 text-sm">{s.name}</p>
                <span className={`text-[10px] font-bold ${s.ownKey ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {s.ownKey ? '✓ Clave propia' : '↑ Heredando'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Notificaciones */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <p className="text-sm font-semibold">Preferencias de notificación</p>
          {['OVA generado exitosamente', 'Error en generación', 'Actualización de la plataforma'].map((label) => (
            <label key={label} className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">{label}</span>
              <input type="checkbox" defaultChecked className="rounded" />
            </label>
          ))}
        </div>

        {/* Danger zone */}
        <div className="rounded-2xl border border-destructive/20 bg-card p-5 space-y-2">
          <p className="text-sm font-semibold text-destructive">Zona de peligro</p>
          <p className="text-xs text-muted-foreground">Estas acciones son permanentes e irreversibles</p>
          <div className="flex gap-2 pt-1">
            <button type="button" className="rounded-lg border border-border px-4 py-2 text-xs font-semibold hover:bg-accent cursor-pointer transition-colors">Exportar mis datos</button>
            <button type="button" className="rounded-lg border border-destructive/30 px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/5 cursor-pointer transition-colors">Eliminar cuenta</button>
          </div>
        </div>
      </div>
    </WireframeShell>
  )
}
