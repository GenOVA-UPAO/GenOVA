import { useState } from 'react'
import { WireframeShell } from '@/features/wireframes/WireframeShell.jsx'

const STUDENTS_INIT = [
  { id: 1, name: 'Luis Torres', email: 'luis@upao.edu.pe', ownKey: false, joined: 'hace 2 sem' },
  { id: 2, name: 'Valentina Cruz', email: 'vale@upao.edu.pe', ownKey: true, joined: 'hace 1 mes' },
  { id: 3, name: 'Pedro Sánchez', email: 'pedro@upao.edu.pe', ownKey: false, joined: 'hace 3 días' },
]
const ALL_LINKS = [
  { teacher: 'María García', tMail: 'maria@upao.edu.pe', student: 'Luis Torres', sMail: 'luis@upao.edu.pe', since: '12 mar 2026' },
  { teacher: 'María García', tMail: 'maria@upao.edu.pe', student: 'Pedro Sánchez', sMail: 'pedro@upao.edu.pe', since: '13 jun 2026' },
  { teacher: 'Carlos López', tMail: 'carlos@upao.edu.pe', student: 'Valentina Cruz', sMail: 'vale@upao.edu.pe', since: '15 may 2026' },
  { teacher: 'Ana Martínez', tMail: 'ana@upao.edu.pe', student: 'Diego Flores', sMail: 'diego@upao.edu.pe', since: '20 abr 2026' },
]

export function WireframeVinculacionPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [students, setStudents] = useState(STUDENTS_INIT)
  const initials = (name) => name.split(' ').map(n => n[0]).join('').slice(0, 2)

  return (
    <WireframeShell isAdmin={isAdmin} setIsAdmin={setIsAdmin}>
      <div className="p-6 space-y-5 max-w-4xl">
        <div>
          <h1 className="font-display text-2xl font-semibold">Vincular cuentas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isAdmin ? 'Todos los vínculos docente-estudiante de la plataforma' : 'Gestiona los estudiantes que usan tu configuración de API'}
          </p>
        </div>
        {isAdmin ? (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-4 px-5 py-3 border-b border-border bg-muted/30">
              {['Docente', 'Estudiante', 'Acción'].map(h => (
                <p key={h} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{h}</p>
              ))}
            </div>
            {ALL_LINKS.map((lnk, i) => (
              <div key={i} className={`grid grid-cols-[1fr_1fr_auto] items-center gap-4 px-5 py-3.5 hover:bg-accent/30 transition-colors ${i < ALL_LINKS.length - 1 ? 'border-b border-border' : ''}`}>
                <div>
                  <p className="text-sm font-medium">{lnk.teacher}</p>
                  <p className="text-xs text-muted-foreground">{lnk.tMail}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{lnk.student}</p>
                  <p className="text-xs text-muted-foreground">{lnk.sMail} · {lnk.since}</p>
                </div>
                <button type="button" className="rounded-lg border border-destructive/30 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/5 cursor-pointer">Desvincular</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-[1fr_300px] gap-5">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/30">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Estudiantes vinculados ({students.length})</p>
              </div>
              {students.map((s, i) => (
                <div key={s.id} className={`flex items-center gap-4 px-5 py-3.5 hover:bg-accent/30 transition-colors ${i < students.length - 1 ? 'border-b border-border' : ''}`}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">{initials(s.name)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.email} · {s.joined}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold ${s.ownKey ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {s.ownKey ? '✓ Clave propia' : '↑ Heredando tuya'}
                  </span>
                  <button type="button" onClick={() => setStudents(prev => prev.filter(x => x.id !== s.id))}
                    className="shrink-0 rounded-lg border border-destructive/30 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/5 cursor-pointer">
                    Desvincular
                  </button>
                </div>
              ))}
              {students.length === 0 && (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">Sin estudiantes vinculados</p>
              )}
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <p className="text-sm font-semibold">Invitar por email</p>
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="estudiante@upao.edu.pe"
                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                <button type="button" className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 cursor-pointer">
                  Enviar invitación
                </button>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <p className="text-sm font-semibold">Código de vinculación</p>
                <p className="text-xs text-muted-foreground">El estudiante ingresa este código en su perfil para vincularse a tu cuenta.</p>
                {showCode ? (
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center">
                    <p className="text-2xl font-mono font-bold tracking-[0.3em] text-primary">4X7-K9M</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Expira en 24 horas</p>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowCode(true)}
                    className="w-full rounded-xl border border-border py-2 text-sm font-semibold hover:bg-accent cursor-pointer">
                    Generar código
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </WireframeShell>
  )
}
