import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import { Tooltip } from "@/core/components/ui/tooltip";

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
  const { t } = useTranslation("admin");
  const isActive = user.is_active === true;
  const targetName = displayName(user) ?? user.email;

  return (
    <DropdownMenu>
      <Tooltip label={t("users.actions.moreActions")} side="left">
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("users.actions.moreActionsFor", { name: targetName })}
            className="max-md:size-11"
          >
            <Icon name="dots-three-vertical" size="text-lg" weight="bold" />
          </Button>
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={onEdit}>
          <Icon name="pencil-simple" size="text-sm" /> {t("users.actions.editProfile")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onSendResetEmail}>
          <Icon name="envelope" size="text-sm" /> {t("users.actions.resetPasswordEmail")}
        </DropdownMenuItem>
        {isLockedOut(user) && (
          <DropdownMenuItem onSelect={onUnlock}>
            <Icon name="lock-open" size="text-sm" /> {t("users.actions.unlockAccount")}
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
            <Icon name="prohibit" size="text-sm" /> {t("users.actions.deactivateAccount")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onSelect={() => {
              onToggleStatus(true);
            }}
          >
            <Icon name="check-circle" size="text-sm" /> {t("users.actions.activateAccount")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
