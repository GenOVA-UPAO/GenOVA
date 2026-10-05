import { useTranslation } from "react-i18next";

import { getPermissionLabel } from "../lib/permissions";

interface RolePermissionsListProps {
  permissions: string[];
}

export function RolePermissionsList({ permissions }: Readonly<RolePermissionsListProps>) {
  const { t } = useTranslation("admin");

  if (permissions.length === 0) {
    return <p className="text-sm text-muted-foreground italic">{t("roles.noPermissions")}</p>;
  }

  return (
    <ul aria-label={t("roles.permissionsLabel")} className="flex flex-wrap gap-1.5">
      {permissions.map((permission) => (
        <li
          key={permission}
          className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-foreground/80"
        >
          {getPermissionLabel(permission)}
        </li>
      ))}
    </ul>
  );
}
