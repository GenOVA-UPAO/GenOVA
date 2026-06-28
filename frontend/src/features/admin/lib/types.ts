// Tipos compartidos del dominio admin (roles/usuarios), reusados por los hooks.

export interface Role {
  id: string
  name?: string
  description?: string
  user_count?: number
  permissions?: string[]
  [key: string]: unknown
}

export interface AdminUser {
  id: string
  full_name?: string
  email: string
  is_active?: boolean
  role?: { id: string; name: string }
  phone_number?: string
  university_id?: number | string
  locked_until?: string | null
  gender?: string
  [key: string]: unknown
}
