export interface Permission {
  id: string
  label: string
  desc?: string
}

export const AVAILABLE_PERMISSIONS: Permission[] = [
  { id: 'admin:users', label: 'Gestionar Usuarios' },
  { id: 'admin:roles', label: 'Gestionar Roles' },
  { id: 'ova:create', label: 'Crear OVAs' },
  { id: 'ova:edit', label: 'Editar OVAs' },
  { id: 'ova:delete', label: 'Eliminar OVAs' },
  { id: 'ova:view', label: 'Ver OVAs' },
  { id: 'admin:settings', label: 'Configuración del Sistema' },
  { id: 'ai:models:self', label: 'Configurar modelos propios' },
  { id: 'ai:fallback:self', label: 'Configurar fallback propio' },
  { id: 'ai:models:platform', label: 'Configurar modelos de plataforma' },
  { id: 'users:link', label: 'Vincular usuarios' },
  { id: 'users:link:admin', label: 'Administrar vínculos' },
]
