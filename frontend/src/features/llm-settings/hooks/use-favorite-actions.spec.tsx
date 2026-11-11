import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { EnabledModel } from "../lib/user-llm-settings.types";
import type { LlmSettingsStore } from "./llm-settings-store.types";
import { useFavoriteActions } from "./use-favorite-actions";
import { LlmSettingsContext } from "./use-llm-settings";

vi.mock("@/core/auth/auth-store", () => ({
  useIsAdmin: () => false,
}));

function stubStore(enabledModels: EnabledModel[]) {
  const addFavorites = vi.fn(() => Promise.resolve());
  const toggleFavorite = vi.fn(() => Promise.resolve());
  const store = {
    settings: { texto: { provider: "openrouter", model_id: "B", override: true } },
    enabledModels,
    isModelEnabled: (provider: string, modelId: string) =>
      enabledModels.some((m) => m.provider === provider && m.model_id === modelId),
    addFavorites,
    toggleFavorite,
  } as unknown as LlmSettingsStore;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <LlmSettingsContext.Provider value={store}>{children}</LlmSettingsContext.Provider>
  );
  return { addFavorites, toggleFavorite, wrapper };
}

describe("useFavoriteActions", () => {
  it("al marcar el primer favorito de un proveedor añade también los en uso de ese proveedor", async () => {
    const { addFavorites, toggleFavorite, wrapper } = stubStore([]);
    const { result } = renderHook(() => useFavoriteActions(), { wrapper });

    await act(async () => {
      await result.current.toggle("openrouter", "C");
    });

    expect(toggleFavorite).not.toHaveBeenCalled();
    expect(addFavorites).toHaveBeenCalledWith([
      { provider: "openrouter", model_id: "C" },
      { provider: "openrouter", model_id: "B" },
    ]);
  });

  it("quitar un favorito que no está en uso sigue usando toggleFavorite", async () => {
    const { addFavorites, toggleFavorite, wrapper } = stubStore([
      { provider: "openrouter", model_id: "C" },
    ]);
    const { result } = renderHook(() => useFavoriteActions(), { wrapper });

    await act(async () => {
      await result.current.toggle("openrouter", "C");
    });

    expect(addFavorites).not.toHaveBeenCalled();
    expect(toggleFavorite).toHaveBeenCalledWith("openrouter", "C");
  });
});
