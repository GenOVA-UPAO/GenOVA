import { useEffect, useState } from 'react'
import { LinkSimple, PaperPlaneTilt, UsersThree } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { m as motion } from 'motion/react'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
import LinkRow from '@/features/ova_library/components/cards/LinkRow.jsx'
import { getCurrentUser } from '@/core/lib/auth/me'
import {
  acceptLink,
  createLinkCode,
  deleteAnyLink,
  deleteMyLink,
  fetchAllLinks,
  fetchMyLinks,
  inviteLink,
  resendLink,
} from '@/features/profile/services/userLinksService'

function can(user, permission) {
  return user?.role === 'administrador' || (user?.permissions || []).includes(permission)
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
    const data = await createLinkCode(); setGeneratedCode(data.code); await load()
  }

  const handleInvite = async () => {
    const data = await inviteLink(email)
    setGeneratedCode(data.code)
    setEmail('')
    await load()
  }

  const handleAccept = async () => {
    await acceptLink(code); setCode(''); toast.success('Cuenta vinculada.')
  }

  const handleResend = async (linkId) => {
    try {
      const data = await resendLink(linkId)
      setGeneratedCode(data.code)
      toast.success('Invitacion reenviada.')
      await load()
    } catch (err) {
      toast.error(err.message || 'No se pudo reenviar la invitacion.')
    }
  }

  const handleDelete = async (id) => {
    if (hasAdminLinks) await deleteAnyLink(id); else await deleteMyLink(id); await load()
  }

  return (
    <motion.section 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-5xl space-y-6 pb-10"
    >
      <header>
        <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl flex items-center gap-3">
          <UsersThree className="text-primary" weight="duotone" />
          Vincular cuentas
        </h1>
        <p className="mt-1.5 text-sm font-medium text-muted-foreground">
          {hasUserLinks || hasAdminLinks
            ? 'Gestiona usuarios vinculados para heredar la configuración de modelos de IA cuando no tengan API Keys propias.'
            : 'Vincula tu cuenta a un docente para heredar su configuración de modelos de IA.'}
        </p>
      </header>

      {/* Estudiante: solo aceptar invitacion */}
      {!hasUserLinks && !hasAdminLinks ? (
        <div className="mx-auto max-w-md">
          <div className="glass-card rounded-3xl border-border bg-card p-6 shadow-sm space-y-4">
            <div>
              <p className="text-base font-bold font-display">Aceptar invitacion</p>
              <p className="text-xs text-muted-foreground mt-1">Ingresa el codigo que te proporciono el docente.</p>
            </div>
            <div className="flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ej: ABC-123" className="bg-muted/30 uppercase" />
              <Button variant="default" onClick={handleAccept} disabled={!code.trim()} className="shadow-md shrink-0">
                Aceptar
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          <div className="md:col-span-5 space-y-6">
            {hasUserLinks ? (
              <div className="glass-card rounded-3xl border-border bg-card p-6 shadow-sm space-y-5">
                <div>
                  <p className="text-base font-bold font-display">Invitar por email</p>
                  <p className="text-xs text-muted-foreground mt-1">Envia una invitacion directa al correo institucional.</p>
                </div>
                <div className="flex gap-2">
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="estudiante@upao.edu.pe" className="bg-muted/30" />
                  <Button onClick={handleInvite} disabled={!email.trim()} aria-label="Enviar invitacion" className="shadow-md shrink-0">
                    <PaperPlaneTilt size={16} weight="bold" />
                  </Button>
                </div>
                
                <hr className="border-border/50 my-2" />
                
                <div>
                  <p className="text-base font-bold font-display">Codigo de vinculacion</p>
                  <p className="text-xs text-muted-foreground mt-1">El estudiante ingresa este codigo en su perfil para vincularse a tu cuenta.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" onClick={handleCode} className="shadow-sm border-primary/20 text-primary hover:bg-primary/5">
                    <LinkSimple size={16} weight="bold" className="mr-2" /> Generar codigo
                  </Button>
                  {generatedCode ? <code className="flex-1 text-center rounded-xl bg-primary/10 border border-primary/20 px-3 py-2 text-sm font-bold text-primary tracking-widest">{generatedCode}</code> : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="md:col-span-7 glass-card rounded-3xl border-border bg-card shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
            <div className="border-b border-border/50 bg-muted/10 px-6 py-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                <span>{hasAdminLinks ? 'Todos los vinculos' : 'Estudiantes vinculados'}</span>
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">{links.length}</span>
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-10 text-center text-sm font-medium text-muted-foreground animate-pulse">Cargando...</div>
              ) : links.length > 0 ? (
                links.map((link) => (
                  <LinkRow
                    key={link.id}
                    link={link}
                    onDelete={handleDelete}
                    onResend={handleResend}
                    admin={hasAdminLinks}
                    isOwner={user?.id === link.owner_user_id}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                  <div className="rounded-full bg-muted/30 p-4 mb-4">
                    <UsersThree size={32} weight="duotone" className="text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-bold text-foreground">Sin estudiantes vinculados</p>
                  <p className="text-xs font-medium text-muted-foreground mt-1">Comparte tu codigo o invita por email para empezar.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </motion.section>
  )
}
