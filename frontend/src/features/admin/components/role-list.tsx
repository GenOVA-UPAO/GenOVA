import { useTranslation } from "react-i18next";

import type { Role } from "../lib/types";
import { RoleCard } from "./role-card";

interface RoleListProps {
  roles: Role[];
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}

export function RoleList({ roles, onEdit, onDelete }: Readonly<RoleListProps>) {
  const { t } = useTranslation("admin");

  return (
    <ul aria-label={t("roles.listLabel")} className="divide-y divide-border rounded-xl border border-border bg-card">
      {roles.map((role) => (
        <RoleCard key={role.id} role={role} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </ul>
  );
}
