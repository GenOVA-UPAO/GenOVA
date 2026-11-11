import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getAdminNodesConfig, saveAdminNodesConfig } from "@/core/services/platform-settings.api";

import { PlatformCapabilitiesCard } from "./platform-capabilities-card";
import { PlatformNodesCard } from "./platform-nodes-card";

vi.mock("@/core/services/platform-settings.api", () => ({
  getAdminNodesConfig: vi.fn(),
  saveAdminNodesConfig: vi.fn(),
}));

function nodesResponse(refine: string) {
  return {
    nodes: [{ id: "nodo-critico", name: "Crítico", configurable: true, flag: "ova_critic" }],
    capabilities: [
      { id: "cap-refinar", name: "Refinador estructural", configurable: true, flag: "ova_refine" },
    ],
    config: { ova_refine: refine, ova_critic: "0", ova_reflection_rounds: "1" },
  };
}

function renderCards() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PlatformNodesCard />
      <PlatformCapabilitiesCard />
    </QueryClientProvider>,
  );
}

describe("PlatformNodesCard", () => {
  it("guardar los nodos no revierte lo guardado en Capacidades", async () => {
    let refine = "1";
    vi.mocked(getAdminNodesConfig).mockImplementation(() => Promise.resolve(nodesResponse(refine)));
    vi.mocked(saveAdminNodesConfig).mockImplementation((payload) => {
      const flags = payload as Record<string, string>;
      if (flags.ova_refine) refine = flags.ova_refine;
      return Promise.resolve({});
    });

    renderCards();
    const user = userEvent.setup();
    const nodesCard = screen.getByTestId("platform-nodes");
    const capsCard = screen.getByTestId("platform-capabilities");

    await user.click(await within(nodesCard).findByRole("switch", { name: "Crítico" }));
    await user.click(await within(capsCard).findByRole("switch", { name: "Refinador estructural" }));
    await user.click(within(capsCard).getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => {
      expect(saveAdminNodesConfig).toHaveBeenCalledTimes(1);
    });
    expect(vi.mocked(saveAdminNodesConfig).mock.calls[0][0]).toEqual({ ova_refine: "0" });

    await user.click(within(nodesCard).getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => {
      expect(saveAdminNodesConfig).toHaveBeenCalledTimes(2);
    });
    expect(vi.mocked(saveAdminNodesConfig).mock.calls[1][0]).toEqual({
      ova_critic: "1",
      ova_reflection_rounds: "1",
    });
  });
});
