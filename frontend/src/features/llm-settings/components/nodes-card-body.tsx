import type { EngineNode } from "../hooks/nodes-config.types";
import type { useNodesConfig } from "../hooks/use-nodes-config";
import { criticRoundsVisible } from "../lib/nodes-config-draft";
import { AlwaysOnNodeRow } from "./always-on-node-row";
import { ConfigurableNodeRow } from "./configurable-node-row";
import { EngineNodeGroup } from "./engine-node-group";

interface NodesCardBodyProps {
  loading: boolean;
  error: string;
  ready: boolean;
  configurable: EngineNode[];
  alwaysOn: EngineNode[];
  videoNode: EngineNode | undefined;
  videoWarning: boolean;
  nodes: ReturnType<typeof useNodesConfig>;
}

export function NodesCardBody({
  loading,
  error,
  ready,
  configurable,
  alwaysOn,
  videoNode,
  videoWarning,
  nodes,
}: Readonly<NodesCardBodyProps>) {
  if (loading || !ready) {
    return (
      <div className="space-y-3">
        <div className="h-16 animate-pulse rounded-2xl bg-muted" />
        <div className="h-16 animate-pulse rounded-2xl bg-muted" />
        <div className="h-16 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }
  if (error) {
    return (
      <p className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm font-bold text-destructive">
        {error}
      </p>
    );
  }
  return (
    <div className="space-y-6">
      <EngineNodeGroup title={`Configurables (${String(configurable.length)})`}>
        {configurable.map((node) => (
          <ConfigurableNodeRow
            key={node.id}
            node={node}
            active={nodes.draft?.[node.flag] === "1"}
            showParam={criticRoundsVisible(nodes.draft)}
            rounds={nodes.rounds}
            saving={nodes.saving}
            onToggle={() => {
              nodes.toggleFlag(node.flag);
            }}
            onRounds={nodes.setRounds}
          />
        ))}
      </EngineNodeGroup>
      <EngineNodeGroup title={`Siempre activos (${String(alwaysOn.length + (videoNode ? 1 : 0))})`}>
        {alwaysOn.map((node) => (
          <AlwaysOnNodeRow key={node.id} node={node} />
        ))}
        {videoNode ? <AlwaysOnNodeRow node={videoNode} warning={videoWarning} /> : null}
      </EngineNodeGroup>
    </div>
  );
}
