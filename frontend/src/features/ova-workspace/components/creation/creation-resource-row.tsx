import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { Checkbox } from "@/core/components/ui/checkbox";
import { cn } from "@/core/lib/cn";
import { resourceIconName } from "@/core/lib/resource-icons";

import type { ResourceVM } from "../../lib/ova-job-view-model";
import { CreationStatusBadge } from "./creation-status-badge";
import { RowStateHint } from "./row-state-hint";

interface Props {
  resource: ResourceVM;
  selected: boolean;
  selectable: boolean;
  active: boolean;
  onToggle: () => void;
  onRetry: () => void;
  onPreview?: () => void;
  retryAllowed?: boolean;
}

export function CreationResourceRow({
  resource,
  selected,
  selectable,
  active,
  onToggle,
  onRetry,
  onPreview,
  retryAllowed,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const icon = <Icon name={resourceIconName(resource.label)} className="shrink-0" size="text-sm" />;
  return (
    <li className="px-3 py-2">
      <div className="flex items-center gap-2.5">
        {resource.status === "X" && selectable && (
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            aria-label={t("workspace:seleccionar_value", { p0: resource.label })}
          />
        )}
        <CreationStatusBadge resource={resource} />
        {resource.status === "check" && onPreview ? (
          <button
            type="button"
            onClick={onPreview}
            className={`flex-1 min-w-0 inline-flex items-center gap-1.5 text-left text-sm text-foreground hover:text-primary ${active ? "font-semibold text-primary" : ""}`}
          >
            {icon}
            <span className="line-clamp-2 break-words" title={resource.label}>
              {resource.label}
            </span>
          </button>
        ) : (
          <span className="flex-1 min-w-0 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            {icon}
            <span className="line-clamp-2 break-words" title={resource.label}>
              {resource.label}
            </span>
          </span>
        )}
        <RowStateHint status={resource.status} canPreview={Boolean(onPreview)} />
        {resource.status === "X" && (
          <Button variant="outline" size="sm" className="shrink-0" onClick={onRetry} disabled={retryAllowed === false}>
            {t("workspace:reintentar")} </Button>
        )}
      </div>
      {resource.status === "X" && (
        <p
          className={cn(
            "mt-1.5 text-xs text-destructive",
            selectable ? "pl-[3.75rem]" : "pl-[2.125rem]",
          )}
        >
          {t(resourceFailureKey(resource.error_code))} {resource.error_id && (
            <span className="block text-muted-foreground">
              {t("workspace:codigo_de_error")} <span className="font-mono">{resource.error_id}</span>
            </span>
          )}
        </p>
      )}
    </li>
  );
}

function resourceFailureKey(code?: string | null): string {
  if (code === "provider_auth") return "workspace:providerAuth";
  return code === "provider_auth_personal" ? "workspace:providerAuthPersonal" : "workspace:no_se_pudo_generar_este_recurso";
}
