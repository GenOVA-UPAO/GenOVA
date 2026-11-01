import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter } from "react-router";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { getLlmSettings, getUserApiKeys, saveLlmSettings } from "../api/llm-settings.api";
import { LlmSettingsModal } from "./llm-settings-modal";

vi.mock("@/core/auth/auth-store", () => ({
  useIsAdmin: () => false,
  useCurrentUser: () => ({ role: "usuario", permissions: [] }),
}));

vi.mock("../api/llm-settings.api", () => ({
  getLlmSettings: vi.fn(),
  getUserApiKeys: vi.fn(),
  saveLlmSettings: vi.fn(),
  refreshLlmCatalog: vi.fn(),
  saveEnabledModels: vi.fn(),
}));

const MODEL_A = { provider: "openrouter", model_id: "a/modelo-a", label: "Modelo A" };
const MODEL_X = { provider: "openrouter", model_id: "x/modelo-x", label: "Modelo X" };

beforeAll(() => {
  // jsdom no implementa Pointer Events ni scrollIntoView; Radix Select los usa.
  for (const name of ["hasPointerCapture", "releasePointerCapture", "setPointerCapture"] as const) {
    Object.defineProperty(Element.prototype, name, { configurable: true, value: vi.fn() });
  }
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Reabrir
      </button>
      <LlmSettingsModal open={open} onOpenChange={setOpen} />
    </>
  );
}

function renderModal() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Harness />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("LlmSettingsModal", () => {
  it("cancelar descarta el borrador: al reabrir y guardar no se envía lo cancelado", async () => {
    vi.mocked(getUserApiKeys).mockResolvedValue({ api_keys: { openrouter: "••••1234" } });
    vi.mocked(getLlmSettings).mockResolvedValue({
      has_own_llm_key: true,
      settings: { texto: { provider: "openrouter", model_id: MODEL_A.model_id, override: true } },
      catalog: { openrouter: [MODEL_A, MODEL_X] },
      timeout_bounds: [30, 300],
    });
    vi.mocked(saveLlmSettings).mockImplementation((settings) =>
      Promise.resolve({ has_own_llm_key: true, settings }),
    );

    renderModal();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("combobox", { name: "Texto" }));
    await user.click(await screen.findByRole("option", { name: /Modelo X/ }));
    expect(screen.getByRole("combobox", { name: "Texto" })).toHaveTextContent("Modelo X");

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await user.click(screen.getByRole("button", { name: "Reabrir" }));

    const select = await screen.findByRole("combobox", { name: "Texto" });
    expect(select).toHaveTextContent("Modelo A");

    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(saveLlmSettings).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveLlmSettings).mock.calls[0][0]).toMatchObject({
      texto: { model_id: MODEL_A.model_id },
    });
  });

  it("si se cierra con un guardado en curso que luego falla, al reabrir no queda lo fallido", async () => {
    vi.mocked(getUserApiKeys).mockResolvedValue({ api_keys: { openrouter: "••••1234" } });
    vi.mocked(getLlmSettings).mockResolvedValue({
      has_own_llm_key: true,
      settings: { texto: { provider: "openrouter", model_id: MODEL_A.model_id, override: true } },
      catalog: { openrouter: [MODEL_A, MODEL_X] },
      timeout_bounds: [30, 300],
    });
    const pending: { reject?: (err: Error) => void } = {};
    vi.mocked(saveLlmSettings).mockReset();
    vi.mocked(saveLlmSettings).mockImplementation(
      () =>
        new Promise((_, fail) => {
          pending.reject = fail;
        }),
    );

    renderModal();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("combobox", { name: "Texto" }));
    await user.click(await screen.findByRole("option", { name: /Modelo X/ }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    await act(async () => {
      pending.reject?.(new Error("boom"));
      await Promise.resolve();
    });

    await user.click(screen.getByRole("button", { name: "Reabrir" }));
    expect(await screen.findByRole("combobox", { name: "Texto" })).toHaveTextContent("Modelo A");
  });
});
