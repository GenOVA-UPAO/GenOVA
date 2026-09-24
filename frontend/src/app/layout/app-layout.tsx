// Iconos del shell: se asignan al registro al evaluar el módulo (antes del
// primer render del layout), evitando el flash "?" en navbar/sidebar.
import "@/core/components/icon-registry-shell";

import { lazy, Suspense, useEffect } from "react";
import { Outlet } from "react-router";

import { useIsAdmin } from "@/core/auth/auth-store";
import { LlmSettingsModalSlotProvider } from "@/core/lib/llm-settings-modal-slot";

import { prefetchRoutesWhenIdle } from "../pages";
import { useFullBleed } from "./lib/use-full-bleed";
import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";

const LlmSettingsModal = lazy(async () => {
  const mod = await import("@/features/llm-settings/components/llm-settings-modal");
  return { default: mod.LlmSettingsModal };
});

// El Toaster se trae aparte: sonner pesa ~14 kB gzip y los toasts ya emitidos
// quedan en el store de sonner, se muestran al montar el Toaster.
const LazyToaster = lazy(async () => {
  const mod = await import("sonner");
  return { default: mod.Toaster };
});

/** id del <main> — destino del skip link. */
export const MAIN_CONTENT_ID = "contenido-principal";

const MAIN_ROUTES = ["/dashboard", "/mis-ovas", "/crear", "/models", "/papelera", "/profile"];
const ADMIN_ROUTES = ["/admin", "/admin/roles", "/analytics"];

/** Tras entrar, deja descargadas las páginas del menú para abrirlas sin espera. */
function usePrefetchMainRoutes() {
  const isAdmin = useIsAdmin();
  useEffect(
    () => prefetchRoutesWhenIdle(isAdmin ? [...MAIN_ROUTES, ...ADMIN_ROUTES] : MAIN_ROUTES),
    [isAdmin],
  );
}

export function AppLayout() {
  const fullBleed = useFullBleed();
  usePrefetchMainRoutes();
  return (
    <LlmSettingsModalSlotProvider Modal={LlmSettingsModal}>
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <a
        href={`#${MAIN_CONTENT_ID}`}
        onClick={(e) => {
          e.preventDefault();
          document.getElementById(MAIN_CONTENT_ID)?.focus();
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg"
      >
        Saltar al contenido principal
      </a>
      <Navbar />
      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        <Sidebar />
        <main
          id={MAIN_CONTENT_ID}
          // Es el contenedor con scroll: necesita foco por teclado cuando la
          // página no tiene elementos focusables (axe scrollable-region-focusable).
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- contenedor con scroll: foco por teclado (axe scrollable-region-focusable)
          tabIndex={0}
          className={
            fullBleed
              ? "flex min-h-0 flex-1 flex-col overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset"
              : "min-h-0 min-w-0 flex-1 overflow-auto bg-muted/20 outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset"
          }
        >
          {fullBleed ? (
            <Outlet />
          ) : (
            <div className="mx-auto w-full max-w-7xl animate-in p-4 duration-300 slide-in-from-bottom-2 sm:p-6 lg:p-8">
              <Outlet />
            </div>
          )}
        </main>
      </div>
      <Suspense fallback={null}>
        <LazyToaster position="top-right" richColors closeButton />
      </Suspense>
    </div>
    </LlmSettingsModalSlotProvider>
  );
}
