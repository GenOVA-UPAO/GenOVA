import i18n from "i18next";

/** Locale BCP-47 del idioma activo (para `Intl`). */
export function currentLocale(): string {
  return i18n.language || "es";
}

type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(currentLocale(), options).format(date);
}

export function formatDateTime(value: DateInput): string {
  return formatDate(value, { dateStyle: "medium", timeStyle: "short" });
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(currentLocale(), options).format(value);
}

export function formatPercent(fraction: number, maximumFractionDigits = 0): string {
  return formatNumber(fraction, { style: "percent", maximumFractionDigits });
}

const RELATIVE_UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["day", 86_400],
  ["hour", 3600],
  ["minute", 60],
];

/** "hace 3 días" / "3 days ago", respecto a `now`. */
export function formatRelativeTime(value: DateInput, now: number = Date.now()): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.round((date.getTime() - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat(currentLocale(), { numeric: "auto" });
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return formatter.format(seconds, "second");
}
