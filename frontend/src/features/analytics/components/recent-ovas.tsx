import { useTranslation } from "react-i18next";

import { OvaStatusBadge } from "@/core/components/ova-status-badge";

import type { RecentOva } from "../lib/types";
import { AnalyticsPanel } from "./analytics-panel";

interface RecentOvasProps {
  ovas: RecentOva[];
  className?: string;
}

function formatDate(iso?: string, lng = "es"): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const locale = lng === "en" ? "en-US" : "es-PE";
  return date.toLocaleDateString(locale, { day: "numeric", month: "short" }).replace(".", "");
}

export function RecentOvas({ ovas, className }: Readonly<RecentOvasProps>) {
  const { t, i18n } = useTranslation("analytics");
  return (
    <AnalyticsPanel title={t("recent.title")} className={className}>
      {ovas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("recent.empty")}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {ovas.map((o) => {
            const title = o.title && o.title.length > 0 ? o.title : t("recent.untitled");
            return (
              <li key={o.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={title}>
                    {title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{o.owner_name}</p>
                </div>
                <OvaStatusBadge status={o.status} className="shrink-0" />
                <time
                  dateTime={o.created_at}
                  className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums"
                >
                  {formatDate(o.created_at, i18n.language)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </AnalyticsPanel>
  );
}
