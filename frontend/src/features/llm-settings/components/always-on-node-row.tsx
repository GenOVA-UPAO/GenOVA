import { useTranslation } from "react-i18next";

import type { EngineNode } from "../hooks/nodes-config.types";
import { SettingRow } from "./setting-row";

interface AlwaysOnNodeRowProps {
  node: EngineNode;
}

/**
 * Nodo que no se puede pausar. El generador de video ya no pasa por aquí: su
 * estado real (tarea Video de Modelos) lo pinta `CapabilityRow`.
 */
export function AlwaysOnNodeRow({ node }: Readonly<AlwaysOnNodeRowProps>) {
  const { t } = useTranslation("llm-settings");

  return (
    <SettingRow
      title={node.name}
      description={node.description ?? t("nodes.baseNodeDesc")}
      control={<span className="text-sm text-muted-foreground">{t("nodes.alwaysActiveSingle")}</span>}
    />
  );
}

