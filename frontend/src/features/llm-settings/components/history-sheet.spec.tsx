import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { HistoryEntry } from "../api/model-tools.api";
import { HistorySheet } from "./history-sheet";

const api = vi.hoisted(() => ({
  getConfigHistory: vi.fn(),
  restoreConfigVersion: vi.fn(),
}));

vi.mock("../api/model-tools.api", () => api);
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const entry = (id: string, source: string, text: string): HistoryEntry => ({
  id,
  at: new Date().toISOString(),
  actor: { id: "u", name: "Ana Quispe" },
  source,
  detail: null,
  changes: [{ task: "texto", field: "primary", before: "A", after: "B", text }],
});

function renderSheet() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <HistorySheet open onOpenChange={vi.fn()} dirty={false} onDiscardDraft={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe("HistorySheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getConfigHistory.mockResolvedValue({
      entries: [entry("h2", "manual", "Texto: A → B"), entry("h1", "manual", "Texto: B → A")],
      limit: 30,
    });
    api.restoreConfigVersion.mockResolvedValue({ config: {}, tasks: [], history_entry: null });
  });

  it("lista quién cambió qué y deshace el último cambio", async () => {
    renderSheet();
    expect(await screen.findAllByText(/Ana Quispe/)).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Deshacer el último cambio" }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Deshacer cambio" }));
    expect(api.restoreConfigVersion).toHaveBeenCalledWith("h2", "before");
  });

  it("restaura una versión anterior tal como quedó", async () => {
    renderSheet();
    await userEvent.click(await screen.findByRole("button", { name: /^Restaurar la versión/ }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Restaurar versión" }));
    expect(api.restoreConfigVersion).toHaveBeenCalledWith("h1", "after");
  });

  it("explica qué verá aquí cuando aún no hay cambios", async () => {
    api.getConfigHistory.mockResolvedValue({ entries: [], limit: 30 });
    renderSheet();
    expect(await screen.findByText("Todavía no hay cambios")).toBeInTheDocument();
  });
});
