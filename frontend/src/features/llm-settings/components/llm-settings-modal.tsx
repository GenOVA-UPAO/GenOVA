import { useState } from "react";

import { LlmSettingsContext } from "../hooks/use-llm-settings";
import { useLlmSettingsStore } from "../hooks/use-llm-settings-store";
import { LlmSettingsDialog } from "./llm-settings-dialog";

interface LlmSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LlmSettingsModal({ open, onOpenChange }: Readonly<LlmSettingsModalProps>) {
  const store = useLlmSettingsStore(open);
  // El modal queda montado entre aperturas: al reabrirlo se parte de lo guardado.
  // Cubre los cierres que no descartan (Esc con un guardado en curso que luego
  // falla, o un cierre desde fuera del diálogo).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && !store.saving) store.discard();
  }
  return (
    <LlmSettingsContext.Provider value={store}>
      <LlmSettingsDialog open={open} onOpenChange={onOpenChange} />
    </LlmSettingsContext.Provider>
  );
}
