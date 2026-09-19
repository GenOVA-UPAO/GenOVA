import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/lib/cn";

import type { Role } from "../lib/types";
import { getRoleColor, isSystemRole } from "../pages/admin-roles-page.helpers";
import { RolePermissionsList } from "./role-permissions-list";

interface RoleCardProps {
  role: Role;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}

export function RoleCard({ role, onEdit, onDelete }: Readonly<RoleCardProps>) {
  const userCount = role.user_count ?? 0;
  const permissions = role.permissions ?? [];

  return (
    <div className="glass-card rounded-3xl border-2 border-border/40 bg-card p-6 shadow-sm transition hover:border-primary/20">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-2xl border",
              getRoleColor(role.name ?? ""),
            )}
          >
            <span className="font-display text-lg font-bold uppercase">{role.name?.charAt(0)}</span>
          </div>
          <div>
            <p className="flex items-center gap-2 font-display text-lg font-bold capitalize">
              {role.name}
              {isSystemRole(role.name) && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                  Sistema
                </span>
              )}
            </p>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
              {userCount} {userCount === 1 ? "usuario activo" : "usuarios activos"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-primary/20 text-primary hover:bg-primary/5"
            onClick={() => {
              onEdit(role);
            }}
          >
            Editar permisos
          </Button>
          {!isSystemRole(role.name) && (
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                onDelete(role);
              }}
            >
              Eliminar
            </Button>
          )}
        </div>
      </div>
      {role.description !== undefined && role.description !== "" && (
        <p className="mb-4 text-sm font-medium text-muted-foreground">{role.description}</p>
      )}
      <RolePermissionsList permissions={permissions} />
    </div>
  );
}
