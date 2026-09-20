import { NavLink } from "react-router";

import { useCurrentUser } from "@/core/auth/auth-store";
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
  return (
    <div className={cn("border-t border-sidebar-border", collapsed ? "p-2" : "p-3")}>
      <NavLink
        to="/profile"
        onClick={onNavigate}
        onMouseEnter={() => {
          prefetchRoute("/profile");
        }}
        title={collapsed ? name : undefined}
        aria-label={`Perfil: ${name}`}
        className={({ isActive }) =>
          cn(profileLinkClasses(isActive), collapsed && "justify-center")
        }
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {userInitials(user)}
        </div>
        {!collapsed && <ProfileSummary user={user} name={name} />}
      </NavLink>
    </div>
  );
}
