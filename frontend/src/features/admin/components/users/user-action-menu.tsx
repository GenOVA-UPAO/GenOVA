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
import { displayName } from "../../lib/user-display";
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
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Más acciones para ${displayName(user) ?? user.email}`}
          className="max-md:size-10"
        >
          <Icon name="dots-three-vertical" size="text-lg" weight="bold" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={onEdit}>
          <Icon name="pencil-simple" size="text-sm" /> Editar perfil
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onSendResetEmail}>
          <Icon name="envelope" size="text-sm" /> Restablecer por correo
        </DropdownMenuItem>
        {isLockedOut(user) && (
          <DropdownMenuItem onSelect={onUnlock}>
            <Icon name="lock-open" size="text-sm" /> Desbloquear cuenta
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {isActive ? (
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              onToggleStatus(false);
            }}
          >
            <Icon name="prohibit" size="text-sm" /> Desactivar cuenta
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onSelect={() => {
              onToggleStatus(true);
            }}
          >
            <Icon name="check-circle" size="text-sm" /> Activar cuenta
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
