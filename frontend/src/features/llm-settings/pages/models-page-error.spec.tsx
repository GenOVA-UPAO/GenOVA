import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ModelsPage } from "./models-page";

vi.mock("@/core/auth/auth-store", () => ({
  useCurrentUser: () => ({ role: "administrador", permissions: [] }),
  useIsAdmin: () => true,
}));

vi.mock("../hooks/use-admin-llm-draft", () => ({
  useAdminLlmDraft: () => ({
    loading: false,
    tasks: ["texto"],
    models: [],
    draft: { texto: { default: { provider: "", model_id: "" }, fallbacks: [] } },
    adminDirty: false,
    saving: false,
    setDraft: vi.fn(),
    discard: vi.fn(),
    save: vi.fn(),
  }),
}));

const fetchMock = vi.fn<typeof fetch>();

const OK_RESPONSE = {
  has_own_llm_key: true,
  settings: { texto: { provider: "openrouter", model_id: "deepseek/deepseek-v4-flash" } },
  catalog: {
    openrouter: [
      {
        provider: "openrouter",
        model_id: "deepseek/deepseek-v4-flash",
        label: "DeepSeek V4 Flash",
      },
    ],
  },
  timeout_bounds: [30, 300],
  catalog_status: { openrouter: { ok: true } },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ModelsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ModelsPage con la carga fallando", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("muestra el error en español, oculta el guardado y reintenta con refetch", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("No se pudo cargar la configuración.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^Modelos$/i })).not.toBeInTheDocument();

    fetchMock.mockResolvedValue(jsonResponse(OK_RESPONSE));
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("button", { name: "Abrir catálogo" })).toBeInTheDocument();
    expect(screen.queryByText("No se pudo cargar la configuración.")).not.toBeInTheDocument();
  });
});
