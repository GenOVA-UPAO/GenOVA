import { createContext, type ReactNode,useContext } from "react";

/**
 * Consumidor del slot `LlmSettingsModalSlotProvider`.
 * Equivale al token Angular `LLM_SETTINGS_MODAL`.
 *
 * Contrato: `{ open(), close(), isOpen, element }`.
 * El provider ya pinta `element`; llama solo a `open()`.
 */
export interface LlmSettingsModalApi {
  open: () => void;
  close: () => void;
  isOpen: boolean;
  element: ReactNode;
}

export const LlmSettingsModalSlotContext = createContext<LlmSettingsModalApi | null>(null);

export function useLlmSettingsModal(): LlmSettingsModalApi {
  const ctx = useContext(LlmSettingsModalSlotContext);
  if (!ctx) {
    throw new Error("useLlmSettingsModal debe usarse dentro de LlmSettingsModalSlotProvider");
  }
  return ctx;
}
