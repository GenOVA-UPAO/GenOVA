import { useState } from 'react'
import { WireframeShell } from './WireframeShell.jsx'

const USERS = [
  { id: 1, name: 'María García', email: 'maria@upao.edu.pe', role: 'admin', ovas: 12, joined: '12 ene 2026', active: true },
  { id: 2, name: 'Carlos López', email: 'carlos@upao.edu.pe', role: 'docente', ovas: 8, joined: '15 feb 2026', active: true },
  { id: 3, name: 'Ana Martínez', email: 'ana@upao.edu.pe', role: 'docente', ovas: 23, joined: '3 mar 2026', active: true },
  { id: 4, name: 'Luis Torres', email: 'luis@upao.edu.pe', role: 'estudiante', ovas: 0, joined: '20 mar 2026', active: false },
  { id: 5, name: 'Sofía Ramos', email: 'sofia@upao.edu.pe', role: 'docente', ovas: 5, joined: '1 abr 2026', active: true },
  { id: 6, name: 'Jeffry Romero', email: 'jeffry@upao.edu.pe', role: 'admin', ovas: 31, joined: '5 ene 2026', active: true },
  { id: 7, name: 'Valentina Cruz', email: 'vale@upao.edu.pe', role: 'estudiante', ovas: 0, joined: '10 may 2026', active: true },
  { id: 8, name: 'Diego Flores', email: 'diego@upao.edu.pe', role: 'docente', ovas: 14, joined: '18 ene 2026', active: true },
]
const ROLE_BADGE = { admin: 'bg-primary/10 text-primary', docente: 'bg-accent-brand/10 text-accent-brand', estudiante: 'bg-emerald-100 text-emerald-700' }
const ROLE_LABEL = { admin: 'Admin', docente: 'Docente', estudiante: 'Estudiante' }

export function WireframeAdminUsersPage() {
  const [isAdmin, setIsAdmin] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const visible = USERS.filter((u) =>
    (roleFilter === 'all' || u.role === roleFilter) &&
    (u.name.toLowerCase().includes(search.toLowerCase()) || u.email.includes(search.toLowerCase()))
  )

  return (
    <WireframeShell isAdmin={isAdmin} setIsAdmin={setIsAdmin}>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">Usuarios</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{USERS.length} usuarios registrados en la plataforma</p>
          </div>
          <button type="button" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity">
            + Invitar usuario
          </button>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre o email..." className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none cursor-pointer">
            <option value="all">Todos los roles</option>
            <option value="admin">Administrador</option>
            <option value="docente">Docente</option>
            <option value="estudiante">Estudiante</option>
          </select>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[2rem_1fr_auto_auto_auto] items-center gap-4 px-5 py-3 border-b border-border bg-muted/30">
            {['', 'Usuario', 'Rol', 'OVAs', 'Acciones'].map((h) => (
              <p key={h} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{h}</p>
            ))}
          </div>
          {visible.map((u, i) => (
            <div key={u.id} className={`grid grid-cols-[2rem_1fr_auto_auto_auto] items-center gap-4 px-5 py-3.5 hover:bg-accent/30 transition-colors ${i < visible.length - 1 ? 'border-b border-border' : ''}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${u.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium">{u.name}</p>
                  {!u.active && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">INACTIVO</span>}
                </div>
                <p className="text-xs text-muted-foreground">{u.email} · Desde {u.joined}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ROLE_BADGE[u.role]}`}>{ROLE_LABEL[u.role]}</span>
              <span className="text-sm tabular-nums text-center">{u.ovas}</span>
              <div className="flex items-center gap-1.5">
                <button type="button" className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-accent cursor-pointer transition-colors">Editar</button>
                <button type="button" className="rounded-lg border border-destructive/30 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/5 cursor-pointer transition-colors">
                  {u.active ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
          {visible.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">Sin resultados para "{search}"</div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Mostrando {visible.length} de {USERS.length} usuarios</span>
          <div className="flex gap-1">
            {[1, 2, 3].map((p) => (
              <button key={p} type="button" className={`h-7 w-7 rounded-lg text-xs font-semibold cursor-pointer ${p === 1 ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-accent'}`}>{p}</button>
            ))}
          </div>
        </div>
      </div>
    </WireframeShell>
  )
}
