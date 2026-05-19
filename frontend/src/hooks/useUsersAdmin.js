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
    fetchCurrentUser()
    fetchRoles()
    fetchUsers(1)
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
    handlePageChange,
    formatDate,
    getRoleColorClasses,
    setUpdateError,
  }
}
