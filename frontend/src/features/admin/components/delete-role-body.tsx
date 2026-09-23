import { Label } from "@/core/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";

import { formatRoleName, roleUserCountLabel } from "../lib/role-utils";
import type { Role } from "../lib/types";

interface DeleteRoleBodyProps {
  role: Role;
  roles: Role[];
  reassignRoleId: string;
  isDeleting: boolean;
  onReassignChange: (value: string) => void;
}

export function DeleteRoleBody({
  role,
  roles,
  reassignRoleId,
  isDeleting,
  onReassignChange,
}: Readonly<DeleteRoleBodyProps>) {
  const userCount = role.user_count ?? 0;

  if (userCount === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ningún usuario tiene este rol, así que nadie perderá acceso. Esta acción no se puede
        deshacer.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Este rol tiene {userCount === 1 ? "1 usuario asignado" : `${String(userCount)} usuarios asignados`}.
        Elige a qué rol pasarán antes de eliminarlo. Esta acción no se puede deshacer.
      </p>
      <div className="space-y-2">
        <Label htmlFor="reassign-role-select">Pasar sus usuarios a</Label>
        <Select
          value={reassignRoleId === "" ? undefined : reassignRoleId}
          disabled={isDeleting}
          onValueChange={onReassignChange}
        >
          <SelectTrigger id="reassign-role-select" className="w-full">
            <SelectValue placeholder="Elige un rol" />
          </SelectTrigger>
          <SelectContent position="popper">
            {roles
              .filter((candidate) => candidate.id !== role.id)
              .map((candidate) => (
                <SelectItem key={candidate.id} value={candidate.id}>
                  {formatRoleName(candidate.name)} ({roleUserCountLabel(candidate.user_count ?? 0).toLowerCase()})
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
