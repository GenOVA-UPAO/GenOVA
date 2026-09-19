import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { emptyPicks } from "../../lib/phase-select.config";
import PhaseSelectModal from "./phase-select-modal";

vi.mock("../../api/phase-resources.api", () => ({
  fetchAllPhaseResources: () =>
    Promise.resolve({
      engage: Array.from({ length: 5 }, (_, index) => ({ id: String(index + 1), tipo: `Engage ${String(index + 1)}` })),
      explore: [{ id: "1", tipo: "Laboratorio" }],
    }),
}));

function setup() {
  const onConfirm = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(
    <QueryClientProvider client={client}>
      <PhaseSelectModal picks={emptyPicks()} configs={{}} onConfirm={onConfirm} onClose={vi.fn()} />
    </QueryClientProvider>,
  );
  return { ...result, onConfirm };
}
describe("PhaseSelectModal", () => {
  it("previews the first resource by default and changes on hover", async () => {
    setup();
    await screen.findByRole("button", { name: "Engage 1" });
    expect(screen.getByLabelText("Esquema comic")).toBeVisible();
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Engage 2" }));
    expect(screen.getByLabelText("Esquema storyboard")).toBeVisible();
  });
  it("requires two phases and preserves picks across tabs", async () => {
    const { onConfirm } = setup();
    fireEvent.click(await screen.findByRole("button", { name: "Engage 1" }));
    expect(screen.getByRole("button", { name: "Confirmar (1)" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "EXPLORE (0)" }));
    fireEvent.click(await screen.findByRole("button", { name: "Laboratorio" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar (2)" }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ engage: [{ id: "1", tipo: "Engage 1" }], explore: [{ id: "1", tipo: "Laboratorio" }] }),
      {},
    );
  });
  it("limits selection to four resources per phase", async () => {
    setup();
    await screen.findByRole("button", { name: "Engage 1" });
    for (const number of [1, 2, 3, 4]) fireEvent.click(screen.getByRole("button", { name: `Engage ${String(number)}` }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Engage 5" })).toBeDisabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Engage 1" }));
    expect(screen.getByRole("button", { name: "Engage 5" })).toBeEnabled();
  });
});
