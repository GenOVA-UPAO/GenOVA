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
  if (history.loading) return <ModelsSheetSkeleton />;
  if (history.error) {
    return <QueryErrorState title="No se pudo cargar el historial." onRetry={history.refetch} />;
  }
  if (history.entries.length === 0) {
    return (
      <EmptyState
        icon="clock-counter-clockwise"
        title="Todavía no hay cambios"
        description="Cuando guardes la configuración de modelos verás aquí quién la cambió, cuándo y qué modelos cambiaron."
        className="py-10"
      />
    );
  }
  return (
    <ol className="divide-y divide-border" aria-label="Cambios, del más reciente al más antiguo">
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
