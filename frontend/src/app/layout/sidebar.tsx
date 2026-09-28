import { cn } from "@/core/lib/cn";

import { useSidebarCollapsed } from "./lib/sidebar-state";
import { useFullBleed } from "./lib/use-full-bleed";
import { SidebarMenu } from "./sidebar-menu";

export function Sidebar() {
  const collapsed = useSidebarCollapsed(useFullBleed() ? "fullBleed" : "default");

  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        "hidden h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <SidebarMenu collapsed={collapsed} />
    </aside>
  );
}
