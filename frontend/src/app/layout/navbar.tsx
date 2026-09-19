import { lazy, Suspense, useState } from "react";
import { Link } from "react-router";

import { useCurrentUser } from "@/core/auth/auth-store";
import { Icon } from "@/core/components/icon";

import { prefetchRoute } from "../pages";
import { NavbarBrand } from "./brand";
import { MobileDrawer } from "./mobile-drawer";
import { UserMenu } from "./user-menu";

// "Apariencia" (tema del contenido OVA) is rarely opened: load it on demand.
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
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => {
            setDrawerOpen(true);
          }}
          className="-ml-1 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent md:hidden"
          aria-label="Abrir menú"
        >
          <Icon name="list" size="text-xl" />
        </button>
        <NavbarBrand />
        <div className="flex-1" />
        <Link
          to="/crear"
          onMouseEnter={() => {
            prefetchRoute("/crear");
          }}
          className="hidden items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 sm:flex"
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
