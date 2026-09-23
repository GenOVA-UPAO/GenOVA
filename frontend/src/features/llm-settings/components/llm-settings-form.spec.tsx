import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { getLlmSettings } from "../api/llm-settings.api";
import { LlmSettingsContext } from "../hooks/use-llm-settings";
import { useLlmSettingsStore } from "../hooks/use-llm-settings-store";
import { LlmSettingsForm } from "./llm-settings-form";

vi.mock("../api/llm-settings.api", () => ({
  getLlmSettings: vi.fn(),
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
});
