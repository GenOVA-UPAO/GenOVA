import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '../../../core/lib/http/client'

interface ProfileData {
  full_name?: string
  email?: string
  university_id?: string | number
  gender?: string
  phone_number?: string
  role?: string
  created_at?: string
}

interface ProfileFormValues {
  full_name: string
  email: string
  university_id?: string
  gender?: string
  phone_number?: string
}

function getInitials(fullName?: string): string {
  if (!fullName) return 'U'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0][0].toUpperCase()
}

function formatDate(isoString?: string): string {
  if (!isoString) return '-'
  return new Date(isoString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// Lectura del perfil vía TanStack Query; el form vive en ProfileForm (RHF+Zod).
export function useProfile() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['me-profile'],
    queryFn: async (): Promise<ProfileData> => {
      const response = await apiFetch('/api/auth/me')
      if (response.status !== 200) throw new Error('No se pudo cargar la información de perfil.')
      return response.json()
    },
  })

  const profile = {
    full_name: data?.full_name || '',
    email: data?.email || '',
    university_id: data?.university_id ? String(data.university_id) : '',
    gender: data?.gender || 'otro',
    phone_number: data?.phone_number || '',
  }

  const saveProfile = async (values: ProfileFormValues): Promise<boolean> => {
    try {
      const response = await apiFetch('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: values.full_name.trim(),
          email: values.email.trim().toLowerCase(),
          university_id: values.university_id ? Number.parseInt(values.university_id, 10) : null,
          gender: values.gender || null,
          phone_number: values.phone_number?.trim() || null,
        }),
      })
      if (response.status === 200) {
        await refetch()
        toast.success('¡Perfil actualizado con éxito!')
        return true
      }
      const data2 = (await response.json().catch(() => ({}))) as { detail?: string }
      toast.error(data2.detail || 'Error al actualizar el perfil.')
      return false
    } catch {
      toast.error('Error de conexión con el servidor.')
      return false
    }
  }

  return {
    profile,
    role: data?.role || 'usuario',
    createdAt: data?.created_at || '',
    loading: isLoading,
    saveProfile,
    refetch,
    getInitials: () => getInitials(profile.full_name),
    formatDate,
  }
}
