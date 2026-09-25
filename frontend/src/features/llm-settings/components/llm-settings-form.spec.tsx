import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { getLlmSettings, getUserApiKeys } from "../api/llm-settings.api";
import { LlmSettingsContext } from "../hooks/use-llm-settings";
import { useLlmSettingsStore } from "../hooks/use-llm-settings-store";
import { LlmSettingsForm } from "./llm-settings-form";

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

const FLASH = {
  provider: "openrouter",
  model_id: "deepseek/deepseek-v4-flash",
  label: "DeepSeek V4 Flash (OpenRouter)",
};

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
  const store = useLlmSettingsStore();
  return (
    <LlmSettingsContext.Provider value={store}>
      <LlmSettingsForm />
    </LlmSettingsContext.Provider>
  );
}

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Harness />
    </QueryClientProvider>,
  );
}

describe("LlmSettingsForm", () => {
  it("no repite una opción aunque el catálogo traiga el modelo dos veces", async () => {
    vi.mocked(getUserApiKeys).mockResolvedValue({ api_keys: { openrouter: "••••1234" } });
    vi.mocked(getLlmSettings).mockResolvedValue({
      has_own_llm_key: true,
      settings: { texto: { provider: "openrouter", model_id: FLASH.model_id } },
      catalog: {
        openrouter: [
          FLASH,
          { ...FLASH, category: "texto" },
          { provider: "openrouter", model_id: "otro/modelo", label: "Otro" },
        ],
      },
      timeout_bounds: [30, 300],
    });

    renderForm();

    const user = userEvent.setup();
    await user.click(await screen.findByRole("combobox", { name: "Texto" }));
    const names = (await screen.findAllByRole("option")).map((option) => option.textContent);
    expect(names.filter((name) => name.startsWith("DeepSeek V4 Flash"))).toHaveLength(1);
    expect(new Set(names).size).toBe(names.length);
  });

  it("solo ofrece modelos de proveedores con clave propia", async () => {
    vi.mocked(getUserApiKeys).mockResolvedValue({ api_keys: { groq: "••••9999" } });
    vi.mocked(getLlmSettings).mockResolvedValue({
      has_own_llm_key: true,
      settings: { texto: { provider: "openrouter", model_id: FLASH.model_id, override: false } },
      catalog: {
        openrouter: [FLASH, { provider: "openrouter", model_id: "otro/modelo", label: "Otro" }],
        groq: [{ provider: "groq", model_id: "llama", label: "Llama" }],
      },
      timeout_bounds: [30, 300],
    });

    renderForm();

    const user = userEvent.setup();
    await user.click(await screen.findByRole("combobox", { name: "Texto" }));
    const names = (await screen.findAllByRole("option")).map((option) => option.textContent);
    expect(names.some((name) => name.startsWith("Llama"))).toBe(true);
    expect(names.some((name) => name.startsWith("Otro"))).toBe(false);
    // El modelo en uso (de la plataforma) se nombra, no con su id en crudo.
    expect(names.some((name) => name.startsWith("DeepSeek V4 Flash") && name.endsWith("en uso"))).toBe(true);
  });

  it("el tiempo máximo de cada tarea tiene una etiqueta visible", async () => {
    vi.mocked(getUserApiKeys).mockResolvedValue({ api_keys: { openrouter: "••••1234" } });
    vi.mocked(getLlmSettings).mockResolvedValue({
      has_own_llm_key: true,
      settings: { texto: { provider: "openrouter", model_id: FLASH.model_id, timeout_s: 120 } },
      catalog: { openrouter: [FLASH] },
      timeout_bounds: [30, 300],
    });

    renderForm();

    const field = await screen.findByRole("spinbutton", {
      name: "Espera máxima de Texto, de 30 a 300 segundos",
    });
    expect(field).toHaveValue(120);
    const label = document.querySelector(`label[for="${field.id}"]`);
    expect(label).toHaveTextContent("Espera máxima");
    expect(label).toBeVisible();
  });
});

