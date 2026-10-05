import i18n from "i18next";
import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { ExportMenu } from "@/core/export/components/export-menu";
import type { ExportFormatId } from "@/core/export/lib/formats";
import { useLastExportFormat } from "@/core/export/lib/use-last-export-format";

import { OvaCardPrimaryAction } from "./ova-card-primary-action";

interface OvaCardActionsProps {
  ovaId: string;
  isGenerating: boolean;
  isReady: boolean;
  isInterrupted?: boolean;
  isDownloading?: boolean;
  isDuplicating?: boolean;
  canEdit?: boolean;
  onDownload: (format: ExportFormatId) => void;
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
  canEdit,
  onDownload,
  onResume,
}: Readonly<OvaCardActionsProps>) {
  useTranslation();
  const [format, rememberFormat] = useLastExportFormat();
  const handleSelect = (next: ExportFormatId) => {
    rememberFormat(next);
    onDownload(next);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <OvaCardPrimaryAction
        ovaId={ovaId}
        isGenerating={isGenerating}
        isInterrupted={Boolean(isInterrupted)}
        canEdit={canEdit}
        className={ACTION_CLASS}
        onResume={onResume}
      />
      {isReady && (
        <ExportMenu selected={format} onSelect={handleSelect}>
          <Button
            variant="ghost"
            className={ACTION_CLASS}
            aria-label={i18n.t("ova-library:descargar_elegir_formato")}
            loading={isDownloading}
            disabled={isDuplicating}
          >
            {!isDownloading && <Icon name="download-simple" size="text-base" />}
            {isDownloading ? i18n.t("ova-library:descargando") : i18n.t("ova-library:descargar")}
            {!isDownloading && <Icon name="caret-down" size="text-xs" />}
          </Button>
        </ExportMenu>
      )}
    </div>
  );
}
