import { type FormEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '../../../core/lib/http/client'
import type { Role } from '../lib/types'
import { useRoleDelete } from './useRoleDelete'

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)

  const [roleName, setRoleName] = useState('')
  const [roleDescription, setRoleDescription] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const del = useRoleDelete(setRoles)

  const fetchRoles = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await apiFetch('/api/roles')
      if (response.status === 200) {
        setRoles((await response.json()) as Role[])
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
    fetchRoles()
  }, [])

  const handlePermissionToggle = (permId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId],
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

  const handleEditClick = (role: Role) => {
    setEditingRole(role)
    setRoleName(role.name ?? '')
    setRoleDescription((role.description as string) || '')
    setSelectedPermissions(role.permissions || [])
    setFormError('')
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    if (!isSubmitting) setIsModalOpen(false)
  }

  const handleSubmit = async (e: FormEvent) => {
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

    const isEdit = !!editingRole
    const path = isEdit ? `/api/roles/${editingRole?.id}` : '/api/roles'
    const method = isEdit ? 'PATCH' : 'POST'

    try {
      const response = await apiFetch(path, {
        method,
        body: JSON.stringify({ name, description: roleDescription, permissions: selectedPermissions }),
      })

      const data = (await response.json()) as Role & { detail?: string }

      if (response.status === 200 || response.status === 201) {
        if (isEdit) {
          setRoles((prev) => prev.map((r) => (r.id === editingRole?.id ? data : r)))
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
          data.detail || `Ocurrió un error inesperado al ${isEdit ? 'actualizar' : 'crear'} el rol.`,
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
    ...del,
  }
}
