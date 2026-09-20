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

// El juego extendido de iconos se trae DESPUÉS del evento load y con un mínimo
// de 3 s: en carga esos 211 kB compiten por ancho de banda con el CSS, las
// fuentes y los chunks de la ruta (LCP móvil); quien navega lo sigue teniendo
// en caché y las rutas no muestran el fallback "?".
const PREWARM_DELAY_MS = 3000;

function warmIconsWhenIdle(): void {
  const warmIcons = (): void => void loadFullIconRegistry();
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(warmIcons, { timeout: 3000 });
  } else {
    window.setTimeout(warmIcons, 500);
  }
}

function scheduleIconWarmup(): void {
  window.setTimeout(warmIconsWhenIdle, PREWARM_DELAY_MS);
}

if (document.readyState === "complete") {
  scheduleIconWarmup();
} else {
  window.addEventListener("load", scheduleIconWarmup, { once: true });
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
