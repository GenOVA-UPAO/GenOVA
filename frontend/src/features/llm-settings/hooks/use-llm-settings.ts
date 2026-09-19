import { createContext, useContext } from "react";

import type { LlmSettingsStore } from "./llm-settings-store.types";

export const LlmSettingsContext = createContext<LlmSettingsStore | null>(null);

export function useLlmSettings(): LlmSettingsStore {
  const store = useContext(LlmSettingsContext);
  if (!store) {
    throw new Error("useLlmSettings debe usarse dentro de LlmSettingsContext.Provider");
  }
  return store;
}
