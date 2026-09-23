import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { OvaCardPrimaryAction } from "./ova-card-primary-action";

interface OvaCardActionsProps {
  ovaId: string;
  isGenerating: boolean;
  isReady: boolean;
  isInterrupted?: boolean;
  isDownloading?: boolean;
  isDuplicating?: boolean;
  onDownload: () => void;
  onResume?: (id: string) => void;
}

const ACTION_CLASS = "max-sm:h-11";

/** Acciones visibles de la tarjeta: la principal y, si el OVA está listo, «Descargar». */
export function OvaCardActions({
  ovaId,
  isGenerating,
  isReady,
  isInterrupted,
  isDownloading,
  isDuplicating,
  onDownload,
  onResume,
}: Readonly<OvaCardActionsProps>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <OvaCardPrimaryAction
        ovaId={ovaId}
        isGenerating={isGenerating}
        isInterrupted={Boolean(isInterrupted)}
        className={ACTION_CLASS}
        onResume={onResume}
      />
      {isReady && (
        <Button
          variant="ghost"
          className={ACTION_CLASS}
          title="Descargar el paquete SCORM (.zip)"
          loading={isDownloading}
          disabled={isDuplicating}
          onClick={onDownload}
        >
          {!isDownloading && <Icon name="download-simple" size="text-base" />}
          {isDownloading ? "Descargando..." : "Descargar"}
        </Button>
      )}
    </div>
  );
}
