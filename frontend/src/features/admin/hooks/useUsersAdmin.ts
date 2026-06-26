import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getRoleColorClasses } from '../../../features/admin/lib/roleUtils'
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
} from '../services/adminUsersService'
import type { AdminUser, Role } from '../lib/types'

const FAILURE_MSG = 'Error de conexión con el servidor.'

interface UsersPage {
  users?: AdminUser[]
  total_pages?: number
  total_items?: number
}

function detail(body: unknown, fallback: string): string {
  const b = body as { detail?: string; message?: string } | null
  return (b && (b.detail || b.message)) || fallback
}

export function useUsersAdmin() {
  const qc = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)
  const [updatingUserId, setUpdatingUserId] = useState('')
  const [updateError, setUpdateError] = useState('')

  const usersQuery = useQuery({
    queryKey: ['adminUsers', currentPage],
    queryFn: async (): Promise<UsersPage> => {
      const { ok, body } = await fetchUsersPage(currentPage)
      if (!ok) throw new Error('No se pudo cargar la lista de usuarios.')
      return body as UsersPage
    },
  })
  const rolesQuery = useQuery({
    queryKey: ['adminRoles'],
    queryFn: async (): Promise<Role[]> => {
      const { ok, body } = await fetchRoles()
      return ok ? (body as Role[]) : []
    },
  })
  const currentUserQuery = useQuery({
    queryKey: ['me'],
    queryFn: async (): Promise<AdminUser | null> => {
      const { ok, body } = await fetchCurrentUser()
      return ok ? (body as AdminUser) : null
    },
  })

  const users = usersQuery.data?.users || []
  const totalPages = usersQuery.data?.total_pages || 1
  const totalItems = usersQuery.data?.total_items || 0

  const loadUsers = useCallback(
    (page = currentPage) => {
      setCurrentPage(page)
      qc.invalidateQueries({ queryKey: ['adminUsers'] })
    },
    [currentPage, qc],
  )

  async function withUpdating<T>(userId: string, fn: () => Promise<T>): Promise<T | null> {
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

  const refreshUsers = () => qc.invalidateQueries({ queryKey: ['adminUsers'] })

  async function handleRoleChange(userId: string, roleId: string) {
    await withUpdating(userId, async () => {
      const { ok, body } = await updateUserRole(userId, roleId)
      if (!ok) return toast.error(detail(body, 'Error al actualizar el rol.'))
      refreshUsers()
      toast.success('Rol del usuario actualizado.')
    })
  }

  async function handleEditUser(userId: string, fields: Record<string, unknown>) {
    return withUpdating(userId, async () => {
      const { ok, body } = await updateUserProfile(userId, fields)
      if (!ok) {
        toast.error(detail(body, 'Error al actualizar el perfil.'))
        return false
      }
      toast.success('Perfil actualizado.')
      refreshUsers()
      return true
    })
  }

  async function handleToggleStatus(userId: string, isActive: boolean) {
    await withUpdating(userId, async () => {
      const { ok, body } = await updateUserStatus(userId, isActive)
      if (!ok) return toast.error(detail(body, 'Error al actualizar el estado.'))
      refreshUsers()
      toast.success(isActive ? 'Usuario activado.' : 'Usuario desactivado.')
    })
  }

  async function handleUnlockUser(userId: string) {
    await withUpdating(userId, async () => {
      const { ok, body } = await unlockUser(userId)
      if (!ok) return toast.error(detail(body, 'Error al desbloquear al usuario.'))
      refreshUsers()
      toast.success('Usuario desbloqueado.')
    })
  }

  async function handleSendResetEmail(userId: string) {
    await withUpdating(userId, async () => {
      const { ok, body } = await sendResetEmail(userId)
      if (!ok) return toast.error(detail(body, 'Error al enviar el correo.'))
      toast.success('Correo de restablecimiento enviado.')
    })
  }

  async function handleGenerateResetWhatsApp(userId: string) {
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

  function handlePageChange(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage)
  }

  return {
    users,
    roles: rolesQuery.data || [],
    loading: usersQuery.isLoading,
    error: usersQuery.isError ? 'No se pudo cargar la lista de usuarios.' : '',
    updatingUserId,
    updateError,
    currentUser: currentUserQuery.data || null,
    currentPage,
    totalPages,
    totalItems,
    fetchUsers: loadUsers,
    handleRoleChange,
    handleEditUser,
    handleToggleStatus,
    handleUnlockUser,
    handleSendResetEmail,
    handleGenerateResetWhatsApp,
    handlePageChange,
    getRoleColorClasses,
    setUpdateError,
  }
}
