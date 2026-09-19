import type { Role } from "../lib/types";
import { RoleCard } from "./role-card";

interface RoleListProps {
  roles: Role[];
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}

export function RoleList({ roles, onEdit, onDelete }: Readonly<RoleListProps>) {
  return (
    <div className="grid gap-5">
      {roles.map((role) => (
        <RoleCard key={role.id} role={role} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
