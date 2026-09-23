import { useNodesConfig } from "../hooks/use-nodes-config";
import { hasUnsavedChanges } from "../lib/nodes-config-draft";
import { NodesCardBody } from "./nodes-card-body";
import { PlatformSection } from "./platform-section";
import { SaveCardButton } from "./save-card-button";

export function PlatformNodesCard() {
  const nodes = useNodesConfig();
  const list = nodes.data.nodes ?? [];
  const configurable = list.filter((item) => item.configurable);
  const alwaysOn = list.filter((item) => item.always_on && item.id !== "video");
  const videoNode = list.find((item) => item.id === "video");
  const videoWarning = !nodes.data.video_api_key_configured;
  const hasChanges = hasUnsavedChanges(nodes.draft, nodes.data.config, nodes.rounds);

  return (
    <PlatformSection
      testId="platform-nodes"
      title="Nodos del orquestador"
      description="Activa o pausa los agentes que intervienen al generar un OVA. Los cambios tardan unos 30 segundos en aplicarse."
      action={
        <SaveCardButton
          disabled={!hasChanges}
          saving={nodes.saving}
          onClick={() => {
            if (!nodes.draft) return;
            void nodes.save(
              { ...nodes.draft, ova_reflection_rounds: String(nodes.rounds) },
              "Configuración de nodos guardada.",
            );
          }}
        />
      }
    >
      <NodesCardBody
        loading={nodes.loading}
        error={nodes.error}
        ready={Boolean(nodes.draft)}
        configurable={configurable}
        alwaysOn={alwaysOn}
        videoNode={videoNode}
        videoWarning={videoWarning}
        nodes={nodes}
      />
    </PlatformSection>
  );
}
