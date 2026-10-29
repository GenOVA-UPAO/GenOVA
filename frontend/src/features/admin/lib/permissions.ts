import { t } from "i18next";

export type PermissionGroup = "ovas" | "admin" | "ai" | "links";

export interface Permission {
  id: string;
  /** Clave i18n (los ids con «:» no sirven como clave de i18next). */
  key: string;
  group: PermissionGroup;
}

/** Grupos en el orden en que se muestran en el formulario de rol. */
export const PERMISSION_GROUPS: PermissionGroup[] = ["ovas", "admin", "ai", "links"];

/** IDs alineados con backend/seed.py y require_permission(...). */
export const AVAILABLE_PERMISSIONS: Permission[] = [
  {
    id: "create_ova",
    key: "createOva",
    group: "ovas",
  },
  {
    id: "view_ova",
    key: "viewOva",
    group: "ovas",
  },
  {
    id: "export_ova",
    key: "exportOva",
    group: "ovas",
  },
  {
    id: "manage_users",
    key: "manageUsers",
    group: "admin",
  },
  {
    id: "manage_roles",
    key: "manageRoles",
    group: "admin",
  },
  {
    id: "view_analytics",
    key: "viewAnalytics",
    group: "admin",
  },
  {
    id: "ai:models:self",
    key: "modelsSelf",
    group: "ai",
  },
  {
    id: "ai:fallback:self",
    key: "fallbackSelf",
    group: "ai",
  },
  {
    id: "ai:models:platform",
    key: "modelsPlatform",
    group: "ai",
  },
  {
    id: "users:link",
    key: "link",
    group: "links",
  },
  {
    id: "users:link:admin",
    key: "linkAdmin",
    group: "links",
  },
];

export function getPermissionLabel(permId: string): string {
  const permission = AVAILABLE_PERMISSIONS.find((perm) => perm.id === permId);
  return permission ? permissionLabel(permission) : permId;
}

export function permissionLabel(permission: Permission): string {
  return t(`admin:permissions.items.${permission.key}.label`);
}

export function permissionDescription(permission: Permission): string {
  return t(`admin:permissions.items.${permission.key}.desc`);
}

export function permissionGroupLabel(group: PermissionGroup): string {
  return t(`admin:permissions.groups.${group}`);
}

export function togglePermission(permissions: string[], permissionId: string): string[] {
  if (permissions.includes(permissionId)) {
    return permissions.filter((id) => id !== permissionId);
  }
  return [...permissions, permissionId];
}
