import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Link } from 'react-router'
import { Brain } from '@phosphor-icons/react'
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          Configuración
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestiona tu perfil, preferencias de imagen y claves de acceso.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Brain size={20} weight="duotone" className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-primary">Modelos de IA ahora tiene pantalla propia</p>
            <p className="text-xs text-muted-foreground">
              Configura catalogo, asignacion por tarea y modelos personales desde la navegacion principal.
            </p>
          </div>
        </div>
        <Button asChild size="sm" className="self-start sm:self-auto">
          <Link to="/modelos">Abrir Modelos</Link>
        </Button>
      </div>

      <Tabs defaultValue="perfil" className="space-y-6">
        <TabsList variant="line">
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="imagenes">Imágenes OVA</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {loading ? (
              <ProfileSkeleton />
            ) : (
              <ProfileForm
                profile={profile}
                role={role}
                createdAt={createdAt}
                onSave={saveProfile}
                getInitials={getInitials}
                formatDate={formatDate}
              />
            )}
            {!loading && (
              <div className="space-y-8">
                <PasswordChangeForm />
                <DeleteAccountForm />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="imagenes">
          <OvaSettingsCard />
        </TabsContent>

        <TabsContent value="api-keys">
          <ApiKeysCard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
