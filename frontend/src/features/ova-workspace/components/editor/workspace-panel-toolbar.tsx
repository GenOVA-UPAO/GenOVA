import { useMutation } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import { cn } from "@/core/lib/cn";
import { useLlmSettingsModal } from "@/core/lib/use-llm-settings-modal";

import { exportOvaScorm } from "../../api/ova-workspace.api";
import { WorkspacePreviewDownloadError } from "./workspace-preview-download-error";

const VersionHistoryPanel = lazy(() => import("../versioning/version-history-panel"));

interface Props {
  ovaId: string;
  className?: string;
}

/**
 * Acciones del OVA en la cabecera del workspace. En escritorio las secundarias
 * van a la vista; en móvil se recogen en «Más acciones» y la principal
 * («Descargar SCORM») sigue siempre visible.
 */
export function WorkspacePanelToolbar({ ovaId, className }: Readonly<Props>) {
  const [history, setHistory] = useState(false);
  const settings = useLlmSettingsModal();
  const download = useMutation({ mutationFn: () => exportOvaScorm(ovaId) });
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
        <Button variant="ghost" size="icon-sm" aria-label="Ajustes de modelo IA" title="Ajustes de modelo IA" onClick={openSettings}>
          <Icon name="gear" />
        </Button>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Más acciones" className="md:hidden">
            <Icon name="dots-three-vertical" weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem onSelect={openHistory}>
            <Icon name="clock-counter-clockwise" /> Historial de versiones
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openSettings}>
            <Icon name="gear" /> Ajustes de modelo IA
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="relative">
        <Button
          aria-label="Descargar SCORM"
          loading={download.isPending}
          onClick={() => {
            download.mutate();
          }}
        >
          <Icon name="download-simple" />
          <span className="md:hidden">SCORM</span>
          <span className="hidden md:inline">Descargar SCORM</span>
        </Button>
        {download.error && <WorkspacePreviewDownloadError message={download.error.message} />}
      </div>
      {history && (
        <Suspense>
          <VersionHistoryPanel
            ovaId={ovaId}
            onClose={() => {
              setHistory(false);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
