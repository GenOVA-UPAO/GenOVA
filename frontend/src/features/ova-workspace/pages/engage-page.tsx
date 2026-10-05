import { useTranslation } from "react-i18next";

import { PhasePage } from "../components/phase/phase-page";
export function EngagePage() {
  const { t } = useTranslation();
  return <PhasePage phase="engage" description={t("workspace:selecciona_un_tipo_de_recurso_escribe_el_conc_9e80a0")} />;
}
