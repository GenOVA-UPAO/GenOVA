import { type Dispatch, type SetStateAction, useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '../../../core/lib/http/client'
import type { Role } from '../lib/types'

export function useRoleDelete(setRoles: Dispatch<SetStateAction<Role[]>>) {
  const [deletingRole, setDeletingRole] = useState<Role | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [reassignRoleId, setReassignRoleId] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteClick = (role: Role) => {
    setDeletingRole(role)
    setReassignRoleId('')
    setDeleteError('')
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingRole) return
    const userCount = deletingRole.user_count ?? 0
    const isReassign = userCount > 0
    if (isReassign && !reassignRoleId) {
      setDeleteError('Por favor selecciona un rol de destino.')
      return
    }
    setIsDeleting(true)
    setDeleteError('')
    const basePath = `/api/roles/${deletingRole.id}`
    const path = isReassign
      ? `${basePath}?reassign_to_id=${reassignRoleId}`
      : basePath
    try {
      const response = await apiFetch(path, { method: 'DELETE' })
      if (response.status === 204) {
        if (isReassign) {
          setRoles((prev) =>
            prev
              .map((r) =>
                r.id === reassignRoleId
                  ? { ...r, user_count: (r.user_count || 0) + userCount }
                  : r,
              )
              .filter((r) => r.id !== deletingRole.id),
          )
        } else {
          setRoles((prev) => prev.filter((r) => r.id !== deletingRole.id))
        }
        setIsDeleteModalOpen(false)
        toast.success('Rol eliminado con éxito')
      } else {
        const data = (await response.json().catch(() => ({}))) as {
          detail?: string
        }
        setDeleteError(
          data.detail || 'Ocurrió un error inesperado al eliminar el rol.',
        )
      }
    } catch {
      setDeleteError('No se pudo conectar con el servidor. Intenta de nuevo.')
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    deletingRole,
    isDeleteModalOpen,
    reassignRoleId,
    deleteError,
    isDeleting,
    setIsDeleteModalOpen,
    setReassignRoleId,
    setDeleteError,
    handleDeleteClick,
    handleConfirmDelete,
  }
}
