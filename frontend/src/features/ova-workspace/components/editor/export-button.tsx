import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { ExportMenu } from "@/core/export/components/export-menu";
import { type ExportFormatId, getExportFormat } from "@/core/export/lib/formats";

interface ExportButtonProps {
  canExport: boolean;
  pending: boolean;
  /** Formato de la acción principal (el último elegido). */
  format: ExportFormatId;
  onDownload: (format: ExportFormatId) => void;
}

/**
 * Botón dividido: el clic principal descarga el formato habitual y el menú ofrece
 * todos. Desactivado con una pista mientras el servidor diría 409.
 */
export function ExportButton({ canExport, pending, format, onDownload }: Readonly<ExportButtonProps>) {
  const { t } = useTranslation();
  const { label } = getExportFormat(format);
  return (
    <div className="inline-flex">
      <Button
        aria-label={t("workspace:descargar_value", { p0: label })}
        loading={pending}
        disabled={!canExport}
        title={
          canExport ? undefined : t("workspace:exportUnavailableHint")
        }
        className="rounded-r-none max-md:h-11 max-md:px-4"
        onClick={() => {
          onDownload(format);
        }}
      >
        <Icon name="download-simple" />
        <span className="md:hidden">{label}</span>
        <span className="hidden md:inline">{t("workspace:descargar")} {label}</span>
      </Button>
      <ExportMenu selected={format} onSelect={onDownload}>
        <Button
          aria-label={t("workspace:elegir_formato_de_descarga")}
          disabled={!canExport || pending}
          className="rounded-l-none border-l-primary-foreground/30 px-2 max-md:h-11 max-md:px-3"
        >
          <Icon name="caret-down" />
        </Button>
      </ExportMenu>
    </div>
  );
}
