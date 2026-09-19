import { useEffect } from "react";
import { Outlet, useMatches, useNavigate } from "react-router";
import { Toaster } from "sonner";

import { authStore } from "@/core/auth/auth-store";
import { useThemeEffect } from "@/core/theme/theme";

import { NavigationProgress } from "./navigation-progress";
import type { RouteHandle } from "./router";

/** Page title = deepest route `handle.title` + brand suffix. */
function useRouteTitle(): void {
  const matches = useMatches();
  const title = [...matches]
    .reverse()
    .map((m) => (m.handle as RouteHandle | undefined)?.title)
    .find(Boolean);
  useEffect(() => {
    document.title = title ? `${title} · GenOVA` : "GenOVA";
  }, [title]);
}

export function RootLayout() {
  const navigate = useNavigate();
  useRouteTitle();
  useThemeEffect();

  useEffect(() => {
    authStore.onExpired = () => {
      void navigate("/login?expired=1", { replace: true });
    };
    return () => {
      authStore.onExpired = null;
    };
  }, [navigate]);

  return (
    <>
      <NavigationProgress />
      <Outlet />
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}
