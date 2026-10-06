import { useTranslation } from "react-i18next";

import { PhasePage } from "../components/phase/phase-page";
export function EngagePage() {
  const { t } = useTranslation();
  return <PhasePage phase="engage" description={t("workspace:engageDescription")} />;
}
