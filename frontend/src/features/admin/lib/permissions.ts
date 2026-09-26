export type PermissionGroup = "ovas" | "admin" | "ai" | "links";

export interface Permission {
  id: string;
  label: string;
  desc?: string;
  group: PermissionGroup;
}

/** Grupos en el orden en que se muestran en el formulario de rol. */
export const PERMISSION_GROUPS: { id: PermissionGroup; label: string }[] = [
  { id: "ovas", label: "OVAs" },
  { id: "admin", label: "Administración" },
  { id: "ai", label: "Modelos de IA" },
  { id: "links", label: "Docentes y alumnos" },
];

/** IDs alineados con backend/seed.py y require_permission(...). */
export const AVAILABLE_PERMISSIONS: Permission[] = [
  {
    id: "create_ova",
    group: "ovas",
    label: "Crear OVAs",
    desc: "Puede iniciar y generar nuevos objetos virtuales de aprendizaje.",
  },
  {
    id: "view_ova",
    group: "ovas",
    label: "Ver OVAs",
    desc: "Puede consultar OVAs a los que tenga acceso.",
  },
  {
    id: "export_ova",
    group: "ovas",
    label: "Exportar OVAs",
    desc: "Puede descargar OVAs como paquete SCORM para el aula virtual.",
  },
  {
    id: "manage_users",
    group: "admin",
    label: "Gestionar usuarios",
    desc: "Puede listar, editar y administrar cuentas de usuario.",
  },
  {
    id: "manage_roles",
    group: "admin",
    label: "Gestionar roles",
    desc: "Puede crear y modificar roles y sus permisos.",
  },
  {
    id: "view_analytics",
    group: "admin",
    label: "Ver analíticas",
    desc: "Puede consultar métricas e informes de uso.",
  },
  {
    id: "ai:models:self",
    group: "ai",
    label: "Configurar modelos propios",
    desc: "Puede elegir y ajustar sus propios modelos de IA.",
  },
  {
    id: "ai:fallback:self",
    group: "ai",
    label: "Configurar modelos de respaldo propios",
    desc: "Puede elegir qué modelos se usan si falla el principal.",
  },
  {
    id: "ai:models:platform",
    group: "ai",
    label: "Configurar modelos de la plataforma",
    desc: "Puede elegir los modelos de IA que usa toda la plataforma.",
  },
  {
    id: "users:link",
    group: "links",
    label: "Vincular usuarios",
    desc: "Puede generar códigos para vincular alumnos a su cuenta.",
  },
  {
    id: "users:link:admin",
    group: "links",
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
