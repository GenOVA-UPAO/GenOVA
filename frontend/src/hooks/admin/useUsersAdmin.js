import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getRoleColorClasses } from '../lib/roleUtils.js'
import {
  fetchCurrentUser,
  fetchRoles,
  fetchUsersPage,
  generateResetWhatsApp,
  sendResetEmail,
  unlockUser,
  updateUserProfile,
  updateUserRole,
  updateUserStatus,
} from '../services/adminUsersService.js'

const FAILURE_MSG = 'Error de conexión con el servidor.'

function detail(body, fallback) {
  return (body && (body.detail || body.message)) || fallback
}

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

  async function loadUsers(page = 1) {
    setLoading(true)
    setError('')
    const { ok, body } = await fetchUsersPage(page)
    if (ok) {
      setUsers(body.users || [])
      setTotalPages(body.total_pages || 1)
      setCurrentPage(body.page || 1)
      setTotalItems(body.total_items || 0)
    } else {
      setError('No se pudo cargar la lista de usuarios.')
    }
    setLoading(false)
  }

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- bootstrap */
    fetchCurrentUser().then(({ ok, body }) => ok && setCurrentUser(body))
    fetchRoles().then(({ ok, body }) => ok && setRoles(body))
    loadUsers(1)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  async function withUpdating(userId, fn) {
    setUpdatingUserId(userId)
    try {
      return await fn()
    } catch {
      toast.error(FAILURE_MSG)
      return null
    } finally {
      setUpdatingUserId('')
    }
  }

  async function handleRoleChange(userId, roleId) {
    await withUpdating(userId, async () => {
      const { ok, body } = await updateUserRole(userId, roleId)
      if (!ok) return toast.error(detail(body, 'Error al actualizar el rol.'))
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: body.role } : u)))
      toast.success('Rol del usuario actualizado.')
    })
  }

  async function handleEditUser(userId, fields) {
    return withUpdating(userId, async () => {
      const { ok, body } = await updateUserProfile(userId, fields)
      if (!ok) {
        toast.error(detail(body, 'Error al actualizar el perfil.'))
        return false
      }
      toast.success('Perfil actualizado.')
      loadUsers(currentPage)
      return true
    })
  }

  async function handleToggleStatus(userId, isActive) {
    await withUpdating(userId, async () => {
      const { ok, body } = await updateUserStatus(userId, isActive)
      if (!ok) return toast.error(detail(body, 'Error al actualizar el estado.'))
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: isActive } : u)))
      toast.success(isActive ? 'Usuario activado.' : 'Usuario desactivado.')
    })
  }

  async function handleUnlockUser(userId) {
    await withUpdating(userId, async () => {
      const { ok, body } = await unlockUser(userId)
      if (!ok) return toast.error(detail(body, 'Error al desbloquear al usuario.'))
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, failed_login_attempts: 0, locked_until: null } : u
        )
      )
      toast.success('Usuario desbloqueado.')
    })
  }

  async function handleSendResetEmail(userId) {
    await withUpdating(userId, async () => {
      const { ok, body } = await sendResetEmail(userId)
      if (!ok) return toast.error(detail(body, 'Error al enviar el correo.'))
      toast.success('Correo de restablecimiento enviado.')
    })
  }

  async function handleGenerateResetWhatsApp(userId) {
    return withUpdating(userId, async () => {
      const { ok, body } = await generateResetWhatsApp(userId)
      if (!ok) {
        toast.error(detail(body, 'Error al generar el enlace.'))
        return null
      }
      toast.success('Enlace de WhatsApp generado.')
      return body
    })
  }

  function handlePageChange(newPage) {
    if (newPage >= 1 && newPage <= totalPages) loadUsers(newPage)
  }

  return {
    users, roles, loading, error,
    updatingUserId, updateError, currentUser,
    currentPage, totalPages, totalItems,
    fetchUsers: loadUsers,
    handleRoleChange, handleEditUser, handleToggleStatus, handleUnlockUser,
    handleSendResetEmail, handleGenerateResetWhatsApp,
    handlePageChange,
    getRoleColorClasses,
    setUpdateError,
  }
}
