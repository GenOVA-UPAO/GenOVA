// Tipos compartidos del dominio admin (roles/usuarios), reusados por los hooks.

export interface Role {
  id: string
  name?: string
  user_count?: number
  permissions?: string[]
  [key: string]: unknown
}

export interface AdminUser {
  id: string
  [key: string]: unknown
}
