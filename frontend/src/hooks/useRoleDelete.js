import { useState } from 'react'
import { toast } from 'sonner'
import { getToken } from '../lib/auth.js'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export function useRoleDelete(setRoles) {
  const [deletingRole, setDeletingRole] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [reassignRoleId, setReassignRoleId] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteClick = (role) => {
    setDeletingRole(role)
    setReassignRoleId('')
    setDeleteError('')
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingRole) return
    const isReassign = deletingRole.user_count > 0
    if (isReassign && !reassignRoleId) {
      setDeleteError('Por favor selecciona un rol de destino.')
      return
    }
    setIsDeleting(true)
    setDeleteError('')
    const token = getToken()
    const baseUrl = `${apiBaseUrl}/api/roles/${deletingRole.id}`
    const url = isReassign ? `${baseUrl}?reassign_to_id=${reassignRoleId}` : baseUrl
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.status === 204) {
        if (isReassign) {
          setRoles((prev) =>
            prev
              .map((r) =>
                r.id === reassignRoleId
                  ? { ...r, user_count: (r.user_count || 0) + deletingRole.user_count }
                  : r
              )
              .filter((r) => r.id !== deletingRole.id)
          )
        } else {
          setRoles((prev) => prev.filter((r) => r.id !== deletingRole.id))
        }
        setIsDeleteModalOpen(false)
        toast.success('Rol eliminado con éxito')
      } else {
        const data = await response.json().catch(() => ({}))
        setDeleteError(data.detail || 'Ocurrió un error inesperado al eliminar el rol.')
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
