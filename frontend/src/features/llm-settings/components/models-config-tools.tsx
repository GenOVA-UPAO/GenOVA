import { useState } from "react";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { HistorySheet } from "./history-sheet";
import { ProfilesSheet } from "./profiles-sheet";

interface ModelsConfigToolsProps {
  /** Hay cambios sin guardar en la página. */
  dirty: boolean;
  /** Descarta el borrador: aplicar un perfil o restaurar sustituye la config. */
  onDiscardDraft: () => void;
}

/**
 * Perfiles e historial de la config de modelos (solo admin), en la cabecera de
 * la página: el admin cambia de modelo a menudo y necesita volver atrás rápido.
 */
export function ModelsConfigTools({ dirty, onDiscardDraft }: Readonly<ModelsConfigToolsProps>) {
  const [panel, setPanel] = useState<"profiles" | "history" | null>(null);
  const openChange = (which: "profiles" | "history") => (open: boolean) => {
    setPanel(open ? which : null);
  };
  return (
    <>
      <Button
        variant="outline"
        className="max-sm:h-11 max-sm:flex-1"
        onClick={() => {
          setPanel("profiles");
        }}
      >
        <Icon name="stack" size="text-base" />
        Perfiles
      </Button>
      <Button
        variant="outline"
        className="max-sm:h-11 max-sm:flex-1"
        onClick={() => {
          setPanel("history");
        }}
      >
        <Icon name="clock-counter-clockwise" size="text-base" />
        Historial
      </Button>
      <ProfilesSheet
        open={panel === "profiles"}
        onOpenChange={openChange("profiles")}
        dirty={dirty}
        onDiscardDraft={onDiscardDraft}
      />
      <HistorySheet
        open={panel === "history"}
        onOpenChange={openChange("history")}
        dirty={dirty}
        onDiscardDraft={onDiscardDraft}
      />
    </>
  );
}
