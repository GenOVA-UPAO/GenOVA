import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";

import type { AdminUser } from "../../lib/types";
import { isLockedOut } from "./status-helpers";

interface UserActionMenuProps {
  user: AdminUser;
  onEdit: () => void;
  onToggleStatus: (isActive: boolean) => void;
  onUnlock: () => void;
  onSendResetEmail: () => void;
}

export function UserActionMenu({
  user,
  onEdit,
  onToggleStatus,
  onUnlock,
  onSendResetEmail,
}: Readonly<UserActionMenuProps>) {
  const isActive = user.is_active === true;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl text-xs">
          Acción ▾
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={onEdit}>
          <Icon name="pencil-simple" size="text-sm" /> Editar Perfil
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            onToggleStatus(!isActive);
          }}
          className={isActive ? "text-accent-brand" : "text-primary"}
        >
          <Icon name={isActive ? "prohibit" : "check-circle"} size="text-sm" />
          {isActive ? "Desactivar Cuenta" : "Activar Cuenta"}
        </DropdownMenuItem>
        {isLockedOut(user) && (
          <DropdownMenuItem onSelect={onUnlock} className="text-primary">
            <Icon name="lock-open" size="text-sm" /> Desbloquear Cuenta
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSendResetEmail}>
          <Icon name="envelope" size="text-sm" /> Restablecer por Correo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
