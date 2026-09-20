import { type ComponentType, type LazyExoticComponent, type ReactNode, Suspense, useState } from "react";

import {
  type LlmSettingsModalApi,
  LlmSettingsModalSlotContext,
} from "./use-llm-settings-modal";

/**
 * Slot de composición app→features para el modal de ajustes LLM.
 *
 * Equivale al token Angular `LLM_SETTINGS_MODAL`:
 * - `LlmSettingsModalSlotProvider` vive en `app/layout` y recibe el modal lazy
 *   de `features/llm-settings` (core no importa la feature).
 * - El provider monta el modal una sola vez y lo mantiene fuera del bundle
 *   inicial (`React.lazy` + `Suspense`).
 * - `useLlmSettingsModal()` (en `use-llm-settings-modal.ts`) lo consume
 *   ova-workspace u otras features sin importar llm-settings.
 *
 * Contrato:
 * `{ open(): void, close(): void, isOpen: boolean, element: ReactNode }`
 * El `element` ya lo renderiza el provider; los consumidores solo deben
 * llamar `open()`. No vuelvas a pintar `element` o el modal se duplica.
 */
export interface LlmSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ModalComponent =
  | ComponentType<LlmSettingsModalProps>
  | LazyExoticComponent<ComponentType<LlmSettingsModalProps>>;

export function LlmSettingsModalSlotProvider({
  children,
  Modal,
}: Readonly<{ children: ReactNode; Modal: ModalComponent }>) {
  const [open, setOpen] = useState(false);
  // everOpened: el chunk del modal solo se descarga la primera vez que se abre,
  // no en cada página autenticada (mismo patrón que ThemeModal en el navbar);
  // después queda montado para conservar la animación de cierre.
  const [everOpened, setEverOpened] = useState(false);
  const element = everOpened ? (
    <Suspense fallback={null}>
      <Modal open={open} onOpenChange={setOpen} />
    </Suspense>
  ) : null;
  const api: LlmSettingsModalApi = {
    open: () => {
      setEverOpened(true);
      setOpen(true);
    },
    close: () => {
      setOpen(false);
    },
    isOpen: open,
    element,
  };
  return (
    <LlmSettingsModalSlotContext.Provider value={api}>
      {children}
      {element}
    </LlmSettingsModalSlotContext.Provider>
  );
}
