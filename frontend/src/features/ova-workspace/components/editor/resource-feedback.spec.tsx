import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "../../api/resource-feedback.api";
import { ResourceFeedback } from "./resource-feedback";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../api/resource-feedback.api", () => ({
  fetchResourceFeedback: vi.fn(() => Promise.resolve([])),
  putResourceFeedback: vi.fn(),
  deleteResourceFeedback: vi.fn(),
}));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ResourceFeedback ovaId="o1" phaseId="p1" resourceName="Comic" />
    </QueryClientProvider>,
  );
}

describe("ResourceFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchResourceFeedback).mockResolvedValue([]);
  });

  it("guarda 👍 al instante y queda pulsado", async () => {
    vi.mocked(api.putResourceFeedback).mockResolvedValue({
      phase_id: "p1",
      rating: "up",
      reason: null,
      comment: null,
    });
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Este recurso me sirvió" }));
    expect(api.putResourceFeedback).toHaveBeenCalledWith("o1", "p1", { rating: "up" });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Este recurso me sirvió" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
  });

  it("👎 abre el popover, exige motivo y envía motivo y comentario", async () => {
    vi.mocked(api.putResourceFeedback).mockResolvedValue({
      phase_id: "p1",
      rating: "down",
      reason: "fuera_de_tema",
      comment: "habla de tablespaces",
    });
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Este recurso no me sirvió" }));
    const send = await screen.findByRole("button", { name: "Enviar valoración" });
    expect(send).toBeDisabled();
    await userEvent.click(screen.getByRole("radio", { name: "No trata del tema" }));
    await userEvent.type(screen.getByLabelText(/Comentario/), "habla de tablespaces");
    await userEvent.click(send);
    expect(api.putResourceFeedback).toHaveBeenCalledWith("o1", "p1", {
      rating: "down",
      reason: "fuera_de_tema",
      comment: "habla de tablespaces",
    });
  });
});
