import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getToken } from '../lib/auth.js'
import { useChangePassword } from './useChangePassword.js'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function getInitials(fullName) {
  if (!fullName) return 'U'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0][0].toUpperCase()
}

function formatDate(isoString) {
  if (!isoString) return '-'
  return new Date(isoString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function useProfile() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [validationError, setValidationError] = useState({ fullName: '', email: '' })

  const passwordForm = useChangePassword()

  const fetchProfile = async () => {
    const token = getToken()
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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

  return {
    fullName,
    email,
    createdAt,
    role,
    loading,
    saving,
    validationError,
    fetchProfile,
    setFullName,
    setEmail,
    handleProfileSubmit,
    getInitials: () => getInitials(fullName),
    formatDate,
    // password
    currentPassword: passwordForm.currentPassword,
    newPassword: passwordForm.newPassword,
    confirmPassword: passwordForm.confirmPassword,
    savingPassword: passwordForm.savingPassword,
    passwordValidationError: passwordForm.passwordValidationError,
    setCurrentPassword: passwordForm.setCurrentPassword,
    setNewPassword: passwordForm.setNewPassword,
    setConfirmPassword: passwordForm.setConfirmPassword,
    handlePasswordSubmit: passwordForm.handlePasswordSubmit,
  }
}
