import { useCurrentUser } from "@/core/auth/auth-store";
import { cn } from "@/core/lib/cn";
import { useTrashCount } from "@/features/ova-library/hooks/use-ova-library";

import { hasPermission } from "./lib/layout-helpers";
import { NavItem } from "./nav-item";
import { NavSection } from "./nav-section";
import { adminNavLinks, configNavLinks, navigationLinks } from "./navigation/nav-links";
import { ProfileFooter } from "./profile-footer";

interface SidebarMenuProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarMenu({ collapsed = false, onNavigate }: Readonly<SidebarMenuProps>) {
  const user = useCurrentUser();
  const { data: trashCount = 0 } = useTrashCount();
  const isAdmin = user?.role === "administrador";
  const canModels =
    hasPermission(user, "ai:models:self") || hasPermission(user, "ai:models:platform");
  const canAnalytics = hasPermission(user, "view_analytics");
  const common = { collapsed, onNavigate };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav
        aria-label="Navegación principal"
        className={cn("flex-1 overflow-y-auto pb-3", collapsed ? "px-1.5" : "px-2")}
      >
        <NavSection title="Principal" collapsed={collapsed}>
          {navigationLinks.map((l) => (
            <NavItem key={l.to} to={l.to} label={l.label} icon={l.icon} {...common} />
          ))}
          {canAnalytics && <NavItem to="/analytics" label="Analítica" icon="chart" {...common} />}
          <NavItem to="/papelera" label="Papelera" icon="trash" badge={trashCount} {...common} />
        </NavSection>
        {canModels && (
          <NavSection title="Configuración" collapsed={collapsed}>
            {configNavLinks.map((l) => (
              <NavItem key={l.to} to={l.to} label={l.label} icon={l.icon} {...common} />
            ))}
          </NavSection>
        )}
        {isAdmin && (
          <NavSection title="Administración" collapsed={collapsed}>
            {adminNavLinks.map((l) => (
              <NavItem
                key={l.to}
                to={l.to}
                label={l.label}
                icon={l.icon}
                end={l.exact}
                {...common}
              />
            ))}
          </NavSection>
        )}
      </nav>
      <ProfileFooter {...common} />
    </div>
  );
}
