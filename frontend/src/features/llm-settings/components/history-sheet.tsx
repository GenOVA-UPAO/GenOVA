import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("llm-settings");
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
        feedback.announce(t("history.restored"), res);
      }
      onDiscardDraft();
      setPending(null);
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(errorMessage(err, t("api.restoreConfigError")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ModelsSideSheet
        open={open}
        onOpenChange={onOpenChange}
        title={t("history.title")}
        description={t("history.retentionDesc", { count: history.limit })}
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
        title={pending?.undo ? t("history.undoLastConfirmTitle") : t("history.restoreVersionConfirmTitle")}
        message={restoreMessage(pending, dirty, t)}
        confirmLabel={pending?.undo ? t("history.undoActionConfirm") : t("history.restoreActionConfirm")}
        loadingLabel={t("history.restoring")}
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

function restoreMessage(
  pending: PendingRestore | null,
  dirty: boolean,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (!pending) return "";
  const base = pending.undo
    ? t("history.undoLastConfirmDesc")
    : t("history.restoreVersionConfirmDesc", {
        time: whenLabel(pending.entry.at).toLowerCase(),
      });
  const tail = ` ${t("history.changeWillBeRecorded")}`;
  return base + tail + (dirty ? `\n${t("profiles.applyDiscardWarning")}` : "");
}
