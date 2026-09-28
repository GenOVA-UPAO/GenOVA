import { lazy, Suspense, useEffect } from "react";

import { useOvaCreation } from "../../hooks/use-ova-creation";
import { OvaCreateFormCard } from "./ova-create-form-card";

const loadPhaseSelect = () => import("../modals/phase-select-modal");
const loadTheme = () => import("../modals/ova-theme-modal");
const loadFiles = () => import("../modals/ova-files-modal");
const PhaseSelectModal = lazy(loadPhaseSelect);
const OvaThemeModal = lazy(loadTheme);
const OvaFilesModal = lazy(loadFiles);
const CrearOvaTour = lazy(() => import("./crear-ova-tour"));

/** Descarga los modales cuando la página ya se ha pintado: al abrirlos, están listos. */
function usePrefetchModals() {
  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPhaseSelect();
      void loadTheme();
      void loadFiles();
    }, 1500);
    return () => {
      clearTimeout(timer);
    };
  }, []);
}

export function OvaCreationView() {
  const creation = useOvaCreation();
  usePrefetchModals();
  return (
    <div className="flex min-h-full flex-col bg-background">
      <OvaCreateFormCard
        prompt={creation.prompt}
        onPrompt={creation.setPrompt}
        ready={creation.ready}
        phases={creation.phases}
        total={creation.total}
        theme={creation.theme}
        nivel={creation.nivel}
        onNivelChange={creation.setNivel}
        files={creation.uploads.data}
        onRemove={creation.uploads.removeUpload}
        onOpen={creation.openModal}
        onGenerate={creation.generate}
        onTour={creation.replayTour}
        error={creation.error}
      />
      {/* Sin texto de carga: el tutorial no ocupa sitio en la página y los
          modales se descargan en segundo plano al entrar (ver abajo). */}
      <Suspense fallback={null}>
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
    </div>
  );
}
