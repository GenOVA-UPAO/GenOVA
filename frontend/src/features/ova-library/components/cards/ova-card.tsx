import { useCurrentUser } from "@/core/auth/auth-store";
import { Checkbox } from "@/core/components/ui/checkbox";
import { cn } from "@/core/lib/cn";

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
  onDownload?: (data: { id: string; title: string }) => void;
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
  const isGenerating = ova.status === "generando";
  const title = ova.title?.trim() ? ova.title : "Sin título";
  const description = meaningfulDescription(ova);
  const canEdit = isOwnOva(ova, useCurrentUser()?.id);

  return (
    <div
      data-testid="ova-card"
      data-ova-id={ova.id}
      className={cn(
        "flex h-full flex-col rounded-xl border bg-card p-4 transition-colors",
        isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-foreground/20",
        isMoving && "opacity-60",
      )}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={isSelected}
          disabled={isGenerating}
          onCheckedChange={() => onToggleSelect?.(ova.id)}
          aria-label={`Seleccionar ${title}`}
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
        <OvaCardMeta ownerName={ownerNameOf(ova)} activity={lastActivity(ova)} />
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
          onDownload={() => onDownload?.({ id: ova.id, title: ova.title ?? "" })}
          onResume={onResume}
        />
      </div>
    </div>
  );
}
