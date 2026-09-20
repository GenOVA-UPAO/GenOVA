import { Button } from "@/core/components/ui/button";

interface OvaCardActionsProps {
  isGenerating: boolean;
  isReady: boolean;
  isMoving?: boolean;
  isDownloading?: boolean;
  isDuplicating?: boolean;
  onEdit: () => void;
  onEditMetadata: () => void;
  onDuplicate: () => void;
  onDownload: () => void;
  onMoveToTrash: () => void;
}

interface ActionFlagsInput {
  isGenerating: boolean;
  isReady: boolean;
  isMoving?: boolean;
  isDownloading?: boolean;
  isDuplicating?: boolean;
}

function computeActionLabels(isMoving?: boolean, isDownloading?: boolean, isDuplicating?: boolean) {
  return {
    duplicateLabel: isDuplicating ? "Duplicando..." : "Duplicar",
    downloadLabel: isDownloading ? "Descargando..." : "Descargar",
    trashLabel: isMoving ? "Moviendo..." : "A papelera",
    trashAriaLabel: isMoving ? "Moviendo a papelera" : "Enviar a papelera",
  };
}

function computeDisabledFlags(input: ActionFlagsInput) {
  const isBusy = Boolean(input.isDownloading) || Boolean(input.isDuplicating);
  return {
    disabledGeneral: input.isGenerating || Boolean(input.isDuplicating),
    disabledDownload: !input.isReady || isBusy,
    disabledTrash: input.isGenerating || Boolean(input.isMoving) || Boolean(input.isDuplicating),
  };
}

/** Botones de acción principales de la tarjeta de OVA. */
export function OvaCardActions({
  isGenerating,
  isReady,
  isMoving,
  isDownloading,
  isDuplicating,
  onEdit,
  onEditMetadata,
  onDuplicate,
  onDownload,
  onMoveToTrash,
}: Readonly<OvaCardActionsProps>) {
  const disabled = computeDisabledFlags({ isGenerating, isReady, isMoving, isDownloading, isDuplicating });
  const labels = computeActionLabels(isMoving, isDownloading, isDuplicating);

  return (
    <>
      <div className="grid w-full grid-cols-2 gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="w-full min-w-0 truncate border-primary/30 text-primary hover:bg-primary/5"
          disabled={disabled.disabledGeneral}
          onClick={onEdit}
        >
          Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full min-w-0 truncate border-primary/30 text-primary hover:bg-primary/5"
          disabled={disabled.disabledGeneral}
          onClick={onEditMetadata}
        >
          Metadatos
        </Button>
      </div>

      <div className="grid w-full grid-cols-2 gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="w-full min-w-0 truncate"
          disabled={disabled.disabledGeneral}
          onClick={onDuplicate}
        >
          {labels.duplicateLabel}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full min-w-0 truncate"
          disabled={disabled.disabledDownload}
          onClick={onDownload}
        >
          {labels.downloadLabel}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="col-span-2 w-full min-w-0 truncate border-destructive/30 text-destructive hover:bg-destructive/5"
          disabled={disabled.disabledTrash}
          onClick={onMoveToTrash}
          aria-label={labels.trashAriaLabel}
        >
          {labels.trashLabel}
        </Button>
      </div>
    </>
  );
}
