import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
        aria-label={t("shell:navegacion_principal")}
        // Plegado, la primera sección no necesita separador encima.
        className={cn(
          "flex-1 overflow-y-auto pb-3 [&>div:first-child>[aria-hidden]]:invisible",
          collapsed ? "px-1.5" : "px-2",
        )}
      >
        <NavSection title={t("shell:principal")} collapsed={collapsed}>
          {navigationLinks.map((l) => (
            <NavItem key={l.to} to={l.to} label={t(l.labelKey)} icon={l.icon} {...common} />
          ))}
          {canAnalytics && <NavItem to="/analytics" label={t("shell:analitica")} icon="chart" {...common} />}
          <NavItem to="/papelera" label={t("shell:papelera")} icon="trash" badge={trashCount} {...common} />
        </NavSection>
        {canModels && (
          <NavSection title={t("shell:configuracion")} collapsed={collapsed}>
            {configNavLinks.map((l) => (
              <NavItem key={l.to} to={l.to} label={t(l.labelKey)} icon={l.icon} {...common} />
            ))}
          </NavSection>
        )}
        {isAdmin && (
          <NavSection title={t("shell:administracion")} collapsed={collapsed}>
            {adminNavLinks.map((l) => (
              <NavItem
                key={l.to}
                to={l.to}
                label={t(l.labelKey)}
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
