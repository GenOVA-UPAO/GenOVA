import type { ConfigChange, HistoryEntry } from "../api/model-tools.api";

/** Resumen de una lista de cambios para un aviso: el primero y cuántos más. */
export function changesSummary(changes: readonly ConfigChange[]): string {
  if (changes.length === 0) return "";
  const [first] = changes;
  if (changes.length === 1) return first.text;
  const more = changes.length - 1;
  return `${first.text} y ${String(more)} ${more === 1 ? "cambio más" : "cambios más"}`;
}

/** De dónde salió el cambio, dicho para el admin. */
export function sourceLabel(entry: Pick<HistoryEntry, "source" | "detail">): string {
  switch (entry.source) {
    case "profile":
      return entry.detail ? `Aplicó el perfil «${entry.detail}»` : "Aplicó un perfil";
    case "restore":
      return "Restauró una versión anterior";
    case "undo":
      return "Deshizo un cambio";
    default:
      return "Guardó cambios";
  }
}

const TIME = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" });
const DATE = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });
const DATE_YEAR = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** «Hace un momento», «Hace 12 min», «Hoy, 14:05», «Ayer, 09:30», «3 sept., 18:20». */
export function whenLabel(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const minutes = Math.floor((now.getTime() - at.getTime()) / 60_000);
  if (minutes < 1) return "Hace un momento";
  if (minutes < 60) return `Hace ${String(minutes)} min`;
  const time = TIME.format(at);
  const days = Math.round((startOfDay(now) - startOfDay(at)) / 86_400_000);
  if (days === 0) return `Hoy, ${time}`;
  if (days === 1) return `Ayer, ${time}`;
  const date = at.getFullYear() === now.getFullYear() ? DATE.format(at) : DATE_YEAR.format(at);
  return `${date}, ${time}`;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
