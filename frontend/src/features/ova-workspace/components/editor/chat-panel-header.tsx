import { useState } from "react";

import { ConfirmModal } from "@/core/components/confirm-modal";
import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/lib/cn";

interface Props {
  busy: boolean;
  onRegenAll: () => void;
}

/** Cabecera del panel: mismo alto que la barra del visor para que ambas columnas alineen. */
export function ChatPanelHeader({ busy, onRegenAll }: Readonly<Props>) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex h-12 shrink-0 items-center justify-end gap-2 border-b border-border px-4 md:justify-between">
      {/* En móvil el conmutador de vista ya dice «Instrucciones». */}
      <h2 className="sr-only text-sm font-semibold text-foreground md:not-sr-only">Instrucciones</h2>
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => {
          setConfirm(true);
        }}
      >
        <Icon name="arrow-clockwise" className={cn(busy && "animate-spin")} />
        Regenerar OVA completo
      </Button>
      {confirm && (
        <ConfirmModal
          title="¿Regenerar el OVA completo?"
          message="La IA volverá a crear todos los recursos desde cero. La versión actual quedará guardada en el historial de versiones."
          confirmLabel="Regenerar OVA"
          danger={false}
          onConfirm={() => {
            setConfirm(false);
            onRegenAll();
          }}
          onCancel={() => {
            setConfirm(false);
          }}
        />
      )}
    </div>
  );
}
