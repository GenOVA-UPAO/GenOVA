import { Icon } from "@/core/components/icon";

import { toggleSidebar, useSidebarCollapsed } from "./lib/sidebar-state";
import { useFullBleed } from "./lib/use-full-bleed";

/** Pliega o despliega el menú lateral (solo escritorio; en móvil está el cajón). */
export function SidebarToggle() {
  const scope = useFullBleed() ? "fullBleed" : "default";
  const collapsed = useSidebarCollapsed(scope);
  const label = collapsed ? "Expandir menú" : "Ocultar menú";
  return (
    <button
      type="button"
      onClick={() => {
        toggleSidebar(scope);
      }}
      aria-label={label}
      title={label}
      aria-expanded={!collapsed}
      className="-ml-1 hidden size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:inline-flex"
    >
      <Icon name={collapsed ? "sidebar" : "sidebar-simple"} size="text-xl" />
    </button>
  );
}
