import { useNavigate } from "react-router";

import type { OvaJobInfo } from "../../lib/job-types";
import type { OvaListItem } from "../../lib/types";
import { OvaCardActions } from "./ova-card-actions";
import { OvaCardBadges } from "./ova-card-badges";
import { OvaCardShell } from "./ova-card-shell";
import { OvaGeneratingAction } from "./ova-generating-action";

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

function formatDate(date: unknown): string {
  if (!date) return "";
  return new Date(date as string).toLocaleDateString("es-PE");
}

/** Tarjeta interactiva de OVA en la biblioteca con acciones completas. */
export function OvaCard({
  ova,
  job,
  isSelected,
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
  const navigate = useNavigate();
  const isGenerating = ova.status === "generando";
  const isReady = ova.status === "listo";

  const extraBadges = (
    <OvaCardBadges
      versionNumber={ova.version_number}
      isGenerating={isGenerating}
      job={job}
    />
  );

  return (
    <OvaCardShell
      ova={ova}
      isSelected={isSelected}
      checkboxDisabled={isGenerating}
      dateValue={formatDate(ova.created_at)}
      onToggleSelect={onToggleSelect}
      extraBadges={extraBadges}
    >
      {isGenerating && (
        <OvaGeneratingAction
          ovaId={ova.id}
          isInterrupted={job?.isInterrupted}
          onResume={onResume}
        />
      )}

      <OvaCardActions
        isGenerating={isGenerating}
        isReady={isReady}
        isMoving={isMoving}
        isDownloading={isDownloading}
        isDuplicating={isDuplicating}
        onEdit={() => void navigate(`/workspace/${ova.id}`)}
        onEditMetadata={() => onEditMetadata?.(ova)}
        onDuplicate={() => onDuplicate?.(ova.id)}
        onDownload={() => onDownload?.({ id: ova.id, title: ova.title ?? "" })}
        onMoveToTrash={() => onMoveToTrash?.(ova)}
      />
    </OvaCardShell>
  );
}
