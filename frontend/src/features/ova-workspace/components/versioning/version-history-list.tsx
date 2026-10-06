import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { formatDateTime } from "@/core/i18n/format";

import type { OvaVersionRow } from "../../lib/ova-versioning";

interface Props {
  versions: OvaVersionRow[];
  selected: string[];
  onToggle: (id: string, checked: boolean) => void;
  /** Sin él no se ofrece «Restaurar» (solo lectura). */
  onRestore?: (id: string) => void;
}

/** Versiones del OVA, de la más reciente a la más antigua, en un único contenedor. */
export function VersionHistoryList({ versions, selected, onToggle, onRestore }: Readonly<Props>) {
  const { t } = useTranslation("workspace-versioning");
  if (versions.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {t("list.empty")}
      </p>
    );
  }
  return (
    <>
    <ul className="divide-y divide-border rounded-xl border border-border">
      {versions.map((version) => {
        const inputId = `version-compare-${version.id}`;
        const date = version.created_at ? formatDateTime(version.created_at) : "";
        return (
          <li key={version.id} className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
            <input
              id={inputId}
              type="checkbox"
              className="size-4 shrink-0 accent-primary"
              aria-label={t("list.selectLabel", { number: version.version_number })}
              checked={selected.includes(version.id)}
              disabled={selected.length === 2 && !selected.includes(version.id)}
              onChange={(event) => {
                onToggle(version.id, event.target.checked);
              }}
            />
            <label htmlFor={inputId} className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 text-sm">
              <span className="font-medium">{t("list.version", { number: version.version_number })}</span>
              {date && <span className="text-xs text-muted-foreground">{date}</span>}
            </label>
            {version.is_active && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success-strong">
                <Icon name="check" size="text-xs" />
                {t("list.current")}
              </span>
            )}
            {!version.is_active && onRestore && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onRestore(version.id);
                }}
              >
                {t("list.restore")}
              </Button>
            )}
          </li>
        );
      })}
    </ul>
    {versions.length === 1 && (
      <p className="text-sm text-pretty text-muted-foreground">
        {t("list.onlyOne")}
      </p>
    )}
    </>
  );
}
