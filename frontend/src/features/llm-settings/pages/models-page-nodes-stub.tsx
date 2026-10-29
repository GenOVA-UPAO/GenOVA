import { useTranslation } from "react-i18next";

export function PlatformNodesCard() {
  const { t } = useTranslation("llm-settings");
  return <div data-testid="platform-nodes">{t("nodes.title")}</div>;
}

