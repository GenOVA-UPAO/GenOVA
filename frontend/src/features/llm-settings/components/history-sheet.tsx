import { useState } from "react";
import { toast } from "sonner";

import { ConfirmModal } from "@/core/components/confirm-modal";

import type { HistoryEntry } from "../api/model-tools.api";
import { errorMessage } from "../hooks/error-message";
import { useConfigApply } from "../hooks/use-config-apply";
import { useConfigHistory } from "../hooks/use-config-history";
import { whenLabel } from "../lib/config-history";
import { HistoryList } from "./history-list";
import { ModelsSideSheet } from "./models-side-sheet";

interface HistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dirty: boolean;
  onDiscardDraft: () => void;
}

interface PendingRestore {
  entry: HistoryEntry;
  /** El último cambio se deshace (`before`); uno anterior se restaura tal como quedó (`after`). */
  undo: boolean;
}

/** Historial de cambios de la config de modelos, con «Deshacer» y «Restaurar». */
export function HistorySheet({
  open,
  onOpenChange,
  dirty,
  onDiscardDraft,
}: Readonly<HistorySheetProps>) {
  const history = useConfigHistory(open);
  const feedback = useConfigApply();
  const [pending, setPending] = useState<PendingRestore | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async ({ entry, undo }: PendingRestore) => {
    setBusy(true);
    try {
      if (undo) {
        await feedback.undo(entry.id);
      } else {
        const res = await history.restore.mutateAsync(entry.id);
        await feedback.refresh();
        feedback.announce("Configuración restaurada.", res);
      }
      onDiscardDraft();
      setPending(null);
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(errorMessage(err, "No se pudo restaurar la configuración."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ModelsSideSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Historial de cambios"
        description={`Cada vez que se guarda la configuración de modelos queda aquí. Se conservan los ${String(history.limit)} últimos cambios.`}
      >
        <HistoryList
          history={history}
          onRestore={(entry, undo) => {
            setPending({ entry, undo });
          }}
        />
      </ModelsSideSheet>
      <ConfirmModal
        open={pending !== null}
        danger={false}
        title={pending?.undo ? "¿Deshacer el último cambio?" : "¿Restaurar esta versión?"}
        message={restoreMessage(pending, dirty)}
        confirmLabel={pending?.undo ? "Deshacer cambio" : "Restaurar versión"}
        loadingLabel="Restaurando…"
        isLoading={busy}
        onConfirm={() => {
          if (pending) void confirm(pending);
        }}
        onCancel={() => {
          setPending(null);
        }}
      />
    </>
  );
}

function restoreMessage(pending: PendingRestore | null, dirty: boolean): string {
  if (!pending) return "";
  const base = pending.undo
    ? "La configuración vuelve a como estaba antes de ese cambio."
    : `La configuración vuelve a como quedó ${whenLabel(pending.entry.at).toLowerCase()}.`;
  const tail = " El cambio queda en el historial: podrás volver a la actual.";
  return base + tail + (dirty ? "\nSe descartarán tus cambios sin guardar." : "");
}
