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
          {/* Sin clave no es un fallo (sigue funcionando sin ella): se dice, sin alarma. */}
          {warning ? <span className="font-normal text-muted-foreground">Sin clave API</span> : null}
        </>
      }
      description={node.description ?? "Nodo base del sistema."}
      control={<span className="text-sm text-muted-foreground">Siempre activo</span>}
    />
  );
}
