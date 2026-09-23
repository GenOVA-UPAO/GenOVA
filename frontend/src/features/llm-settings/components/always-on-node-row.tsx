import { Icon } from "@/core/components/icon";

import type { EngineNode } from "../hooks/nodes-config.types";
import { SettingRow } from "./setting-row";

interface AlwaysOnNodeRowProps {
  node: EngineNode;
  warning?: boolean;
}

export function AlwaysOnNodeRow({ node, warning = false }: Readonly<AlwaysOnNodeRowProps>) {
  return (
    <SettingRow
      title={
        <>
          {node.name}
          {warning ? (
            <span className="inline-flex items-center gap-1 font-normal text-accent-brand">
              <Icon name="warning" size="text-sm" /> Falta su clave API
            </span>
          ) : null}
        </>
      }
      description={node.description ?? "Nodo base del sistema."}
      control={<span className="text-sm text-muted-foreground">Siempre activo</span>}
    />
  );
}
