import { useEffect, useState } from 'react'
import { LinkSimple, PaperPlaneTilt, ShieldCheck } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getCurrentUser } from '../lib/me.js'
import {
  acceptLink,
  createLinkCode,
  deleteAnyLink,
  deleteMyLink,
  fetchAllLinks,
  fetchMyLinks,
  inviteLink,
} from '../services/userLinksService.js'

function can(user, permission) {
  return user?.role === 'administrador' || (user?.permissions || []).includes(permission)
}

function LinkRow({ link, onDelete, admin = false }) {
  const person = admin ? link.linked || { email: link.invite_email } : link.linked || { email: link.invite_email }
  return (
    <div className="flex items-center gap-4 border-b border-border px-5 py-3.5 last:border-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {(person?.full_name || person?.email || '?').slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{person?.full_name || person?.email || 'Invitacion pendiente'}</p>
        <p className="truncate text-xs text-muted-foreground">
          {admin && link.owner ? `${link.owner.email} -> ` : ''}
          {person?.email || link.invite_email || 'Sin email'} · {link.status}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={() => onDelete(link.id)}>
        Desvincular
      </Button>
    </div>
  )
}

export function UserLinksPage() {
  const [user, setUser] = useState(null)
  const [links, setLinks] = useState([])
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [loading, setLoading] = useState(true)

  const hasUserLinks = can(user, 'users:link')
  const hasAdminLinks = can(user, 'users:link:admin')

  const load = async (current = user) => {
    if (!current) return
    setLoading(true)
    try {
      const data = hasAdminLinks ? await fetchAllLinks() : await fetchMyLinks()
      setLinks(data.links || [])
    } catch (err) {
      toast.error(err.message || 'No se pudieron cargar los vinculos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getCurrentUser().then((current) => {
      setUser(current)
      if (can(current, 'users:link') || can(current, 'users:link:admin')) {
        const loader = can(current, 'users:link:admin') ? fetchAllLinks : fetchMyLinks
        loader()
          .then((data) => setLinks(data.links || []))
          .catch(() => toast.error('No se pudieron cargar los vinculos.'))
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })
  }, [])

  const handleCode = async () => {
    const data = await createLinkCode()
    setGeneratedCode(data.code)
    await load()
  }

  const handleInvite = async () => {
    const data = await inviteLink(email)
    setGeneratedCode(data.code)
    setEmail('')
    await load()
  }

  const handleAccept = async () => {
    await acceptLink(code)
    setCode('')
    toast.success('Cuenta vinculada.')
  }

  const handleDelete = async (id) => {
    if (hasAdminLinks) await deleteAnyLink(id)
    else await deleteMyLink(id)
    await load()
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent-brand">
          Usuarios y permisos
        </p>
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          Vincular cuentas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestiona usuarios vinculados para heredar configuracion IA cuando no tengan claves propias.
        </p>
      </header>

      {!hasUserLinks && !hasAdminLinks ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <ShieldCheck size={28} weight="duotone" className="mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">No tienes permiso para vincular usuarios</p>
          <p className="mt-1 text-xs text-muted-foreground">Solicita el permiso users:link a un administrador.</p>
        </div>
      ) : (
        <>
          {hasUserLinks ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-sm font-semibold">Invitar por email</p>
                <div className="mt-3 flex gap-2">
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="estudiante@upao.edu.pe" />
                  <Button onClick={handleInvite} disabled={!email.trim()} aria-label="Enviar invitacion">
                    <PaperPlaneTilt size={16} />
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-sm font-semibold">Codigo de vinculacion</p>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" onClick={handleCode}><LinkSimple size={16} /> Generar</Button>
                  {generatedCode ? <code className="rounded-lg bg-primary/5 px-3 py-2 text-sm font-bold text-primary">{generatedCode}</code> : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {hasAdminLinks ? 'Todos los vinculos' : 'Usuarios vinculados'} ({links.length})
              </p>
            </div>
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Cargando...</div>
            ) : links.length > 0 ? (
              links.map((link) => (
                <LinkRow key={link.id} link={link} onDelete={handleDelete} admin={hasAdminLinks} />
              ))
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">Sin vinculos todavia.</div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm font-semibold">Aceptar codigo</p>
            <div className="mt-3 flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABC-123" />
              <Button variant="outline" onClick={handleAccept} disabled={!code.trim()}>Aceptar</Button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
