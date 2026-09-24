import { Button } from "@/core/components/ui/button";

import type { Role } from "../lib/types";

interface RoleCardActionsProps {
  role: Role;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}

export function RoleCardActions({ role, onEdit, onDelete }: Readonly<RoleCardActionsProps>) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        variant="outline"
        className="max-md:h-11 max-md:flex-1"
        onClick={() => {
          onEdit(role);
        }}
      >
        Editar permisos
      </Button>
      <Button
        variant="ghost"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive max-md:h-11"
        onClick={() => {
          onDelete(role);
        }}
      >
        Eliminar
      </Button>
    </div>
  );
}
