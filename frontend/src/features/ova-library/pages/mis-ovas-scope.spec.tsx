import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as authStore from "@/core/auth/auth-store";

import { ovaLibraryApi } from "../api/ova-library.api";
import { MisOvasPage } from "./mis-ovas-page";

const auth = vi.hoisted(() => ({ admin: true }));

vi.mock("@/core/auth/auth-store", async (original) => ({
  ...(await original<typeof authStore>()),
  useIsAdmin: () => auth.admin,
}));
vi.mock("../api/ova-library.api", () => ({
  ovaLibraryApi: { list: vi.fn(), trash: vi.fn(), trashCount: vi.fn() },
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/mis-ovas"]}>
        <MisOvasPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Mis OVAs · alcance del administrador", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ovaLibraryApi.list).mockResolvedValue({ ovas: [], total_items: 0, total_pages: 1 });
    vi.mocked(ovaLibraryApi.trashCount).mockResolvedValue({ count: 0 });
  });

  it("el admin ve primero los suyos y puede cambiar a todos los usuarios", async () => {
    auth.admin = true;
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText(/Gestiona, edita y descarga tus recursos/)).toBeVisible();
    expect(ovaLibraryApi.list).toHaveBeenCalledWith(expect.objectContaining({ scope: "mine" }));

    await user.click(screen.getByRole("button", { name: "Todos los usuarios" }));
    expect(await screen.findByText(/OVAs de la plataforma/)).toBeVisible();
    expect(ovaLibraryApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ scope: "all" }));
  });

  it("un usuario normal no tiene el selector de alcance", async () => {
    auth.admin = false;
    renderPage();
    expect(await screen.findByText(/Gestiona, edita y descarga tus recursos/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Todos los usuarios" })).not.toBeInTheDocument();
  });
});
