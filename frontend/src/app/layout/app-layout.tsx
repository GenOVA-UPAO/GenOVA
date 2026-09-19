import { lazy } from "react";
import { Outlet, useMatches } from "react-router";

import { LlmSettingsModalSlotProvider } from "@/core/lib/llm-settings-modal-slot";

import type { RouteHandle } from "../router";
import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";

const LlmSettingsModal = lazy(async () => {
  const mod = await import("@/features/llm-settings/components/llm-settings-modal");
  return { default: mod.LlmSettingsModal };
});

/** id del <main> — destino del skip link. */
export const MAIN_CONTENT_ID = "contenido-principal";

function useFullBleed(): boolean {
  return useMatches().some((m) => (m.handle as RouteHandle | undefined)?.fullBleed);
}

export function AppLayout() {
  const fullBleed = useFullBleed();
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
          tabIndex={-1}
          className={
            fullBleed
              ? "flex min-h-0 flex-1 flex-col overflow-hidden outline-none"
              : "min-h-0 min-w-0 flex-1 overflow-auto bg-muted/20 outline-none"
          }
        >
          {fullBleed ? (
            <Outlet />
          ) : (
            <div className="mx-auto w-full max-w-7xl animate-in p-4 duration-300 fade-in slide-in-from-bottom-2 sm:p-6 lg:p-8">
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
    </LlmSettingsModalSlotProvider>
  );
}
