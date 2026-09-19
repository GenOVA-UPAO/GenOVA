import { lazy, Suspense } from "react";

import { useOvaCreation } from "../../hooks/use-ova-creation";
import { OvaCreateFormCard } from "./ova-create-form-card";

const PhaseSelectModal = lazy(() => import("../modals/phase-select-modal"));
const OvaThemeModal = lazy(() => import("../modals/ova-theme-modal"));
const OvaFilesModal = lazy(() => import("../modals/ova-files-modal"));
const CrearOvaTour = lazy(() => import("./crear-ova-tour"));

export function OvaCreationView() {
  const creation = useOvaCreation();
  return (
    <main className="flex min-h-full flex-col bg-background">
      <OvaCreateFormCard
        prompt={creation.prompt}
        onPrompt={creation.setPrompt}
        ready={creation.ready}
        phases={creation.phases}
        total={creation.total}
        theme={creation.theme}
        nivel={creation.nivel}
        onNivelChange={creation.setNivel}
        files={creation.uploads.data ?? []}
        onRemove={creation.uploads.removeUpload}
        onOpen={creation.openModal}
        onGenerate={creation.generate}
        onTour={creation.replayTour}
        error={creation.error}
      />
      <Suspense fallback={<p role="status">Cargando…</p>}>
        {!creation.modal && <CrearOvaTour replay={creation.replay} />}
        {creation.modal === "resources" && (
          <PhaseSelectModal
            picks={creation.picks}
            configs={creation.configs.data?.configs ?? {}}
            onConfirm={creation.confirmSelections}
            onClose={creation.closeModal}
          />
        )}
        {creation.modal === "theme" && (
          <OvaThemeModal
            theme={creation.theme}
            onChange={creation.setTheme}
            onClose={creation.closeModal}
          />
        )}
        {creation.modal === "files" && (
          <OvaFilesModal uploads={creation.uploads} onClose={creation.closeModal} />
        )}
      </Suspense>
    </main>
  );
}
