import { Link } from "react-router";

import { useCurrentUser, useIsAdmin } from "@/core/auth/auth-store";
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
  const isAdmin = useIsAdmin();
  const copy = dialogCopy(store.hasOwnLlmKey, isAdmin);

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
            {copy.text}
            {showModelsLink ? (
              <>
                {" "}
                {copy.linkLead}{" "}
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
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
            disabled={store.saving}
          >
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

/**
 * Qué dice el diálogo según quién lo abre. Antes, sin clave propia, repetía el
 * enlace a Modelos de IA en un segundo aviso, y al propio administrador le
 * decía que los modelos «los elige el administrador».
 */
function dialogCopy(hasOwnKey: boolean, isAdmin: boolean): { text: string; linkLead: string } {
  if (hasOwnKey) {
    return {
      text: "Modelo y tiempo máximo de espera de cada tarea al generar tus OVAs.",
      linkLead: "Tienes más opciones en",
    };
  }
  if (isAdmin) {
    return {
      text: "Modelos que usa la plataforma para generar los OVAs.",
      linkLead: "Se cambian en",
    };
  }
  return {
    text: "Modelos con los que la IA genera tus OVAs. Los elige el administrador.",
    linkLead: "Con tu propia clave API puedes elegir otros en",
  };
}
