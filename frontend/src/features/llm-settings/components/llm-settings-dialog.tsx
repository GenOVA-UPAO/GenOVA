import { Link } from "react-router";

import { useCurrentUser } from "@/core/auth/auth-store";
import { Button } from "@/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";

import { canAccessModels } from "../hooks/can-access-models";
import { useLlmSettings } from "../hooks/use-llm-settings";
import { LlmSettingsForm } from "./llm-settings-form";

interface LlmSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LlmSettingsDialog({ open, onOpenChange }: Readonly<LlmSettingsDialogProps>) {
  const store = useLlmSettings();
  const showModelsLink = canAccessModels(useCurrentUser());

  async function handleSave(): Promise<void> {
    const ok = await store.save();
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-5 sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle>Configuración de IA</DialogTitle>
          <DialogDescription>
            Modelo y tiempo máximo de espera de cada tarea al generar tus OVAs.
            {showModelsLink ? (
              <>
                {" "}
                Tienes más opciones en{" "}
                <Link
                  to="/models"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => {
                    onOpenChange(false);
                  }}
                >
                  Modelos de IA
                </Link>
                .
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-1 max-h-[60vh] overflow-y-auto px-1">
          <LlmSettingsForm readOnly={!store.hasOwnLlmKey} />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => { onOpenChange(false); }} disabled={store.saving}>
            {store.hasOwnLlmKey ? "Cancelar" : "Cerrar"}
          </Button>
          {store.hasOwnLlmKey ? (
            <Button
              onClick={() => void handleSave()}
              loading={store.saving}
              disabled={store.loading || store.error !== ""}
            >
              Guardar
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
