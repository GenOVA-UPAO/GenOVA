import { NavLink, useMatch } from "react-router";

import { useCurrentUser } from "@/core/auth/auth-store";
import { Tooltip } from "@/core/components/ui/tooltip";
import { cn } from "@/core/lib/cn";
import { firstNonBlank } from "@/core/lib/text";

import { prefetchRoute } from "../pages";
import { profileLinkClasses, userInitials } from "./lib/layout-helpers";
import { ProfileSummary } from "./profile-summary";

interface ProfileFooterProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

export function ProfileFooter({ collapsed, onNavigate }: Readonly<ProfileFooterProps>) {
  const user = useCurrentUser();
  const name = firstNonBlank(user?.full_name) ?? "Usuario GenOVA";
  // Clase como texto: el Trigger del tooltip no combina la función de NavLink.
  const isActive = useMatch("/profile") !== null;
  return (
    <div className={cn("border-t border-sidebar-border", collapsed ? "p-2" : "p-3")}>
      <Tooltip label={collapsed ? name : null}>
        <NavLink
          to="/profile"
          onClick={onNavigate}
          onMouseEnter={() => {
            prefetchRoute("/profile");
          }}
          aria-label={`Perfil: ${name}`}
          className={cn(profileLinkClasses(isActive), collapsed && "justify-center")}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {userInitials(user)}
          </div>
          {!collapsed && <ProfileSummary user={user} name={name} />}
        </NavLink>
      </Tooltip>
    </div>
  );
}
