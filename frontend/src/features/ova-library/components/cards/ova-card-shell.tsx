import type { ReactNode } from "react";

import { OvaStatusBadge } from "@/core/components/ova-status-badge";
import { Checkbox } from "@/core/components/ui/checkbox";
import { cn } from "@/core/lib/cn";

import type { OvaListItem } from "../../lib/types";
import { OvaCardMeta } from "./ova-card-meta";

interface OvaCardShellProps {
  ova: OvaListItem;
  isSelected?: boolean;
  checkboxDisabled?: boolean;
  dateLabel?: string;
  dateValue?: string;
  dateClassName?: string;
  rootClassName?: string;
  onToggleSelect?: (id: string) => void;
  extraBadges?: ReactNode;
  children?: ReactNode;
}

function formatDateText(label?: string, value?: string): string | null {
  if (!value) return null;
  return label ? `${label} ${value}` : value;
}

/** Contenedor base compartido para tarjetas de OVA en biblioteca y papelera. */
export function OvaCardShell({
  ova,
  isSelected = false,
  checkboxDisabled = false,
  dateLabel,
  dateValue,
  dateClassName = "text-muted-foreground",
  rootClassName,
  onToggleSelect,
  extraBadges,
  children,
}: Readonly<OvaCardShellProps>) {
  const owner = ova.owner as { full_name?: string } | undefined;
  const ownerName = owner?.full_name;
  const dateText = formatDateText(dateLabel, dateValue);
  const borderClass = isSelected ? "border-primary/50 ring-1 ring-primary/20" : "border-border";

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-xl border bg-card p-5 shadow-sm transition hover:shadow-md",
        borderClass,
        rootClassName,
      )}
    >
      <div className="flex flex-1 items-start gap-3">
        <Checkbox
          className="mt-0.5"
          checked={isSelected}
          onCheckedChange={() => {
            onToggleSelect?.(ova.id);
          }}
          disabled={checkboxDisabled}
          aria-label={`Seleccionar ${ova.title ?? "OVA"}`}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3
              className="line-clamp-2 text-sm font-semibold text-foreground"
              title={ova.title ?? ""}
            >
              {ova.title ?? "Sin título"}
            </h3>
            <OvaStatusBadge status={ova.status} />
            {extraBadges}
          </div>
          <OvaCardMeta
            description={ova.description}
            ownerName={ownerName}
            dateText={dateText}
            dateClassName={dateClassName}
          />
        </div>
      </div>
      {children && (
        <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-3">
          {children}
        </div>
      )}
    </div>
  );
}
