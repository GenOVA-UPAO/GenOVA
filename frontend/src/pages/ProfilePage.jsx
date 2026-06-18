import { Link } from 'react-router'
import { Brain } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { useProfile } from '../hooks/useProfile.js'
import { ProfileForm } from '../components/ProfileForm.jsx'
import { PasswordChangeForm } from '../components/PasswordChangeForm.jsx'
import { ApiKeysCard } from '../components/settings/ApiKeysCard.jsx'
import { OvaSettingsCard } from '../components/settings/OvaSettingsCard.jsx'
import { ProfileSkeleton } from '../components/ProfileSkeleton.jsx'
import { DeleteAccountForm } from '../components/DeleteAccountForm.jsx'

export function ProfilePage() {
  const { profile, role, createdAt, loading, saveProfile, getInitials, formatDate } = useProfile()
  const isAdmin = role === 'admin' || role === 'Administrador' // Assuming role text

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 mx-auto max-w-3xl pb-10"
    >
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
          Configuración de Perfil
        </h1>
        <p className="text-sm font-medium text-muted-foreground mt-1.5">
          Gestiona tu información personal, preferencias de plataforma y seguridad.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between shadow-sm">
        <div className="flex items-start gap-3">
          <Brain size={24} weight="duotone" className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-bold text-primary">Modelos de IA ahora tiene pantalla propia</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Configura catálogo, asignación por tarea y modelos personales desde la navegación principal.
            </p>
          </div>
        </div>
        <Button asChild size="sm" className="self-start sm:self-auto shadow-md">
          <Link to="/modelos">Abrir Modelos</Link>
        </Button>
      </div>

      {loading ? (
        <ProfileSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Header Card (from Wireframe) */}
          <div className="glass-card rounded-3xl p-6 flex items-center gap-5">
            <div className="h-16 w-16 shrink-0 rounded-full bg-gradient-to-br from-primary to-accent-brand flex items-center justify-center text-primary-foreground text-xl font-display font-bold shadow-lg">
              {getInitials()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-bold">{profile?.full_name || 'Usuario'}</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm ${isAdmin ? 'bg-primary/15 text-primary border border-primary/20' : 'bg-accent-brand/15 text-accent-brand border border-accent-brand/20'}`}>
                  {role}
                </span>
              </div>
              <p className="text-sm text-muted-foreground font-medium mt-0.5">{profile?.email}</p>
              <p className="text-xs text-muted-foreground mt-1.5">Miembro desde: {formatDate(createdAt)}</p>
            </div>
          </div>

          <ProfileForm
            profile={profile}
            role={role}
            createdAt={createdAt}
            onSave={saveProfile}
            getInitials={getInitials}
            formatDate={formatDate}
            hideHeader={true}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <OvaSettingsCard />
            <ApiKeysCard />
          </div>

          <PasswordChangeForm />
          <DeleteAccountForm />
        </div>
      )}
    </motion.div>
  )
}
