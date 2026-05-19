import { useProfile } from '../hooks/useProfile.js'
import { ProfileForm } from '../components/ProfileForm.jsx'
import { PasswordChangeForm } from '../components/PasswordChangeForm.jsx'

export function ProfilePage() {
  const {
    fullName,
    email,
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
    setCurrentPassword,
    setNewPassword,
    setConfirmPassword,
    handleProfileSubmit,
    handlePasswordSubmit,
    getInitials,
    formatDate,
  } = useProfile()

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Configuración de Perfil
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Modifica tus datos de contacto y administra la seguridad de tu cuenta.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
              <p className="text-xs text-slate-400">Cargando perfil...</p>
            </div>
          </div>
        ) : (
          <ProfileForm
            fullName={fullName}
            email={email}
            role={role}
            createdAt={createdAt}
            validationError={validationError}
            saving={saving}
            onFullNameChange={(e) => setFullName(e.target.value)}
            onEmailChange={(e) => setEmail(e.target.value)}
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
    </div>
  )
}
