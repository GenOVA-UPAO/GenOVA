import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useProfile } from '../hooks/useProfile.js'
import { ProfileForm } from '../components/ProfileForm.jsx'
import { PasswordChangeForm } from '../components/PasswordChangeForm.jsx'
import { ApiKeysCard } from '../components/settings/ApiKeysCard.jsx'
import { LlmSettingsCard } from '../components/settings/LlmSettingsCard.jsx'
import { OvaSettingsCard } from '../components/settings/OvaSettingsCard.jsx'
import { ProfileSkeleton } from '../components/ProfileSkeleton.jsx'

export function ProfilePage() {
  const {
    fullName,
    email,
    universityId,
    gender,
    phoneNumber,
    createdAt,
    role,
    loading,
    saving,
    currentPassword,
    newPassword,
    confirmPassword,
    savingPassword,
    validationError,
    passwordValidationError,
    fetchProfile,
    setFullName,
    setEmail,
    setUniversityId,
    setGender,
    setPhoneNumber,
    setCurrentPassword,
    setNewPassword,
    setConfirmPassword,
    handleProfileSubmit,
    handlePasswordSubmit,
    getInitials,
    formatDate,
  } = useProfile()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Configuración
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestiona tu perfil, modelos de IA y claves de acceso.
        </p>
      </div>

      <Tabs defaultValue="perfil" className="space-y-6">
        <TabsList variant="line">
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="modelos">Modelos IA</TabsTrigger>
          <TabsTrigger value="imagenes">Imágenes OVA</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {loading ? (
              <ProfileSkeleton />
            ) : (
              <ProfileForm
                fullName={fullName}
                email={email}
                universityId={universityId}
                gender={gender}
                phoneNumber={phoneNumber}
                role={role}
                createdAt={createdAt}
                validationError={validationError}
                saving={saving}
                onFullNameChange={(e) => setFullName(e.target.value)}
                onEmailChange={(e) => setEmail(e.target.value)}
                onUniversityIdChange={(e) => setUniversityId(e.target.value)}
                onGenderChange={(e) => setGender(e.target.value)}
                onPhoneNumberChange={(e) => setPhoneNumber(e.target.value)}
                onReset={fetchProfile}
                onSubmit={handleProfileSubmit}
                getInitials={getInitials}
                formatDate={formatDate}
              />
            )}
            {!loading && (
              <PasswordChangeForm
                currentPassword={currentPassword}
                newPassword={newPassword}
                confirmPassword={confirmPassword}
                validationError={passwordValidationError}
                savingPassword={savingPassword}
                onCurrentPasswordChange={(e) => setCurrentPassword(e.target.value)}
                onNewPasswordChange={(e) => setNewPassword(e.target.value)}
                onConfirmPasswordChange={(e) => setConfirmPassword(e.target.value)}
                onSubmit={handlePasswordSubmit}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="modelos">
          <LlmSettingsCard />
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
