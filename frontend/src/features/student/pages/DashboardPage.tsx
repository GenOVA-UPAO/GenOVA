/**
 * Dashboard del estudiante / profesor — sección "OVAs Compartidos".
 * Solo visible para rol "profesor" con alumnos vinculados aceptados.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getCachedUser, getCurrentUser } from '@/core/lib/auth/me'
import { fetchMyLinks } from '@/features/profile/services/userLinksService'

interface LinkItem {
  status: string
  linked?: { full_name?: string } | null
}

export function DashboardPage() {
  const [role, setRole] = useState<string | null>(() => getCachedUser()?.role ?? null)
  const [acceptedLinks, setAcceptedLinks] = useState<LinkItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([getCurrentUser(), fetchMyLinks()])
      .then(([user, linksRes]) => {
        if (cancelled) return
        setRole((user?.role as string | null) ?? null)
        const active = (linksRes.links ?? []).filter(
          (l) => l.status === 'active' || l.status === 'accepted',
        ) as LinkItem[]
        setAcceptedLinks(active)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const isProfesor = role === 'profesor'
  const hasLinkedStudents = acceptedLinks.length > 0
  const showShared = isProfesor && hasLinkedStudents

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-muted-foreground">
        Cargando…
      </div>
    )
  }

  if (!showShared) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mi Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aquí verás un resumen de tu actividad en GenOVA.
          </p>
        </div>
        <div className="rounded-xl border bg-muted/30 p-10 text-center space-y-3">
          <p className="text-sm font-medium text-foreground">
            {role === 'profesor'
              ? 'Vincula alumnos para compartir tus OVAs.'
              : 'Nada que mostrar por ahora.'}
          </p>
          {role === 'profesor' && (
            <Link
              to="/vinculacion"
              className="inline-block text-xs font-semibold text-primary underline-offset-4 hover:underline"
            >
              Ir a Vinculación →
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">OVAs Compartidos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          OVAs que has compartido con tus {acceptedLinks.length} alumno
          {acceptedLinks.length !== 1 ? 's' : ''} vinculado
          {acceptedLinks.length !== 1 ? 's' : ''}.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Alumnos vinculados</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {acceptedLinks.map((link, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {link.linked?.full_name?.[0] ?? '?'}
              </span>
              <span className="text-sm font-medium text-foreground">
                {link.linked?.full_name ?? 'Alumno vinculado'}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">OVAs compartidos</h2>
        <div className="rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          Próximamente podrás ver qué OVAs han visto tus alumnos.
        </div>
      </section>
    </div>
  )
}
