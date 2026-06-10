import { useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '../lib/http.js'

export function useChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordValidationError, setPasswordValidationError] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const validatePassword = () => {
    const errors = { currentPassword: '', newPassword: '', confirmPassword: '' }
    let isValid = true

    if (!currentPassword) {
      errors.currentPassword = 'La contraseña actual es requerida.'
      isValid = false
    }

    if (newPassword.length < 8) {
      errors.newPassword = 'La nueva contraseña debe tener al menos 8 caracteres.'
      isValid = false
    } else if (!(/[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword))) {
      errors.newPassword = 'La nueva contraseña debe contener letras y números (alfanumérica).'
      isValid = false
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'La confirmación no coincide con la nueva contraseña.'
      isValid = false
    }

    setPasswordValidationError(errors)
    return isValid
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (!validatePassword()) return

    setSavingPassword(true)

    try {
      const response = await apiFetch('/api/users/me/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      })

      if (response.status === 200) {
        toast.success('¡Contraseña actualizada con éxito!')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error(data.detail || 'Error al actualizar la contraseña.')
      }
    } catch {
      toast.error('Error de conexión con el servidor.')
    } finally {
      setSavingPassword(false)
    }
  }

  return {
    currentPassword,
    newPassword,
    confirmPassword,
    savingPassword,
    passwordValidationError,
    setCurrentPassword,
    setNewPassword,
    setConfirmPassword,
    handlePasswordSubmit,
  }
}
