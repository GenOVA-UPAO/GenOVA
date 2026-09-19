import { Link } from "react-router";

import { Button } from "@/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";

import { useLlmSettings } from "../hooks/use-llm-settings";
import { LlmSettingsForm } from "./llm-settings-form";

interface LlmSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LlmSettingsDialog({ open, onOpenChange }: Readonly<LlmSettingsDialogProps>) {
  const store = useLlmSettings();

  async function handleSave(): Promise<void> {
    const ok = await store.save();
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 sm:max-w-lg">
        <DialogHeader className="px-2 pt-2 pb-2">
          <DialogTitle>Configuración de IA</DialogTitle>
          <DialogDescription>
            Modelos y tiempos de espera para generar OVAs. También editable en{" "}
            <Link
              to="/profile"
              className="text-primary hover:underline"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Mi Perfil
            </Link>
            .
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto px-2">
          <LlmSettingsForm readOnly={!store.hasOwnLlmKey} />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => { onOpenChange(false); }} disabled={store.saving}>
            {store.hasOwnLlmKey ? "Cancelar" : "Cerrar"}
          </Button>
          {store.hasOwnLlmKey ? (
            <Button onClick={() => void handleSave()} disabled={store.saving || store.loading}>
              {store.saving ? "Guardando…" : "Guardar"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
