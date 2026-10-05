import { useTranslation } from "react-i18next";

import type { EngineNode } from "../hooks/nodes-config.types";
import { FlagSwitch } from "./flag-switch";

interface CapabilityControlProps {
  cap: EngineNode;
  active: boolean;
  saving: boolean;
  onToggle: () => void;
}

export function CapabilityControl({
  cap,
  active,
  saving,
  onToggle,
}: Readonly<CapabilityControlProps>) {
  const { t } = useTranslation("llm-settings");

  if (cap.always_on) return <span className="text-sm text-muted-foreground">{t("nodes.alwaysActiveSingle")}</span>;
  return (
    <>
      <span className="text-sm text-muted-foreground" aria-hidden="true">
        {active ? t("nodes.activeStatus") : t("nodes.pausedStatus")}
      </span>
      <FlagSwitch checked={active} disabled={saving} label={cap.name} onToggle={onToggle} />
    </>
  );
}

