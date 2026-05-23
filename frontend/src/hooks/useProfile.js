import { useEffect, useState } from 'react'
import { getToken } from '../lib/auth.js'
import { toast } from 'sonner'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export function useProfile() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [role, setRole] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const [validationError, setValidationError] = useState({ fullName: '', email: '' })
  const [passwordValidationError, setPasswordValidationError] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const fetchProfile = async () => {
    const token = getToken()

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 200) {
        const data = await response.json()
        setFullName(data.full_name || '')
        setEmail(data.email || '')
        setCreatedAt(data.created_at || '')
        setRole(data.role || 'usuario')
      } else {
        toast.error('No se pudo cargar la información de perfil.')
      }
    } catch {
      toast.error('Error al conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial del perfil al montar
    fetchProfile()
  }, [])

  const validate = () => {
    const errors = { fullName: '', email: '' }
    let isValid = true

    if (fullName.trim().length < 3) {
      errors.fullName = 'El nombre completo debe tener al menos 3 caracteres.'
      isValid = false
    }

    if (!email.trim()) {
      errors.email = 'El correo electrónico es requerido.'
      isValid = false
    } else if (!/@.*\./.test(email)) {
      errors.email = 'El formato del correo electrónico es inválido.'
      isValid = false
    }

    setValidationError(errors)
    return isValid
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    const token = getToken()

    try {
      const response = await fetch(`${apiBaseUrl}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
        }),
      })

      if (response.status === 200) {
        const data = await response.json()
        setFullName(data.full_name || '')
        setEmail(data.email || '')
        toast.success('¡Perfil actualizado con éxito!')
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error(data.detail || 'Error al actualizar el perfil.')
      }
    } catch {
      toast.error('Error de conexión con el servidor.')
    } finally {
      setSaving(false)
    }
  }

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
    const token = getToken()

    try {
      const response = await fetch(`${apiBaseUrl}/api/users/me/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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

  const getInitials = () => {
    if (!fullName) return 'U'
    const parts = fullName.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return parts[0][0].toUpperCase()
  }

  const formatDate = (isoString) => {
    if (!isoString) return '-'
    const date = new Date(isoString)
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return {
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
  }
}
