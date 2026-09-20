import { useMutation } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { useLlmSettingsModal } from "@/core/lib/use-llm-settings-modal";

import { exportOvaScorm } from "../../api/ova-workspace.api";

const VersionHistoryPanel = lazy(() => import("../versioning/version-history-panel"));

interface Props {
  ovaId: string;
}

export function WorkspacePanelToolbar({ ovaId }: Readonly<Props>) {
  const [history, setHistory] = useState(false);
  const settings = useLlmSettingsModal();
  const download = useMutation({ mutationFn: () => exportOvaScorm(ovaId) });
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        onClick={() => {
          setHistory(true);
        }}
      >
        Historial de versiones
      </Button>
      <Button
        variant="outline"
        aria-label="Ajustes de modelo IA"
        title="Ajustes de modelo IA"
        onClick={() => {
          settings.open();
        }}
      >
        <Icon name="gear" />
      </Button>
      <Button
        disabled={download.isPending}
        onClick={() => {
          download.mutate();
        }}
      >
        Descargar SCORM
      </Button>
      {download.error && <p role="alert">{download.error.message}</p>}
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
