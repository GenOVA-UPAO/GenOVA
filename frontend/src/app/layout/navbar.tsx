import { lazy, Suspense, useState } from "react";
import { Link } from "react-router";

import { useCurrentUser } from "@/core/auth/auth-store";
import { Icon } from "@/core/components/icon";

import { prefetchRoute } from "../pages";
import { NavbarBrand } from "./brand";
import { MobileDrawer } from "./mobile-drawer";
import { SidebarToggle } from "./sidebar-toggle";
import { UserMenu } from "./user-menu";

// «Estilo de mis OVAs» (tema del contenido OVA) is rarely opened: load it on demand.
const ThemeModal = lazy(() =>
  import("@/features/ova-library/components/modals/theme-modal").then((m) => ({
    default: m.ThemeModal,
  })),
);

export function Navbar() {
  const user = useCurrentUser();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);

  return (
    <header className="z-50 border-b border-border bg-card">
      <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <button
          type="button"
          onClick={() => {
            setDrawerOpen(true);
          }}
          className="-ml-1 inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 md:hidden"
          aria-label="Abrir menú"
        >
          <Icon name="list" size="text-xl" />
        </button>
        <SidebarToggle />
        <NavbarBrand />
        <div className="flex-1" />
        <Link
          to="/crear"
          onMouseEnter={() => {
            prefetchRoute("/crear");
          }}
          className="hidden h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:inline-flex"
        >
          <Icon name="plus" size="text-base" />
          Crear OVA
        </Link>
        <UserMenu
          onOpenAppearance={() => {
            setThemeModalOpen(true);
          }}
        />
      </div>

      {themeModalOpen && (
        <Suspense fallback={null}>
          <ThemeModal
            initialTheme={user?.theme_settings}
            onClose={() => {
              setThemeModalOpen(false);
            }}
          />
        </Suspense>
      )}
      <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </header>
  );
}
