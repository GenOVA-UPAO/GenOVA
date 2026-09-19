export interface Permission {
  id: string;
  label: string;
  desc?: string;
}

/** IDs alineados con backend/seed.py y require_permission(...). */
export const AVAILABLE_PERMISSIONS: Permission[] = [
  {
    id: "create_ova",
    label: "Crear OVAs",
    desc: "Puede iniciar y generar nuevos objetos virtuales de aprendizaje.",
  },
  {
    id: "view_ova",
    label: "Ver OVAs",
    desc: "Puede consultar OVAs a los que tenga acceso.",
  },
  {
    id: "export_ova",
    label: "Exportar OVAs",
    desc: "Puede exportar OVAs (p. ej. paquete SCORM).",
  },
  {
    id: "manage_users",
    label: "Gestionar usuarios",
    desc: "Puede listar, editar y administrar cuentas de usuario.",
  },
  {
    id: "manage_roles",
    label: "Gestionar roles",
    desc: "Puede crear y modificar roles y sus permisos.",
  },
  {
    id: "view_analytics",
    label: "Ver analíticas",
    desc: "Puede consultar métricas e informes de uso.",
  },
  {
    id: "ai:models:self",
    label: "Configurar modelos propios",
    desc: "Puede elegir y ajustar sus propios modelos de IA.",
  },
  {
    id: "ai:fallback:self",
    label: "Configurar respaldo de modelos propio",
    desc: "Puede definir la cadena de respaldo de modelos de IA personales.",
  },
  {
    id: "ai:models:platform",
    label: "Configurar modelos de la plataforma",
    desc: "Puede administrar los modelos de IA globales del sistema.",
  },
  {
    id: "users:link",
    label: "Vincular usuarios",
    desc: "Puede generar códigos para vincular alumnos a su cuenta.",
  },
  {
    id: "users:link:admin",
    label: "Administrar vínculos",
    desc: "Puede administrar los vínculos entre docentes y alumnos.",
  },
];

export function getPermissionLabel(permId: string): string {
  return AVAILABLE_PERMISSIONS.find((perm) => perm.id === permId)?.label ?? permId;
}

export function togglePermission(permissions: string[], permissionId: string): string[] {
  if (permissions.includes(permissionId)) {
    return permissions.filter((id) => id !== permissionId);
  }
  return [...permissions, permissionId];
}
