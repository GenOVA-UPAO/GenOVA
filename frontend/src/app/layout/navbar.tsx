import { lazy, Suspense, useState } from "react";
import { Link } from "react-router";

import { useCurrentUser } from "@/core/auth/auth-store";
import { Icon } from "@/core/components/icon";

import { prefetchRoute } from "../pages";
import { NavbarBrand } from "./brand";
import { useFullBleed } from "./lib/use-full-bleed";
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
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  // En /crear y en el editor la acción principal es de la página («Generar
  // OVA», «Descargar SCORM»): un segundo botón azul solo compite con ella, y
  // el menú lateral ya ofrece «Crear OVA».
  const pageOwnsPrimary = useFullBleed();

  return (
    <header className="z-50 border-b border-border bg-card">
      <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <MobileDrawer />
        <SidebarToggle />
        <NavbarBrand />
        <div className="flex-1" />
        {!pageOwnsPrimary && (
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
        )}
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
    </header>
  );
}
