import { useTranslation } from "react-i18next";

import { EmptyState } from "@/core/components/empty-state";
import { QueryErrorState } from "@/core/components/query-error-state";

import type { HistoryEntry } from "../api/model-tools.api";
import type { useConfigHistory } from "../hooks/use-config-history";
import { HistoryEntryRow } from "./history-entry-row";
import { ModelsSheetSkeleton } from "./models-sheet-skeleton";

/** Lista del historial con sus estados: cargando, error, vacío. */
export function HistoryList({
  history,
  onRestore,
}: Readonly<{
  history: ReturnType<typeof useConfigHistory>;
  onRestore: (entry: HistoryEntry, undo: boolean) => void;
}>) {
  const { t } = useTranslation("llm-settings");
  if (history.loading) return <ModelsSheetSkeleton />;
  if (history.error) {
    return <QueryErrorState title={t("api.loadHistoryError")} onRetry={history.refetch} />;
  }
  if (history.entries.length === 0) {
    return (
      <EmptyState
        icon="clock-counter-clockwise"
        title={t("history.emptyTitle")}
        description={t("history.emptyDesc")}
        className="py-10"
      />
    );
  }
  return (
    <ol className="divide-y divide-border" aria-label={t("history.ariaList")}>
      {history.entries.map((entry, index) => (
        <HistoryEntryRow
          key={entry.id}
          entry={entry}
          latest={index === 0}
          onRestore={() => {
            onRestore(entry, index === 0);
          }}
        />
      ))}
    </ol>
  );
}
