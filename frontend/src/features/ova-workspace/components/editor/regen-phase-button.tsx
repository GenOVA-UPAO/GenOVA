import { useState } from "react";

import { ConfirmModal } from "@/core/components/confirm-modal";
import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

interface Props {
  name: string;
  busy: boolean;
  onRegenerate: () => void;
}

/**
 * «Regenerar recurso» con confirmación, igual que «Regenerar OVA completo»:
 * llama al modelo (cuesta dinero) y bloquea la edición mientras dura.
 */
export function RegenPhaseButton({ name, busy, onRegenerate }: Readonly<Props>) {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={() => {
          setConfirm(true);
        }}
      >
        <Icon name="arrow-clockwise" />
        Regenerar recurso
      </Button>
      {confirm && (
        <ConfirmModal
          title="¿Regenerar este recurso?"
          message={`La IA volverá a crear «${name}» desde cero. La versión actual quedará guardada en el historial de versiones.`}
          confirmLabel="Regenerar recurso"
          danger={false}
          onConfirm={() => {
            setConfirm(false);
            onRegenerate();
          }}
          onCancel={() => {
            setConfirm(false);
          }}
        />
      )}
    </>
  );
}
