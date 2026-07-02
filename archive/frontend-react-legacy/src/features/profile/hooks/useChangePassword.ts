import { toast } from 'sonner'
import { apiFetch } from '../../../core/lib/http/client'

interface ChangePasswordValues {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// Sólo la llamada a la API; el form + validación viven en PasswordChangeForm
// (React Hook Form + Zod). Devuelve true en éxito para que el form se resetee.
export function useChangePassword() {
  const changePassword = async (
    values: ChangePasswordValues,
  ): Promise<boolean> => {
    try {
      const response = await apiFetch('/api/users/me/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: values.currentPassword,
          new_password: values.newPassword,
          confirm_password: values.confirmPassword,
        }),
      })
      if (response.status === 200) {
        toast.success('¡Contraseña actualizada con éxito!')
        return true
      }
      const data = (await response.json().catch(() => ({}))) as {
        detail?: string
      }
      toast.error(data.detail || 'Error al actualizar la contraseña.')
      return false
    } catch {
      toast.error('Error de conexión con el servidor.')
      return false
    }
  }

  return { changePassword }
}
