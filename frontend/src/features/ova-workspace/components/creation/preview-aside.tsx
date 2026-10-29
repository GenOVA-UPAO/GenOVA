import { useTranslation } from "react-i18next";

import { Button } from "@/core/components/ui/button";

import type { useOvaJob } from "../../hooks/use-ova-job";
import CrearOvaPreviewPanel from "./crear-ova-preview-panel";

export function PreviewAside({
  jobId,
  resources,
  pinnedId,
  onPin,
}: Readonly<{
  jobId: string;
  resources: ReturnType<typeof useOvaJob>["resources"];
  pinnedId: string | null;
  onPin: (id: string | null) => void;
}>) {
  const { t } = useTranslation();
  return (
    <aside
      aria-label={t("workspace:vista_previa_de_los_recursos_listos")}
      className={`${pinnedId ? "mt-4 flex" : "hidden"} h-[70vh] min-h-96 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card lg:sticky lg:top-4 lg:mt-0 lg:flex`}
    >
      {pinnedId && (
        <div className="flex justify-end border-b border-border px-2 py-1 lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            className="max-sm:h-11"
            onClick={() => {
              onPin(null);
            }}
          >
            {t("workspace:cerrar_vista_previa")} </Button>
        </div>
      )}
      <CrearOvaPreviewPanel jobId={jobId} viewModel={resources} pinnedId={pinnedId} onPin={onPin} />
    </aside>
  );
}
