import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import type { HistoryEntry } from "../api/model-tools.api";
import { sourceLabel, whenLabel } from "../lib/config-history";
import { ConfigChangeList } from "./config-change-list";

interface HistoryEntryRowProps {
  entry: HistoryEntry;
  /** El cambio más reciente: es la config actual, así que se ofrece deshacerlo. */
  latest: boolean;
  onRestore: () => void;
}

export function HistoryEntryRow({ entry, latest, onRestore }: Readonly<HistoryEntryRowProps>) {
  const { t, i18n } = useTranslation("llm-settings");
  const when = whenLabel(entry.at);
  return (
    <li className="space-y-2.5 py-4 first:pt-0" data-history-entry={entry.id}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{sourceLabel(entry)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <time dateTime={entry.at} title={new Date(entry.at).toLocaleString(i18n.language.startsWith("en") ? "en" : "es")}>
              {when}
            </time>
            {entry.actor?.name ? ` · ${entry.actor.name}` : null}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 max-sm:h-11"
          aria-label={
            latest
              ? t("history.undoLastChange")
              : t("history.restoreVersionOf", { date: when.toLowerCase() })
          }
          onClick={onRestore}
        >
          <Icon name="arrow-counter-clockwise" size="text-sm" />
          {latest ? t("history.undoAction") : t("history.restoreAction")}
        </Button>
      </div>
      <ConfigChangeList changes={entry.changes} />
    </li>
  );
}
