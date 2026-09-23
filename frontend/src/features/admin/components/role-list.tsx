import type { Role } from "../lib/types";
import { RoleCard } from "./role-card";

interface RoleListProps {
  roles: Role[];
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}

export function RoleList({ roles, onEdit, onDelete }: Readonly<RoleListProps>) {
  return (
    <ul aria-label="Roles" className="divide-y divide-border rounded-xl border border-border bg-card">
      {roles.map((role) => (
        <RoleCard key={role.id} role={role} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </ul>
  );
}
