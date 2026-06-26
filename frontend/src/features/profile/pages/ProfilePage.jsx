import { m as motion } from 'motion/react'
import { Lock, SlidersHorizontal, User } from '@phosphor-icons/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/components/ui/tabs'
import { useProfile } from '@/features/profile/hooks/useProfile.js'
import { ProfileForm } from '@/features/profile/components/ProfileForm.jsx'
import { PasswordChangeForm } from '@/features/profile/components/PasswordChangeForm.jsx'
import { ApiKeysCard } from '@/core/components/settings/ApiKeysCard.jsx'
import { ProfileSkeleton } from '@/features/profile/components/ProfileSkeleton.jsx'
import { DeleteAccountForm } from '@/features/profile/components/DeleteAccountForm.jsx'
import { TotpSetupCard } from '@/features/profile/components/TotpSetupCard.jsx'

export function ProfilePage() {
  const { profile, role, createdAt, loading, saveProfile, getInitials, formatDate } = useProfile()
  const isAdmin = role === 'administrador'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-3xl space-y-6 pb-12"
    >
      {/* Hero header card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card px-6 py-5 shadow-sm">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/[.04] blur-2xl pointer-events-none" />
        <div className="absolute right-24 bottom-0 h-28 w-28 rounded-full bg-accent-brand/[.04] blur-2xl pointer-events-none" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-accent-brand flex items-center justify-center text-primary-foreground text-xl font-display font-bold shadow-md">
              {getInitials()}
            </div>
            <span className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-card ${isAdmin ? 'bg-primary' : 'bg-accent-brand'}`} />
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            {loading ? (
              <div className="h-6 w-40 rounded-lg bg-muted/60 animate-pulse" />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl font-bold text-foreground">{profile?.full_name || 'Usuario'}</h1>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isAdmin ? 'bg-primary/10 text-primary border border-primary/25' : 'bg-accent-brand/10 text-accent-brand border border-accent-brand/25'}`}>
                  {role}
                </span>
              </div>
            )}
            <p className="text-sm text-muted-foreground font-medium">{profile?.email || '—'}</p>
            <p className="text-xs text-muted-foreground/60">Miembro desde {formatDate(createdAt)}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <ProfileSkeleton />
      ) : (
        <Tabs defaultValue="info" className="space-y-5">
          <TabsList className="bg-card border border-border/60 shadow-sm h-auto p-1 gap-0.5 rounded-xl w-fit">
            <TabsTrigger
              value="info"
              className="rounded-lg px-4 py-2 text-xs font-bold gap-1.5 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition"
            >
              <User size={12} weight="bold" /> Información
            </TabsTrigger>
            <TabsTrigger
              value="config"
              className="rounded-lg px-4 py-2 text-xs font-bold gap-1.5 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition"
            >
              <SlidersHorizontal size={12} weight="bold" /> Configuración
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="rounded-lg px-4 py-2 text-xs font-bold gap-1.5 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition"
            >
              <Lock size={12} weight="bold" /> Seguridad
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-0">
            <ProfileForm
              profile={profile}
              role={role}
              createdAt={createdAt}
              onSave={saveProfile}
              getInitials={getInitials}
              formatDate={formatDate}
              hideHeader={true}
            />
          </TabsContent>

          <TabsContent value="config" className="mt-0 space-y-5">
            <ApiKeysCard />
          </TabsContent>

          <TabsContent value="security" className="mt-0 space-y-5">
            <TotpSetupCard totpEnabled={!!profile?.totp_enabled} />
            <PasswordChangeForm />
            <DeleteAccountForm />
          </TabsContent>
        </Tabs>
      )}
    </motion.div>
  )
}
