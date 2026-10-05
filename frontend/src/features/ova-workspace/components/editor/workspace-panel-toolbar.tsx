import { useMutation } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import { toast } from "sonner";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import { Tooltip } from "@/core/components/ui/tooltip";
import { exportOva } from "@/core/export/api/ova-export.api";
import type { ExportFormatId } from "@/core/export/lib/formats";
import { useLastExportFormat } from "@/core/export/lib/use-last-export-format";
import { cn } from "@/core/lib/cn";
import { useLlmSettingsModal } from "@/core/lib/use-llm-settings-modal";

import { ExportButton } from "./export-button";

const VersionHistoryPanel = lazy(() => import("../versioning/version-history-panel"));

interface Props {
  ovaId: string;
  /** Sin «Restaurar» en el historial: el OVA es de otra persona. */
  readOnly?: boolean;
  /** Falso mientras el OVA no está «listo»: el servidor respondería 409. */
  canExport?: boolean;
  className?: string;
}

/**
 * Acciones del OVA en la cabecera del workspace. En escritorio las secundarias
 * van a la vista; en móvil se recogen en «Más acciones» y la principal
 * (botón de descarga) sigue siempre visible.
 */
export function WorkspacePanelToolbar({
  ovaId,
  readOnly = false,
  canExport = true,
  className,
}: Readonly<Props>) {
  const [history, setHistory] = useState(false);
  const settings = useLlmSettingsModal();
  const download = useExportDownload(ovaId);
  const [lastFormat, rememberFormat] = useLastExportFormat();
  const openHistory = () => {
    setHistory(true);
  };
  const openSettings = () => {
    settings.open();
  };
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="hidden items-center gap-1 md:flex">
        <Button variant="ghost" size="sm" onClick={openHistory}>
          <Icon name="clock-counter-clockwise" />
          Historial de versiones
        </Button>
        <Tooltip label="Configuración de IA" side="bottom">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Configuración de IA"
            onClick={openSettings}
          >
            <Icon name="gear" />
          </Button>
        </Tooltip>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Más acciones"
            className="max-md:size-11 md:hidden"
          >
            <Icon name="dots-three-vertical" weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem onSelect={openHistory}>
            <Icon name="clock-counter-clockwise" /> Historial de versiones
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openSettings}>
            <Icon name="gear" /> Configuración de IA
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ExportButton
        canExport={canExport}
        pending={download.isPending}
        format={lastFormat}
        onDownload={(format) => {
          rememberFormat(format);
          download.mutate(format);
        }}
      />
      {history && (
        <Suspense>
          <VersionHistoryPanel
            ovaId={ovaId}
            readOnly={readOnly}
            onClose={() => {
              setHistory(false);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

/**
 * Descarga del paquete en el formato elegido. El resultado se avisa con un toast, igual que en
 * Mis OVAs: el globo fijo bajo el botón tapaba la barra del visor y no se
 * podía cerrar.
 */
function useExportDownload(ovaId: string) {
  const download = useMutation({
    mutationFn: (format: ExportFormatId) => exportOva(ovaId, format),
    onSuccess: () => {
      toast.success("Descarga iniciada");
    },
    onError: (error, format) => {
      toast.error("No se pudo descargar el paquete", {
        description: error.message,
        action: {
          label: "Reintentar",
          onClick: () => {
            download.mutate(format);
          },
        },
      });
    },
  });
  return download;
}
