import { useTranslation } from "react-i18next";

import { useCurrentUser } from "@/core/auth/auth-store";
import { Checkbox } from "@/core/components/ui/checkbox";
import type { ExportFormatId } from "@/core/export/lib/formats";
import { cn } from "@/core/lib/cn";
import { licenseLabel } from "@/core/lib/educational-metadata";

import type { OvaJobInfo } from "../../lib/job-types";
import {
  isOwnOva,
  lastActivity,
  meaningfulDescription,
  ownerNameOf,
  visibleVersion,
} from "../../lib/ova-card-format";
import type { OvaListItem } from "../../lib/types";
import { OvaCardActions } from "./ova-card-actions";
import { OvaCardBadges } from "./ova-card-badges";
import { OvaCardMenu } from "./ova-card-menu";
import { OvaCardMeta } from "./ova-card-meta";
import { OvaCardTitle } from "./ova-card-title";

interface OvaCardProps {
  ova: OvaListItem;
  job?: OvaJobInfo;
  isSelected?: boolean;
  isMoving?: boolean;
  isDownloading?: boolean;
  isDuplicating?: boolean;
  onToggleSelect?: (id: string) => void;
  onMoveToTrash?: (ova: OvaListItem) => void;
  onDownload?: (data: { id: string; format: ExportFormatId }) => void;
  onDuplicate?: (id: string) => void;
  onEditMetadata?: (ova: OvaListItem) => void;
  onResume?: (id: string) => void;
}

/** Tarjeta de un OVA en la biblioteca: estado, título, autor/fecha y acciones. */
export function OvaCard({
  ova,
  job,
  isSelected = false,
  isMoving,
  isDownloading,
  isDuplicating,
  onToggleSelect,
  onMoveToTrash,
  onDownload,
  onDuplicate,
  onEditMetadata,
  onResume,
}: Readonly<OvaCardProps>) {
  const { t } = useTranslation();
  const isGenerating = ova.status === "generando";
  const title = ova.title?.trim() ? ova.title : t("ova-library:sin_titulo");
  const description = meaningfulDescription(ova);
  const canEdit = isOwnOva(ova, useCurrentUser()?.id);

  return (
    <div
      data-testid="ova-card"
      data-ova-id={ova.id}
      className={cn(
        "flex h-full flex-col rounded-xl border bg-card p-4 transition-[border-color,box-shadow] duration-200 hover:shadow-sm",
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:border-foreground/20",
        isMoving && "opacity-60",
      )}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={isSelected}
          disabled={isGenerating}
          onCheckedChange={() => onToggleSelect?.(ova.id)}
          aria-label={t("ova-library:seleccionar_value", { p0: title })}
        />
        <div className="min-w-0 flex-1">
          <OvaCardBadges status={ova.status} version={visibleVersion(ova)} job={job} />
        </div>
        <OvaCardMenu
          title={title}
          isGenerating={isGenerating}
          isMoving={isMoving}
          isDuplicating={isDuplicating}
          canEdit={canEdit}
          onEditMetadata={() => onEditMetadata?.(ova)}
          onDuplicate={() => onDuplicate?.(ova.id)}
          onMoveToTrash={() => onMoveToTrash?.(ova)}
        />
      </div>

      <div className="mt-2 flex-1 space-y-1.5">
        <OvaCardTitle ovaId={ova.id} title={title} />
        {description && (
          <p className="line-clamp-2 text-sm text-muted-foreground" title={description}>
            {description}
          </p>
        )}
        <OvaCardMeta ownerName={ownerNameOf(ova)} activity={lastActivity(ova, undefined, t)} />
        {ova.license && <p className="text-xs text-muted-foreground">{t("metadata:licenseSummary", { license: licenseLabel(ova.license, t) })}</p>}
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <OvaCardActions
          ovaId={ova.id}
          isGenerating={isGenerating}
          isReady={ova.status === "listo"}
          isInterrupted={job?.isInterrupted}
          isDownloading={isDownloading}
          isDuplicating={isDuplicating}
          canEdit={canEdit}
          onDownload={(format) => onDownload?.({ id: ova.id, format })}
          onResume={onResume}
        />
      </div>
    </div>
  );
}
