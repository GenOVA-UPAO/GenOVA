import { useMutation } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { useLlmSettingsModal } from "@/core/lib/use-llm-settings-modal";

import { exportOvaScorm } from "../../api/ova-workspace.api";
import { WorkspacePreviewDownloadError } from "./workspace-preview-download-error";

const VersionHistoryPanel = lazy(() => import("../versioning/version-history-panel"));

interface Props {
  ovaId: string;
}

export function WorkspacePanelToolbar({ ovaId }: Readonly<Props>) {
  const [history, setHistory] = useState(false);
  const settings = useLlmSettingsModal();
  const download = useMutation({ mutationFn: () => exportOvaScorm(ovaId) });
  return (
    <div className="relative">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div
          className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5 dark:bg-input/30"
          role="group"
          aria-label="Acciones del OVA"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setHistory(true);
            }}
          >
            Historial de versiones
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Ajustes de modelo IA"
            title="Ajustes de modelo IA"
            onClick={() => {
              settings.open();
            }}
          >
            <Icon name="gear" />
          </Button>
        </div>
        <div className="relative">
          <Button
            loading={download.isPending}
            onClick={() => {
              download.mutate();
            }}
          >
            Descargar SCORM
          </Button>
          {download.error && <WorkspacePreviewDownloadError message={download.error.message} />}
        </div>
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
