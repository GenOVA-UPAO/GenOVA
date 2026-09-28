import { LlmSettingsContext } from "../hooks/use-llm-settings";
import { useLlmSettingsStore } from "../hooks/use-llm-settings-store";
import { LlmSettingsDialog } from "./llm-settings-dialog";

interface LlmSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LlmSettingsModal({ open, onOpenChange }: Readonly<LlmSettingsModalProps>) {
  const store = useLlmSettingsStore(open);
  return (
    <LlmSettingsContext.Provider value={store}>
      <LlmSettingsDialog open={open} onOpenChange={onOpenChange} />
    </LlmSettingsContext.Provider>
  );
}
