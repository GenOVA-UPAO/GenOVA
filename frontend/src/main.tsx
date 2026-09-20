import "./styles.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";

import { loadFullIconRegistry } from "@/core/components/icon-registry";
import { initSentry } from "@/core/lib/observability/sentry";
import { queryClient } from "@/core/lib/query-client";

import { router } from "./app/router";

// Sentry loads in parallel with the first render, never on the critical path.
void initSentry();

// El juego extendido de iconos se trae en idle tras el primer render: quien
// navega ya lo tiene en caché y las rutas no muestran el fallback "?".
const warmIcons = (): void => void loadFullIconRegistry();
if (typeof window.requestIdleCallback === "function") {
  window.requestIdleCallback(warmIcons, { timeout: 2000 });
} else {
  window.setTimeout(warmIcons, 1200);
}

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
