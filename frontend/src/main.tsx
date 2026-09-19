import "./styles.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";

import { initSentry } from "@/core/lib/observability/sentry";
import { queryClient } from "@/core/lib/query-client";

import { router } from "./app/router";

// Sentry loads in parallel with the first render, never on the critical path.
void initSentry();

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
