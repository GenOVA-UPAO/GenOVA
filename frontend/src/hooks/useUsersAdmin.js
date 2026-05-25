import { useEffect, useState } from 'react'
import { getToken } from '../lib/auth.js'
import { toast } from 'sonner'
import { getRoleColorClasses } from '../lib/roleUtils.js'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export function useUsersAdmin() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingUserId, setUpdatingUserId] = useState('')
  const [updateError, setUpdateError] = useState('')
  const [currentUser, setCurrentUser] = useState(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const fetchCurrentUser = async () => {
    const token = getToken()
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.status === 200) {
        const data = await response.json()
        setCurrentUser(data)
      }
    } catch {
      // silently fail — non-critical auxiliary data
    }
  }

  const fetchRoles = async () => {
    const token = getToken()
    try {
      const response = await fetch(`${apiBaseUrl}/api/roles`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.status === 200) {
        const data = await response.json()
        setRoles(data)
      }
    } catch {
      // silently fail — non-critical auxiliary data
    }
  }

  const fetchUsers = async (page = 1) => {
    setLoading(true)
    setError('')
    const token = getToken()
    try {
      const response = await fetch(`${apiBaseUrl}/api/users?page=${page}&limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.status === 200) {
        const data = await response.json()
        setUsers(data.users || [])
        setTotalPages(data.total_pages || 1)
        setCurrentPage(data.page || 1)
        setTotalItems(data.total_items || 0)
      } else {
        setError('No se pudo cargar la lista de usuarios.')
      }
    } catch {
      setError('Error al conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- carga inicial de usuarios, roles y sesión */
    fetchCurrentUser()
    fetchRoles()
    fetchUsers(1)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  const handleRoleChange = async (userId, roleId) => {
    setUpdatingUserId(userId)
    setUpdateError('')
    const token = getToken()

    try {
      const response = await fetch(`${apiBaseUrl}/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role_id: roleId,
        }),
      })

      if (response.status === 200) {
        const updatedUser = await response.json()
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: updatedUser.role } : u))
        )
        toast.success('Rol del usuario actualizado exitosamente')
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error(data.detail || 'Error al actualizar el rol del usuario.')
      }
    } catch {
      toast.error('Error de conexión con el servidor.')
    } finally {
      setUpdatingUserId('')
    }
  }

  const handleEditUser = async (userId, updatedFields) => {
    setUpdatingUserId(userId)
    const token = getToken()
    try {
      const response = await fetch(`${apiBaseUrl}/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedFields),
      })

      if (response.status === 200) {
        toast.success('Perfil de usuario actualizado exitosamente')
        fetchUsers(currentPage)
        return true
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error(data.detail || 'Error al actualizar el perfil del usuario.')
        return false
      }
    } catch {
      toast.error('Error de conexión con el servidor.')
      return false
    } finally {
      setUpdatingUserId('')
    }
  }

  const handleToggleStatus = async (userId, isActive) => {
    setUpdatingUserId(userId)
    const token = getToken()
    try {
      const response = await fetch(`${apiBaseUrl}/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: isActive }),
      })

      if (response.status === 200) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_active: isActive } : u))
        )
        toast.success(isActive ? 'Usuario activado exitosamente' : 'Usuario desactivado exitosamente')
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error(data.detail || 'Error al actualizar el estado del usuario.')
      }
    } catch {
      toast.error('Error de conexión con el servidor.')
    } finally {
      setUpdatingUserId('')
    }
  }

  const handleUnlockUser = async (userId) => {
    setUpdatingUserId(userId)
    const token = getToken()
    try {
      const response = await fetch(`${apiBaseUrl}/api/users/${userId}/unlock`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 200) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, failed_login_attempts: 0, locked_until: null } : u))
        )
        toast.success('Usuario desbloqueado exitosamente')
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error(data.detail || 'Error al desbloquear al usuario.')
      }
    } catch {
      toast.error('Error de conexión con el servidor.')
    } finally {
      setUpdatingUserId('')
    }
  }

  const handleSendResetEmail = async (userId) => {
    setUpdatingUserId(userId)
    const token = getToken()
    try {
      const response = await fetch(`${apiBaseUrl}/api/users/${userId}/reset-password-email`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 200) {
        toast.success('Correo de restablecimiento enviado exitosamente')
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error(data.detail || 'Error al enviar correo de restablecimiento.')
      }
    } catch {
      toast.error('Error de conexión con el servidor.')
    } finally {
      setUpdatingUserId('')
    }
  }

  const handleGenerateResetWhatsApp = async (userId) => {
    setUpdatingUserId(userId)
    const token = getToken()
    try {
      const response = await fetch(`${apiBaseUrl}/api/users/${userId}/reset-password-whatsapp`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 200) {
        const data = await response.json()
        toast.success('Código de recuperación por WhatsApp generado')
        return data // contains phone_number, otp_code, text
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error(data.detail || 'Error al generar código de recuperación.')
        return null
      }
    } catch {
      toast.error('Error de conexión con el servidor.')
      return null
    } finally {
      setUpdatingUserId('')
    }
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchUsers(newPage)
    }
  }

  const formatDate = (isoString) => {
    if (!isoString) return '-'
    const date = new Date(isoString)
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return {
    users,
    roles,
    loading,
    error,
    updatingUserId,
    updateError,
    currentUser,
    currentPage,
    totalPages,
    totalItems,
    fetchUsers,
    handleRoleChange,
    handleEditUser,
    handleToggleStatus,
    handleUnlockUser,
    handleSendResetEmail,
    handleGenerateResetWhatsApp,
    handlePageChange,
    formatDate,
    getRoleColorClasses,
    setUpdateError,
  }
}

