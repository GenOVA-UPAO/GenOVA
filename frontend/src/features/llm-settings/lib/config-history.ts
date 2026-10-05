import i18n, { t } from "i18next";

import type { ConfigChange, HistoryEntry } from "../api/model-tools.api";

/** Resumen de una lista de cambios para un aviso: el primero y cuántos más. */
export function changesSummary(changes: readonly ConfigChange[]): string {
  if (changes.length === 0) return "";
  const [first] = changes;
  if (changes.length === 1) return first.text;
  const more = changes.length - 1;
  return t("llm-settings:history.changesSummaryMore", {
    count: more,
    text: first.text,
  });
}

/** De dónde salió el cambio, dicho para el admin. */
export function sourceLabel(entry: Pick<HistoryEntry, "source" | "detail">): string {
  switch (entry.source) {
    case "profile":
      return entry.detail
        ? t("llm-settings:history.actions.appliedProfileDetail", { detail: entry.detail })
        : t("llm-settings:history.actions.appliedProfile");
    case "restore":
      return t("llm-settings:history.actions.restoredVersion");
    case "undo":
      return t("llm-settings:history.actions.undidChange");
    default:
      return t("llm-settings:history.actions.savedChanges");
  }
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** «Hace un momento», «Hace 12 min», «Hoy, 14:05», «Ayer, 09:30», «3 sept., 18:20». */
export function whenLabel(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const minutes = Math.floor((now.getTime() - at.getTime()) / 60_000);
  if (minutes < 1) return t("llm-settings:history.justNow");
  if (minutes < 60) return t("llm-settings:history.minutesAgo", { count: minutes });

  const locale = i18n.language === "en" ? "en" : "es";
  const timeFormatter = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });
  const time = timeFormatter.format(at);
  const days = Math.round((startOfDay(now) - startOfDay(at)) / 86_400_000);
  if (days === 0) return t("llm-settings:history.today", { time });
  if (days === 1) return t("llm-settings:history.yesterday", { time });

  const dateFormatter =
    at.getFullYear() === now.getFullYear()
      ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" })
      : new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });
  const date = dateFormatter.format(at);
  return `${date}, ${time}`;
}
