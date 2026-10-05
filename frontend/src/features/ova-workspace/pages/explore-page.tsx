import { useTranslation } from "react-i18next";

import { PhasePage } from "../components/phase/phase-page";
export function ExplorePage() {
  const { t } = useTranslation();
  return (
    <PhasePage
      phase="explore"
      description={t("workspace:interactua_con_simuladores_y_laboratorios_par_5c512b")}
    />
  );
}
