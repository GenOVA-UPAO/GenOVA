import { Icon } from "@/core/components/icon";
import { Label } from "@/core/components/ui/label";

import type { Role } from "../lib/types";

const LABEL_CLASS = "text-xs font-bold uppercase tracking-wider text-muted-foreground";

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
      <div className="text-sm text-muted-foreground">
        Esta acción es permanente e irreversible. Se borrarán todas las configuraciones del rol y no
        hay usuarios asignados que se verán afectados.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-accent-brand/30 bg-accent-brand/10 p-4 text-sm text-accent-brand">
        <div className="flex gap-2.5">
          <Icon name="warning" size="text-lg" />
          <div>
            <p className="font-semibold">Reasignación requerida</p>
            <p className="mt-0.5 text-xs text-accent-brand/90">
              Este rol tiene <span className="font-bold">{userCount}</span> usuario(s) asignado(s).
              Para eliminarlo, migra sus usuarios a otro rol activo.
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reassign-role-select" className={LABEL_CLASS}>
          Reasignar usuarios a:
        </Label>
        <select
          id="reassign-role-select"
          value={reassignRoleId}
          disabled={isDeleting}
          onChange={(event) => {
            onReassignChange(event.target.value);
          }}
          className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">-- Selecciona un rol de destino --</option>
          {roles
            .filter((candidate) => candidate.id !== role.id)
            .map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name} ({candidate.user_count ?? 0} usuarios)
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}
