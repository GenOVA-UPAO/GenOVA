import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getToken } from '../lib/auth.js'
import { useRoleDelete } from './useRoleDelete.js'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export function useRoles() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState(null)

  const [roleName, setRoleName] = useState('')
  const [roleDescription, setRoleDescription] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState([])
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const del = useRoleDelete(setRoles)

  const fetchRoles = async () => {
    const token = getToken()
    try {
      const response = await fetch(`${apiBaseUrl}/api/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.status === 200) {
        setRoles(await response.json())
      } else {
        setError('No se pudo cargar la lista de roles.')
      }
    } catch {
      setError('Error al conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de roles al montar
    fetchRoles()
  }, [])

  const handlePermissionToggle = (permId) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    )
  }

  const handleOpenModal = () => {
    setEditingRole(null)
    setRoleName('')
    setRoleDescription('')
    setSelectedPermissions([])
    setFormError('')
    setIsModalOpen(true)
  }

  const handleEditClick = (role) => {
    setEditingRole(role)
    setRoleName(role.name)
    setRoleDescription(role.description || '')
    setSelectedPermissions(role.permissions || [])
    setFormError('')
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    if (!isSubmitting) setIsModalOpen(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const name = roleName.trim()
    if (!name) {
      setFormError('El nombre del rol es obligatorio.')
      return
    }
    if (name.length > 64) {
      setFormError('El nombre del rol no debe superar los 64 caracteres.')
      return
    }

    setIsSubmitting(true)
    setFormError('')

    const token = getToken()
    const isEdit = !!editingRole
    const url = isEdit ? `${apiBaseUrl}/api/roles/${editingRole.id}` : `${apiBaseUrl}/api/roles`
    const method = isEdit ? 'PATCH' : 'POST'

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name,
          description: roleDescription,
          permissions: selectedPermissions,
        }),
      })

      const data = await response.json()

      if (response.status === 200 || response.status === 201) {
        if (isEdit) {
          setRoles((prev) => prev.map((r) => (r.id === editingRole.id ? data : r)))
          toast.success('Rol actualizado con éxito')
        } else {
          setRoles((prev) => [...prev, data])
          toast.success('Rol creado con éxito')
        }
        setIsModalOpen(false)
      } else if (response.status === 409) {
        setFormError('Ya existe un rol con ese nombre.')
      } else {
        setFormError(
          data.detail || `Ocurrió un error inesperado al ${isEdit ? 'actualizar' : 'crear'} el rol.`
        )
      }
    } catch {
      setFormError('No se pudo conectar con el servidor. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    roles,
    loading,
    error,
    isModalOpen,
    editingRole,
    roleName,
    setRoleName,
    roleDescription,
    setRoleDescription,
    selectedPermissions,
    formError,
    setFormError,
    isSubmitting,
    fetchRoles,
    handlePermissionToggle,
    handleOpenModal,
    handleEditClick,
    handleCloseModal,
    handleSubmit,
    // delete
    deletingRole: del.deletingRole,
    isDeleteModalOpen: del.isDeleteModalOpen,
    reassignRoleId: del.reassignRoleId,
    deleteError: del.deleteError,
    isDeleting: del.isDeleting,
    setIsDeleteModalOpen: del.setIsDeleteModalOpen,
    setReassignRoleId: del.setReassignRoleId,
    setDeleteError: del.setDeleteError,
    handleDeleteClick: del.handleDeleteClick,
    handleConfirmDelete: del.handleConfirmDelete,
  }
}
