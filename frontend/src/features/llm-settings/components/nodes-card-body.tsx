import type { EngineNode } from "../hooks/nodes-config.types";
import type { useNodesConfig } from "../hooks/use-nodes-config";
import { criticRoundsVisible } from "../lib/nodes-config-draft";
import { AlwaysOnNodeRow } from "./always-on-node-row";
import { ConfigurableNodeRow } from "./configurable-node-row";
import { EngineNodeGroup } from "./engine-node-group";
import { SectionError } from "./section-error";
import { SettingListSkeleton } from "./setting-list-skeleton";

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
    return <SettingListSkeleton rows={3} />;
  }
  if (error) {
    return <SectionError message={error} />;
  }
  return (
    <div className="space-y-6">
      <EngineNodeGroup title="Se pueden pausar">
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
      <EngineNodeGroup title="Siempre activos">
        {alwaysOn.map((node) => (
          <AlwaysOnNodeRow key={node.id} node={node} />
        ))}
        {videoNode ? <AlwaysOnNodeRow node={videoNode} warning={videoWarning} /> : null}
      </EngineNodeGroup>
    </div>
  );
}
