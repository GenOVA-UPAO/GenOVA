import { useState } from "react";

import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

import { SidebarMenu } from "./sidebar-menu";

const STORAGE_KEY = "genova_sidebar_collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const label = collapsed ? "Expandir menú" : "Ocultar menú";

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        "hidden h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center border-b border-sidebar-border px-2 py-2",
          collapsed ? "justify-center" : "justify-end",
        )}
      >
        <button
          type="button"
          onClick={toggle}
          aria-label={label}
          title={label}
          aria-expanded={!collapsed}
          className="inline-flex size-8 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Icon name={collapsed ? "sidebar" : "sidebar-simple"} size="text-lg" />
        </button>
      </div>
      <SidebarMenu collapsed={collapsed} />
    </aside>
  );
}
