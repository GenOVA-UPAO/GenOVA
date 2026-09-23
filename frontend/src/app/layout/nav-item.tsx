import { NavLink } from "react-router";

import { Icon } from "@/core/components/icon";
import { Tooltip } from "@/core/components/ui/tooltip";
import { cn } from "@/core/lib/cn";

import { prefetchRoute } from "../pages";
import { navLinkClasses } from "./lib/layout-helpers";

const NAV_ICON: Partial<Record<string, string>> = {
  house: "house",
  folder: "folder",
  plus: "plus-square",
  chart: "chart-bar",
  trash: "trash",
  gear: "gear",
  shield: "shield",
  users: "users",
};

interface NavItemProps {
  to: string;
  label: string;
  icon: string;
  collapsed: boolean;
  end?: boolean;
  badge?: number;
  onNavigate?: () => void;
}

export function NavItem({
  to,
  label,
  icon,
  collapsed,
  end,
  badge = 0,
  onNavigate,
}: Readonly<NavItemProps>) {
  const prefetch = () => {
    prefetchRoute(to);
  };
  const hasBadge = badge > 0;
  const fullLabel = hasBadge ? `${label} (${String(badge)})` : label;
  return (
    <li>
      <Tooltip label={collapsed ? fullLabel : null}>
        <NavLink
          to={to}
          end={end}
          onClick={onNavigate}
          onMouseEnter={prefetch}
          onFocus={prefetch}
          aria-label={fullLabel}
          className={({ isActive }) =>
            cn(navLinkClasses(isActive), collapsed && "justify-center px-2")
          }
        >
          <span className="relative inline-flex shrink-0">
            <Icon name={NAV_ICON[icon] ?? "circle"} className="text-[18px]" />
            {collapsed && hasBadge && (
              <span className="absolute -top-1 -right-1 size-2 rounded-full bg-muted-foreground ring-2 ring-sidebar" />
            )}
          </span>
          <span className={cn("flex-1 truncate", collapsed && "sr-only")}>{label}</span>
          {!collapsed && hasBadge && (
            <span className="min-w-5 rounded-full bg-muted px-1.5 py-0.5 text-center text-[11px] font-medium text-muted-foreground tabular-nums">
              {badge}
            </span>
          )}
        </NavLink>
      </Tooltip>
    </li>
  );
}
